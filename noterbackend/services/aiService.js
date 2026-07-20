const { GoogleGenAI } = require('@google/genai');
const { PrismaClient } = require('@prisma/client');
const allInOnePrompt = require('../prompts/allInOne');
const { processAndSaveNotes } = require('./notesEngine');

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Robust call to Gemini API with model fallback and exponential retry logic.
 */
async function callGemini(contents, systemInstruction, responseSchema = null) {
  const modelsToTry = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const config = { systemInstruction };
      if (responseSchema) {
        config.responseMimeType = 'application/json';
        config.responseSchema = responseSchema;
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini AI] Attempt with model '${modelName}' failed (${err.message.slice(0, 100)}). Trying next fallback...`);
      // Short delay before retry
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  throw lastError || new Error("All Gemini AI attempts failed.");
}

/**
 * Gets a clean, formatted transcript JSON array for AI prompt context.
 */
async function getTranscriptJson(videoId) {
  const transcripts = await prisma.transcript.findMany({
    where: { videoId },
    orderBy: { startTime: 'asc' }
  });

  if (transcripts.length === 0) {
    throw new Error('No transcripts found for this video. Cannot run AI generation.');
  }

  return JSON.stringify(
    transcripts.map(t => ({
      start: Number(t.startTime.toFixed(2)),
      text: t.translatedText || t.originalText
    })),
    null,
    2
  );
}

/**
 * Unified AI Generation Pipeline:
 * Generates Summary, Chapters, Notes, Glossary, Keywords, Flashcards, and Quizzes in 1 single Gemini call.
 */
async function generateFullStudyPackage(videoId) {
  const transcriptJson = await getTranscriptJson(videoId);

  console.log(`Sending unified AI request to Gemini for video: ${videoId}`);

  const rawJson = await callGemini(
    allInOnePrompt.userPrompt(transcriptJson),
    allInOnePrompt.systemPrompt,
    allInOnePrompt.responseSchema
  );

  const data = JSON.parse(rawJson);

  // 1. Save Chapters to DB
  if (Array.isArray(data.chapters)) {
    await prisma.chapter.deleteMany({ where: { videoId } });
    await prisma.chapter.createMany({
      data: data.chapters.map(ch => ({
        videoId,
        title: ch.title,
        startTime: ch.start,
        endTime: ch.end,
        description: ch.description
      }))
    });
  }

  // 2. Save Flashcards to DB
  if (Array.isArray(data.flashcards)) {
    await prisma.flashcard.deleteMany({ where: { videoId } });
    await prisma.flashcard.createMany({
      data: data.flashcards.map(fc => ({
        videoId,
        question: fc.question,
        answer: fc.answer
      }))
    });
  }

  // 3. Save Quizzes to DB
  if (Array.isArray(data.quiz)) {
    await prisma.quizItem.deleteMany({ where: { videoId } });
    await prisma.quizItem.createMany({
      data: data.quiz.map(qi => ({
        videoId,
        question: qi.question,
        options: qi.options,
        correctAnswer: qi.correctAnswer
      }))
    });
  }

  // 4. Save and compile Notes, Markdown, HTML via NotesEngine
  const notesResult = await processAndSaveNotes(videoId, {
    summary: data.summary,
    chapters: data.chapters || [],
    notes: data.notes || [],
    glossary: data.glossary || [],
    keywords: data.keywords || []
  });

  return {
    notes: notesResult.notes,
    html: notesResult.html,
    chapters: data.chapters,
    flashcards: data.flashcards,
    quiz: data.quiz
  };
}

/**
 * AI Chatbot for querying the video content
 */
async function chat(videoId, history, userMessage) {
  const transcripts = await prisma.transcript.findMany({
    where: { videoId },
    orderBy: { startTime: 'asc' }
  });

  const transcriptText = transcripts
    .slice(0, 300)
    .map(t => `[${Math.floor(t.startTime)}s] ${t.translatedText || t.originalText}`)
    .join('\n');

  const systemInstruction = `You are a helpful learning assistant for a video study tool.
Answer user questions concisely using the provided video transcript details.
Format video timestamps in your response using double brackets: e.g. [[12:43]].

Transcript:
${transcriptText}`;

  const contents = history.map(h => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }]
  }));

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const replyText = await callGemini(contents, systemInstruction);

  await prisma.chatMessage.create({ data: { videoId, role: 'user', content: userMessage } });
  await prisma.chatMessage.create({ data: { videoId, role: 'assistant', content: replyText } });

  return replyText;
}

module.exports = {
  generateFullStudyPackage,
  chat
};
