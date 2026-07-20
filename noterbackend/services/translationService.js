const { GoogleGenAI } = require('@google/genai');
const { PrismaClient } = require('@prisma/client');
const { systemPrompt, userPrompt, responseSchema } = require('../prompts/translate');

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Robust call to Gemini API for translation with model fallbacks.
 */
async function callGeminiTranslate(contents) {
  const modelsToTry = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: responseSchema
        }
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[Translation AI] Attempt with '${modelName}' failed (${err.message.slice(0, 100)}). Retrying...`);
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  throw lastError || new Error("Translation AI failed.");
}

/**
 * Translates raw subtitles using Gemini Flash.
 * Stores both original and translated text.
 */
async function translateSubtitles(videoId) {
  const dbTranscripts = await prisma.transcript.findMany({
    where: { videoId },
    orderBy: { startTime: 'asc' }
  });

  if (dbTranscripts.length === 0) {
    throw new Error('No transcripts found to translate.');
  }

  // Segment transcripts into chunks (e.g. 200 items per chunk)
  const CHUNK_SIZE = 200;
  const chunks = [];
  for (let i = 0; i < dbTranscripts.length; i += CHUNK_SIZE) {
    chunks.push(dbTranscripts.slice(i, i + CHUNK_SIZE));
  }

  console.log(`Translating ${dbTranscripts.length} subtitles in ${chunks.length} chunks using gemini-flash-latest...`);

  for (let c = 0; c < chunks.length; c++) {
    const chunk = chunks[c];
    
    const inputSegments = chunk.map(t => ({
      start: t.startTime,
      text: t.originalText
    }));

    try {
      const rawResponse = await callGeminiTranslate(userPrompt(JSON.stringify(inputSegments)));
      const translatedItems = JSON.parse(rawResponse);

      // Save each translated segment back to the DB
      for (const item of translatedItems) {
        const closestRecord = findClosestRecord(item.start, chunk);
        if (closestRecord) {
          await prisma.transcript.update({
            where: { id: closestRecord.id },
            data: { translatedText: item.translated }
          });
        }
      }
      
      // Short delay between chunks to respect API rate limits
      if (chunks.length > 1) {
        await new Promise(r => setTimeout(r, 1200));
      }
    } catch (err) {
      console.error(`Warning: Chunk ${c + 1}/${chunks.length} translation fallback:`, err.message);
      // Fallback to original text if translation fails
      for (const t of chunk) {
        await prisma.transcript.update({
          where: { id: t.id },
          data: { translatedText: t.originalText }
        });
      }
    }
  }

  return prisma.transcript.findMany({
    where: { videoId },
    orderBy: { startTime: 'asc' }
  });
}

/**
 * Finds the closest transcript record in the chunk list.
 */
function findClosestRecord(startTime, records) {
  if (records.length === 0) return null;
  let closest = records[0];
  let minDiff = Math.abs(startTime - closest.startTime);
  
  for (const rec of records) {
    const diff = Math.abs(startTime - rec.startTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = rec;
    }
  }
  
  return minDiff < 2.0 ? closest : null;
}

module.exports = {
  translateSubtitles
};
