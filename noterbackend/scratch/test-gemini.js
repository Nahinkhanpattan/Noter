const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: 'dummy-key' });
console.log('ai.models methods:', Object.keys(ai.models));
