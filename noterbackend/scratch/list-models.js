require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function listModels() {
  try {
    const pager = await ai.models.list();
    for await (const m of pager) {
      if (m.name.includes('flash') || m.name.includes('gemini')) {
        console.log(m.name);
      }
    }
  } catch (err) {
    console.error("List models error:", err.message);
  }
}

listModels();
