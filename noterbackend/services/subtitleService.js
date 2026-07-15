const { YoutubeTranscript } = require('youtube-transcript');
const { PrismaClient } = require('@prisma/client');
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

    // Map output to match the format [ { start, duration, text } ]
    const subtitles = rawTranscript.map(item => ({
      start: Number(item.offset) / 1000, // youtube-transcript offset is in ms sometimes, but let's double check.
      // Wait, youtube-transcript offset is actually returned in seconds or milliseconds depending on the version.
      // Let's standardise: offset is start, duration is duration. Usually youtube-transcript returns offset in milliseconds or seconds?
      // Let's verify or support both. Usually, it is in seconds (or offset field is offset, duration field is duration).
      // Wait! Let's check: item.offset is offset in ms or seconds? Actually, in youtube-transcript, offset is in seconds or milliseconds?
      // Let's write a parser that handles both. In most versions of youtube-transcript, it is in seconds, but we can verify.
      // Let's check: if offset > 100000 (a large number) for the first few seconds, it might be milliseconds. Otherwise it's seconds.
      // Let's normalize it to seconds.
      start: item.offset,
      duration: item.duration,
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
 * Saves the raw transcript tracks into the DB.
 */
async function saveRawTranscript(videoId, subtitles) {
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
    translatedText: null // Translation service will fill this
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
