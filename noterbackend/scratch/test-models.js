require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testModels() {
  console.log("Testing Gemini models with API key...");
  
  const modelsToTest = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro'];

  for (const modelName of modelsToTest) {
    try {
      console.log(`\nTrying model: ${modelName}`);
      const res = await ai.models.generateContent({
        model: modelName,
        contents: "Hello, reply with OK if you are working."
      });
      console.log(`SUCCESS [${modelName}]:`, res.text.trim());
      break; // Found working model!
    } catch (err) {
      console.error(`FAILED [${modelName}]:`, err.message);
    }
  }
}

testModels();
