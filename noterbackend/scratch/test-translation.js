require('dotenv').config();
const { translateSubtitles } = require('../services/translationService');
const { getOrFetchVideo } = require('../services/videoService');
const { fetchSubtitles, saveRawTranscript } = require('../services/subtitleService');

async function testTranslation() {
  try {
    const videoId = 'VTLCoHnyACE'; // User's video ID
    console.log(`Testing full subtitle & translation pipeline for ${videoId}...`);
    
    await getOrFetchVideo(videoId);
    const subs = await fetchSubtitles(videoId);
    await saveRawTranscript(videoId, subs.slice(0, 10)); // test small sample
    
    console.log("Running translation...");
    const translated = await translateSubtitles(videoId);
    console.log("SUCCESS! Translated sample items:", translated.length);
  } catch (err) {
    console.error("Test failed:", err.message);
  }
}

testTranslation();
