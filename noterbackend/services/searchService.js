const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Searches transcripts, notes, chapters, and glossary for a query.
 * Returns timestamp-jump ready result matches.
 */
async function searchVideoContent(videoId, query) {
  if (!query || query.trim() === '') {
    return { transcripts: [], chapters: [], notes: [], glossary: [] };
  }

  const cleanQuery = query.trim().toLowerCase();

  // 1. Search Transcript
  const dbTranscripts = await prisma.transcript.findMany({
    where: {
      videoId,
      OR: [
        { originalText: { contains: cleanQuery, mode: 'insensitive' } },
        { translatedText: { contains: cleanQuery, mode: 'insensitive' } }
      ]
    },
    orderBy: { startTime: 'asc' },
    take: 50
  });

  const transcriptMatches = dbTranscripts.map(t => ({
    timestamp: t.startTime,
    text: t.translatedText || t.originalText,
    type: 'transcript'
  }));

  // 2. Search Chapters
  const dbChapters = await prisma.chapter.findMany({
    where: {
      videoId,
      OR: [
        { title: { contains: cleanQuery, mode: 'insensitive' } },
        { description: { contains: cleanQuery, mode: 'insensitive' } }
      ]
    },
    orderBy: { startTime: 'asc' }
  });

  const chapterMatches = dbChapters.map(c => ({
    timestamp: c.startTime,
    title: c.title,
    text: c.description,
    type: 'chapter'
  }));

  // 3. Search Concept Notes & Glossary inside Notes JSON
  const notesRecord = await prisma.notes.findUnique({
    where: { videoId }
  });

  const conceptMatches = [];
  const glossaryMatches = [];

  if (notesRecord && notesRecord.jsonStructure) {
    const data = notesRecord.jsonStructure;
    
    // Concept Notes matches
    if (Array.isArray(data.notes)) {
      for (const n of data.notes) {
        if (
          n.concept.toLowerCase().includes(cleanQuery) ||
          n.details.toLowerCase().includes(cleanQuery)
        ) {
          conceptMatches.push({
            timestamp: n.timestamp,
            concept: n.concept,
            text: n.details,
            type: 'note'
          });
        }
      }
    }

    // Glossary matches
    if (Array.isArray(data.glossary)) {
      for (const g of data.glossary) {
        if (
          g.term.toLowerCase().includes(cleanQuery) ||
          g.definition.toLowerCase().includes(cleanQuery)
        ) {
          glossaryMatches.push({
            term: g.term,
            definition: g.definition,
            type: 'glossary'
          });
        }
      }
    }
  }

  return {
    query,
    results: {
      transcripts: transcriptMatches,
      chapters: chapterMatches,
      notes: conceptMatches,
      glossary: glossaryMatches
    }
  };
}

module.exports = {
  searchVideoContent
};
