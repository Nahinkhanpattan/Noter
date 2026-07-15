const systemPrompt = `You are a data labeling specialist. Your task is to analyze the video transcript and identify the top keywords or tags that represent the primary topics discussed.
Generate an array of short, highly relevant strings representing these keywords.
Output the results in a JSON object with a single "keywords" property containing the string array. Do not output any conversational text.`;

const userPrompt = (transcriptJson) => `Here is the video transcript in JSON format. Generate the keywords:

${transcriptJson}`;

const responseSchema = {
  type: "OBJECT",
  properties: {
    keywords: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "A list of relevant tags or keywords representing the video content."
    }
  },
  required: ["keywords"]
};

module.exports = {
  systemPrompt,
  userPrompt,
  responseSchema
};
