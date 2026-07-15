const { GoogleGenAI } = require('@google/genai');
const { PrismaClient } = require('@prisma/client');
const { systemPrompt, userPrompt, responseSchema } = require('../prompts/translate');

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Translates raw subtitles using Gemini 2.5 Flash.
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

  // Segment transcripts into chunks (e.g. 150 items) for reliable AI JSON structure parsing
  const CHUNK_SIZE = 150;
  const chunks = [];
  for (let i = 0; i < dbTranscripts.length; i += CHUNK_SIZE) {
    chunks.push(dbTranscripts.slice(i, i + CHUNK_SIZE));
  }

  console.log(`Translating ${dbTranscripts.length} subtitles in ${chunks.length} chunks...`);

  for (let c = 0; c < chunks.length; c++) {
    const chunk = chunks[c];
    
    // Prepare input JSON for the prompt
    const inputSegments = chunk.map(t => ({
      start: t.startTime,
      text: t.originalText
    }));

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt(JSON.stringify(inputSegments)),
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: responseSchema
        }
      });

      if (!response.text) {
        throw new Error('Empty response from translation model');
      }

      const translatedItems = JSON.parse(response.text);

      // Save each translated segment back to the DB
      for (const item of translatedItems) {
        // Find closest database transcript record to avoid floating point issues
        const closestRecord = findClosestRecord(item.start, chunk);
        if (closestRecord) {
          await prisma.transcript.update({
            where: { id: closestRecord.id },
            data: { translatedText: item.translated }
          });
        }
      }
    } catch (err) {
      console.error(`Error translating chunk ${c + 1}/${chunks.length}:`, err.message);
      // Even if AI translation fails on a segment, we fill it with originalText so pipeline doesn't break
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
  
  // Accept if it's within a 2 second window
  return minDiff < 2.0 ? closest : null;
}

module.exports = {
  translateSubtitles
};
