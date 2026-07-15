const systemPrompt = `You are a world-class academic study assistant. Your goal is to generate detailed, comprehensive study notes from a video transcript.
For each key concept or topic mentioned in the video:
- Provide the approximate starting timestamp (in seconds).
- Name the concept.
- Provide clear, detailed, and structured explanations/details (formulas, code, math, tables, callouts, or bullet points should be formatted in Markdown where appropriate).

Do not output any conversational filler or wrap it in anything other than the requested JSON array.`;

const userPrompt = (transcriptJson) => `Here is the video transcript in JSON format. Generate a JSON array of concept notes:

${transcriptJson}`;

const responseSchema = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      timestamp: { type: "NUMBER", description: "The starting timestamp in seconds where the concept is introduced." },
      concept: { type: "STRING", description: "The name of the academic concept or topic." },
      details: { type: "STRING", description: "Detailed study notes or explanation of the concept, formatted with markdown if necessary." }
    },
    required: ["timestamp", "concept", "details"]
  }
};

module.exports = {
  systemPrompt,
  userPrompt,
  responseSchema
};
