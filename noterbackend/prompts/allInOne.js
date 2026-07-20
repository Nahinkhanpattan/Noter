const systemPrompt = `You are an expert academic processing engine for video lectures.
Analyze the provided video transcript and generate a complete study package.
You MUST output a JSON object containing:
1. "summary": A multi-paragraph synthesis of the entire video context.
2. "chapters": An array of logical video chapters with "title", "start" (start time in seconds), "end" (end time in seconds), and "description".
3. "notes": An array of detailed concept study notes with "timestamp" (in seconds), "concept", and "details" (detailed explanations formatted with markdown, code, or math where appropriate).
4. "glossary": An array of technical terms with "term" and "definition".
5. "keywords": An array of main tag/keyword strings representing the content.
6. "flashcards": An array of active-recall flashcards with "question" and "answer".
7. "quiz": An array of multiple-choice questions with "question", "options" (array of 4 distinct string choices), and "correctAnswer" (must exactly match one of the items in options).

Output ONLY valid JSON according to the schema.`;

const userPrompt = (transcriptJson) => `Here is the video transcript in JSON format with timestamps. Generate the full study package JSON:

${transcriptJson}`;

const responseSchema = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING", description: "Multi-paragraph high level summary of the lecture." },
    chapters: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          start: { type: "NUMBER" },
          end: { type: "NUMBER" },
          description: { type: "STRING" }
        },
        required: ["title", "start", "end", "description"]
      }
    },
    notes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          timestamp: { type: "NUMBER" },
          concept: { type: "STRING" },
          details: { type: "STRING" }
        },
        required: ["timestamp", "concept", "details"]
      }
    },
    glossary: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          term: { type: "STRING" },
          definition: { type: "STRING" }
        },
        required: ["term", "definition"]
      }
    },
    keywords: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    flashcards: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question: { type: "STRING" },
          answer: { type: "STRING" }
        },
        required: ["question", "answer"]
      }
    },
    quiz: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question: { type: "STRING" },
          options: {
            type: "ARRAY",
            items: { type: "STRING" }
          },
          correctAnswer: { type: "STRING" }
        },
        required: ["question", "options", "correctAnswer"]
      }
    }
  },
  required: ["summary", "chapters", "notes", "glossary", "keywords", "flashcards", "quiz"]
};

module.exports = {
  systemPrompt,
  userPrompt,
  responseSchema
};
