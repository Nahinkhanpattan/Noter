require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testWorkingModel() {
  const models = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash-lite', 'gemini-3.5-flash'];
  for (const m of models) {
    try {
      console.log(`Testing model string: "${m}"...`);
      const res = await ai.models.generateContent({
        model: m,
        contents: "Return word SUCCESS if active."
      });
      console.log(`>>> MODEL WORKED: "${m}" -> Reply:`, res.text.trim());
      return m;
    } catch (err) {
      console.error(`Model "${m}" failed:`, err.message.slice(0, 150));
    }
  }
}

testWorkingModel();
