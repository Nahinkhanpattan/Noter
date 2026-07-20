require('dotenv').config();
const { generateFullStudyPackage } = require('../services/aiService');

async function testPipeline() {
  try {
    const videoId = 'VTLCoHnyACE';
    console.log(`Testing full unified AI study package generation for ${videoId}...`);
    const result = await generateFullStudyPackage(videoId);
    console.log("SUCCESS! Generated study package:");
    console.log("- Summary length:", result.notes.summaryText.length);
    console.log("- Chapters count:", result.chapters?.length || 0);
    console.log("- Flashcards count:", result.flashcards?.length || 0);
    console.log("- Quiz items count:", result.quiz?.length || 0);
  } catch (err) {
    console.error("Pipeline test failed:", err.message);
  }
}

testPipeline();
