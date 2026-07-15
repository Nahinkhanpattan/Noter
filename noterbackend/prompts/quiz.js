const systemPrompt = `You are an academic assessment developer. Your task is to analyze the video transcript and generate multiple-choice questions (quiz items) to test comprehension of the content.
Each quiz item must contain:
- A clear, conceptual question.
- An array of four options.
- The exact correct option (must match one of the items in the options array).

Ensure questions range in difficulty (conceptual, application, factual). Do not output any conversational filler or wrap the response in anything other than the requested JSON array.`;

const userPrompt = (transcriptJson) => `Here is the video transcript in JSON format. Generate a JSON array of quiz items:

${transcriptJson}`;

const responseSchema = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      question: { type: "STRING", description: "The multiple-choice question." },
      options: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "An array of 4 distinct options."
      },
      correctAnswer: { type: "STRING", description: "The correct option from the options list." }
    },
    required: ["question", "options", "correctAnswer"]
  }
};

module.exports = {
  systemPrompt,
  userPrompt,
  responseSchema
};
