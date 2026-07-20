const { YoutubeTranscript } = require('youtube-transcript');
const { PrismaClient } = require('@prisma/client');
const { getOrFetchVideo } = require('./videoService');

const prisma = new PrismaClient();

/**
 * Fetches subtitles/transcript from YouTube.
 * Returns raw array: [ { start, duration, text } ]
 */
async function fetchSubtitles(videoId) {
  try {
    const rawTranscript = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (!rawTranscript || rawTranscript.length === 0) {
      throw new Error('NO_SUBTITLE');
    }

    const subtitles = rawTranscript.map(item => ({
      start: Number(item.offset),
      duration: Number(item.duration),
      text: cleanSubtitleText(item.text)
    }));

    return subtitles;
  } catch (error) {
    console.error(`Error fetching subtitles for video ${videoId}:`, error.message);
    throw new Error('NO_SUBTITLE');
  }
}

/**
 * Cleans the subtitle text by removing HTML entities or system markup.
 */
function cleanSubtitleText(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n/g, ' ')
    .trim();
}

/**
 * Saves raw transcript tracks into the DB, ensuring Video record exists first.
 */
async function saveRawTranscript(videoId, subtitles) {
  // Guarantee Video record is created in DB first to prevent Foreign Key constraint errors
  await getOrFetchVideo(videoId);

  // Delete existing transcripts for this video if any
  await prisma.transcript.deleteMany({
    where: { videoId }
  });

  // Bulk insert
  const transcriptData = subtitles.map(sub => ({
    videoId,
    startTime: sub.start,
    duration: sub.duration,
    originalText: sub.text,
    translatedText: null
  }));

  await prisma.transcript.createMany({
    data: transcriptData
  });

  return transcriptData;
}

module.exports = {
  fetchSubtitles,
  saveRawTranscript
};
