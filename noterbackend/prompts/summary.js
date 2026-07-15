const systemPrompt = `You are an expert content summarizer. Your task is to analyze the video transcript and generate a high-level, multi-paragraph synthesis (summary) of the entire video.
Focus on capturing the core message, main insights, and overall context.
Output the result in a JSON object with a single "summary" property containing the text. Do not output any markdown formatting or conversational text.`;

const userPrompt = (transcriptJson) => `Here is the video transcript in JSON format. Generate the summary:

${transcriptJson}`;

const responseSchema = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING", description: "A detailed, multi-paragraph summary of the entire video." }
  },
  required: ["summary"]
};

module.exports = {
  systemPrompt,
  userPrompt,
  responseSchema
};
