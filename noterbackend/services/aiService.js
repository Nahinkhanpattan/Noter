const { GoogleGenAI } = require('@google/genai');
const { PrismaClient } = require('@prisma/client');

// Import Prompts
const chaptersPrompt = require('../prompts/chapters');
const summaryPrompt = require('../prompts/summary');
const notesPrompt = require('../prompts/notes');
const glossaryPrompt = require('../prompts/glossary');
const keywordsPrompt = require('../prompts/keywords');
const flashcardsPrompt = require('../prompts/flashcards');
const quizPrompt = require('../prompts/quiz');

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Gets a clean, formatted transcript JSON array for AI prompt context.
 */
async function getTranscriptJson(videoId) {
  const transcripts = await prisma.transcript.findMany({
    where: { videoId },
    orderBy: { startTime: 'asc' }
  });
  
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
 * Generate Chapters and save to DB
 */
async function generateChapters(videoId) {
  const transcriptJson = await getTranscriptJson(videoId);
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: chaptersPrompt.userPrompt(transcriptJson),
    config: {
      systemInstruction: chaptersPrompt.systemPrompt,
      responseMimeType: 'application/json',
      responseSchema: chaptersPrompt.responseSchema
    }
  });

  const chapters = JSON.parse(response.text);
  
  // Clear and save to DB
  await prisma.chapter.deleteMany({ where: { videoId } });
  
  const chapterData = chapters.map(ch => ({
    videoId,
    title: ch.title,
    startTime: ch.start,
    endTime: ch.end,
    description: ch.description
  }));
  
  await prisma.chapter.createMany({ data: chapterData });
  return chapters;
}

/**
 * Generate Summary
 */
async function generateSummary(videoId) {
  const transcriptJson = await getTranscriptJson(videoId);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: summaryPrompt.userPrompt(transcriptJson),
    config: {
      systemInstruction: summaryPrompt.systemPrompt,
      responseMimeType: 'application/json',
      responseSchema: summaryPrompt.responseSchema
    }
  });

  const resJson = JSON.parse(response.text);
  return resJson.summary;
}

/**
 * Generate Concept Notes
 */
async function generateNotes(videoId) {
  const transcriptJson = await getTranscriptJson(videoId);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: notesPrompt.userPrompt(transcriptJson),
    config: {
      systemInstruction: notesPrompt.systemPrompt,
      responseMimeType: 'application/json',
      responseSchema: notesPrompt.responseSchema
    }
  });

  return JSON.parse(response.text);
}

/**
 * Generate Glossary
 */
async function generateGlossary(videoId) {
  const transcriptJson = await getTranscriptJson(videoId);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: glossaryPrompt.userPrompt(transcriptJson),
    config: {
      systemInstruction: glossaryPrompt.systemPrompt,
      responseMimeType: 'application/json',
      responseSchema: glossaryPrompt.responseSchema
    }
  });

  return JSON.parse(response.text);
}

/**
 * Generate Keywords
 */
async function generateKeywords(videoId) {
  const transcriptJson = await getTranscriptJson(videoId);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: keywordsPrompt.userPrompt(transcriptJson),
    config: {
      systemInstruction: keywordsPrompt.systemPrompt,
      responseMimeType: 'application/json',
      responseSchema: keywordsPrompt.responseSchema
    }
  });

  const resJson = JSON.parse(response.text);
  return resJson.keywords;
}

/**
 * Generate Flashcards and save to DB
 */
async function generateFlashcards(videoId) {
  const transcriptJson = await getTranscriptJson(videoId);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: flashcardsPrompt.userPrompt(transcriptJson),
    config: {
      systemInstruction: flashcardsPrompt.systemPrompt,
      responseMimeType: 'application/json',
      responseSchema: flashcardsPrompt.responseSchema
    }
  });

  const flashcards = JSON.parse(response.text);
  
  // Clear and save to DB
  await prisma.flashcard.deleteMany({ where: { videoId } });
  
  const flashcardData = flashcards.map(fc => ({
    videoId,
    question: fc.question,
    answer: fc.answer
  }));

  await prisma.flashcard.createMany({ data: flashcardData });
  return flashcards;
}

/**
 * Generate Quiz items and save to DB
 */
async function generateQuiz(videoId) {
  const transcriptJson = await getTranscriptJson(videoId);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: quizPrompt.userPrompt(transcriptJson),
    config: {
      systemInstruction: quizPrompt.systemPrompt,
      responseMimeType: 'application/json',
      responseSchema: quizPrompt.responseSchema
    }
  });

  const quizItems = JSON.parse(response.text);

  // Clear and save to DB
  await prisma.quizItem.deleteMany({ where: { videoId } });

  const quizData = quizItems.map(qi => ({
    videoId,
    question: qi.question,
    options: qi.options,
    correctAnswer: qi.correctAnswer
  }));

  await prisma.quizItem.createMany({ data: quizData });
  return quizItems;
}

/**
 * AI Chatbot for querying the video
 */
async function chat(videoId, history, userMessage) {
  // Fetch transcript context
  const transcripts = await prisma.transcript.findMany({
    where: { videoId },
    orderBy: { startTime: 'asc' }
  });
  
  const transcriptText = transcripts
    .slice(0, 400) // Keep size reasonable
    .map(t => `[${Math.floor(t.startTime)}s] ${t.translatedText || t.originalText}`)
    .join('\n');

  const systemInstruction = `You are a helpful learning assistant for a video study tool.
You have access to the transcript of the video the user is currently watching.
Answer user questions concisely, referring to specific timestamps of the video where appropriate.
Format timestamps as click links in your text using double brackets: e.g. [[12:43]].

Video Transcript:
${transcriptText}`;

  // Map history to standard contents format for @google/genai SDK
  // history is expected to be array of: { role: 'user' | 'model', text: '...' }
  const contents = history.map(h => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }]
  }));
  
  // Add active user message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: contents,
    config: {
      systemInstruction: systemInstruction
    }
  });

  const replyText = response.text || "I'm sorry, I couldn't generate a response.";
  
  // Save user message and reply to DB
  await prisma.chatMessage.create({
    data: { videoId, role: 'user', content: userMessage }
  });
  await prisma.chatMessage.create({
    data: { videoId, role: 'assistant', content: replyText }
  });

  return replyText;
}

module.exports = {
  generateChapters,
  generateSummary,
  generateNotes,
  generateGlossary,
  generateKeywords,
  generateFlashcards,
  generateQuiz,
  chat
};
