const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Extracts the YouTube Video ID from any standard YouTube URL.
 */
function extractVideoId(url) {
  if (!url) return null;
  // Handle raw 11-char ID directly
  if (typeof url === 'string' && url.length === 11 && !url.includes('/') && !url.includes('.')) {
    return url;
  }
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Scrapes metadata from a YouTube page source without requiring API keys.
 */
async function fetchMetadata(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9'
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch YouTube page: ${response.statusText}`);
    }
    const html = await response.text();

    // Look for ytInitialPlayerResponse JSON in the page source
    const playerResponseRegex = /var ytInitialPlayerResponse\s*=\s*({.+?});/s;
    const match = html.match(playerResponseRegex);

    if (match) {
      const playerResponse = JSON.parse(match[1]);
      const details = playerResponse.videoDetails || {};
      
      const title = details.title || 'Unknown YouTube Video';
      const duration = parseInt(details.lengthSeconds || '0', 10);
      const channel = details.author || 'Unknown Channel';
      const thumbnail = details.thumbnail?.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      
      let publishedAt = new Date();
      try {
        const publishRegex = /"publishDate"\s*:\s*"(.+?)"/;
        const publishMatch = html.match(publishRegex);
        if (publishMatch) {
          publishedAt = new Date(publishMatch[1]);
        }
      } catch (e) {}

      return { videoId, title, thumbnail, duration, channel, publishedAt };
    }
  } catch (error) {
    console.error('Error scraping YouTube metadata, using fallback details:', error.message);
  }

  // Fallback metadata if scraping fails
  return {
    videoId,
    title: `YouTube Video (${videoId})`,
    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    duration: 300,
    channel: 'YouTube Creator',
    publishedAt: new Date()
  };
}

/**
 * Gets or fetches video information and saves to DB. Guaranteed to exist in DB upon return.
 */
async function getOrFetchVideo(urlOrId) {
  const videoId = extractVideoId(urlOrId);
  if (!videoId) {
    throw new Error('Invalid YouTube URL or Video ID');
  }

  // Check Database
  const existingVideo = await prisma.video.findUnique({
    where: { id: videoId }
  });

  if (existingVideo) {
    return existingVideo;
  }

  // Fetch metadata
  const metadata = await fetchMetadata(videoId);

  // Upsert to DB to safely handle concurrent requests
  const video = await prisma.video.upsert({
    where: { id: metadata.videoId },
    update: {},
    create: {
      id: metadata.videoId,
      title: metadata.title,
      thumbnail: metadata.thumbnail,
      duration: metadata.duration,
      channel: metadata.channel,
      publishedAt: metadata.publishedAt
    }
  });

  return video;
}

module.exports = {
  extractVideoId,
  getOrFetchVideo
};
