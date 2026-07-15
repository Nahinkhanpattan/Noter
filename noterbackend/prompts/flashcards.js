const systemPrompt = `You are a learning science expert. Your task is to analyze the video transcript and generate active-recall flashcards.
Each flashcard must contain:
- A specific question testing a core concept.
- A concise, accurate, and easy-to-remember answer.

Do not output any conversational filler or wrap the response in anything other than the requested JSON array.`;

const userPrompt = (transcriptJson) => `Here is the video transcript in JSON format. Generate a JSON array of flashcards:

${transcriptJson}`;

const responseSchema = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      question: { type: "STRING", description: "The active-recall question testing a concept." },
      answer: { type: "STRING", description: "The clear, accurate answer to the question." }
    },
    required: ["question", "answer"]
  }
};

module.exports = {
  systemPrompt,
  userPrompt,
  responseSchema
};
