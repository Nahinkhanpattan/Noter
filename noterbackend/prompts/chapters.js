const systemPrompt = `You are an expert video editor and educator. Your task is to analyze the provided video transcript and partition the video into logical, structured chapters.
For each chapter, provide:
- A descriptive, clear title.
- The start time (in seconds).
- The end time (in seconds).
- A short description outlining what is covered in this chapter.

Ensure the chapters cover the entire duration of the transcript without overlapping. Do not output any markdown formatting, headers, or conversational text. Output ONLY the valid JSON array as requested.`;

const userPrompt = (transcriptJson) => `Here is the translated video transcript in JSON format. Generate a JSON array of chapters:

${transcriptJson}`;

const responseSchema = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      title: { type: "STRING", description: "The title of the chapter." },
      start: { type: "NUMBER", description: "The start time of the chapter in seconds." },
      end: { type: "NUMBER", description: "The end time of the chapter in seconds." },
      description: { type: "STRING", description: "A brief summary of what is taught in this chapter." }
    },
    required: ["title", "start", "end", "description"]
  }
};

module.exports = {
  systemPrompt,
  userPrompt,
  responseSchema
};
