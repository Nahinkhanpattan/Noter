const systemPrompt = `You are a technical lexicographer. Your task is to analyze the video transcript and identify technical terms, domain-specific concepts, or jargon used in the video.
For each term:
- Provide the exact term name.
- Provide a clear, concise, and academic definition.

Do not output any markdown formatting, conversational filler, or wrap the response in anything other than the requested JSON array.`;

const userPrompt = (transcriptJson) => `Here is the video transcript in JSON format. Generate a JSON array of glossary items:

${transcriptJson}`;

const responseSchema = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      term: { type: "STRING", description: "The technical term or concept." },
      definition: { type: "STRING", description: "A clear, concise definition of the term." }
    },
    required: ["term", "definition"]
  }
};

module.exports = {
  systemPrompt,
  userPrompt,
  responseSchema
};
