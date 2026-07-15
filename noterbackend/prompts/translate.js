const systemPrompt = `You are a professional subtitle translator. Your task is to translate the provided video subtitle segments into clean, natural, and contextually accurate English.
- Maintain the original meaning and tone.
- Do NOT merge or split timestamps; translate each segment individually.
- Keep the start times exactly the same.
- Do not output any markdown formatting, headers, or conversational text. Output ONLY the valid JSON array as requested.`;

const userPrompt = (segmentsJson) => `Here are the subtitle segments to translate. Output a JSON array where each item has the fields "start" and "translated":

${segmentsJson}`;

const responseSchema = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      start: { type: "NUMBER", description: "The start time of the segment in seconds." },
      translated: { type: "STRING", description: "The English translation of the subtitle text." }
    },
    required: ["start", "translated"]
  }
};

module.exports = {
  systemPrompt,
  userPrompt,
  responseSchema
};
