require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');

// Import services
const { getOrFetchVideo } = require('./services/videoService');
const { fetchSubtitles, saveRawTranscript } = require('./services/subtitleService');
const { translateSubtitles } = require('./services/translationService');
const { 
  generateChapters, 
  generateSummary, 
  generateNotes, 
  generateGlossary, 
  generateKeywords, 
  generateFlashcards, 
  generateQuiz,
  chat
} = require('./services/aiService');
const { processAndSaveNotes } = require('./services/notesEngine');
const { uploadScreenshot } = require('./services/screenshotService');
const { exportNotes } = require('./services/exportService');
const { searchVideoContent } = require('./services/searchService');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Setup Multer for screenshot image uploads (in-memory buffer storage)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// --- API ENDPOINTS ---

/**
 * POST /api/video
 * Input: { url: "https://youtube.com/watch?v=..." }
 * Output: Video object from DB
 */
app.post('/api/video', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Missing youtube video url' });
  }

  try {
    const video = await getOrFetchVideo(url);
    res.json({ video });
  } catch (error) {
    console.error('POST /api/video error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/video/:id
 * Gets metadata of a video
 */
app.get('/api/video/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const video = await prisma.video.findUnique({
      where: { id },
      include: {
        chapters: { orderBy: { startTime: 'asc' } },
        screenshots: { orderBy: { timestamp: 'asc' } },
        flashcards: true,
        quizItems: true
      }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({ video });
  } catch (error) {
    console.error('GET /api/video/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/subtitles
 * Fetches subtitles and saves to DB. Returns raw text structure.
 */
app.post('/api/subtitles', async (req, res) => {
  const { videoId } = req.body;
  if (!videoId) {
    return res.status(400).json({ error: 'Missing videoId' });
  }

  try {
    const subtitles = await fetchSubtitles(videoId);
    const saved = await saveRawTranscript(videoId, subtitles);
    res.json({ success: true, count: saved.length, subtitles });
  } catch (error) {
    if (error.message === 'NO_SUBTITLE') {
      res.json({ success: false, status: 'NO_SUBTITLE', message: 'No subtitles found for this video.' });
    } else {
      console.error('POST /api/subtitles error:', error);
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * POST /api/translate
 * Translates raw subtitles using Gemini Flash and saves back.
 */
app.post('/api/translate', async (req, res) => {
  const { videoId } = req.body;
  if (!videoId) {
    return res.status(400).json({ error: 'Missing videoId' });
  }

  try {
    const translated = await translateSubtitles(videoId);
    res.json({ success: true, count: translated.length, translated });
  } catch (error) {
    console.error('POST /api/translate error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/notes
 * Coordinates isolated AI processes and saves to DB via NotesEngine.
 */
app.post('/api/notes', async (req, res) => {
  const { videoId } = req.body;
  if (!videoId) {
    return res.status(400).json({ error: 'Missing videoId' });
  }

  try {
    console.log(`Starting AI Processing Pipeline for video: ${videoId}`);
    
    // Run isolated requests in sequence (safe database updates per phase)
    console.log('- Generating chapters...');
    const chapters = await generateChapters(videoId);
    
    console.log('- Generating summary...');
    const summary = await generateSummary(videoId);
    
    console.log('- Generating concept notes...');
    const notes = await generateNotes(videoId);
    
    console.log('- Generating glossary...');
    const glossary = await generateGlossary(videoId);
    
    console.log('- Generating keywords...');
    const keywords = await generateKeywords(videoId);

    console.log('- Generating study items (quizzes & flashcards)...');
    await generateFlashcards(videoId);
    await generateQuiz(videoId);

    // Validate with Zod and compile outputs
    console.log('- Saving and compiling Markdown/HTML blocks...');
    const result = await processAndSaveNotes(videoId, {
      summary,
      chapters,
      notes,
      glossary,
      keywords
    });

    res.json({
      success: true,
      notes: result.notes,
      html: result.html
    });
  } catch (error) {
    console.error('POST /api/notes pipeline error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/notes/:videoId
 * Retrieve generated notes for a video
 */
app.get('/api/notes/:videoId', async (req, res) => {
  const { videoId } = req.params;
  try {
    const notes = await prisma.notes.findUnique({
      where: { videoId }
    });

    if (!notes) {
      return res.status(404).json({ error: 'Notes not generated yet' });
    }

    res.json({ notes });
  } catch (error) {
    console.error('GET /api/notes/:videoId error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/chat
 * Send a message to Gemini chatbot configured with the video context
 */
app.post('/api/chat', async (req, res) => {
  const { videoId, history, message } = req.body;
  if (!videoId || !message) {
    return res.status(400).json({ error: 'Missing videoId or message' });
  }

  try {
    const reply = await chat(videoId, history || [], message);
    res.json({ reply });
  } catch (error) {
    console.error('POST /api/chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/chat/history/:videoId
 * Retrieve chatbot history for a video
 */
app.get('/api/chat/history/:videoId', async (req, res) => {
  const { videoId } = req.params;
  try {
    const history = await prisma.chatMessage.findMany({
      where: { videoId },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ history });
  } catch (error) {
    console.error('GET /api/chat/history error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/screenshot
 * Receives manual screenshots uploaded from the Chrome extension, uploads to R2 and returns S3 URL
 */
app.post('/api/screenshot', upload.single('screenshot'), async (req, res) => {
  const { videoId, timestamp } = req.body;
  
  if (!videoId || !timestamp) {
    return res.status(400).json({ error: 'Missing videoId or timestamp' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Missing screenshot image file' });
  }

  try {
    const screenshot = await uploadScreenshot(videoId, timestamp, req.file.buffer);
    res.json({ success: true, screenshot });
  } catch (error) {
    console.error('POST /api/screenshot error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/search
 * Search across transcripts, notes, and glossary for matching concepts
 */
app.get('/api/search', async (req, res) => {
  const { videoId, q } = req.query;
  if (!videoId || !q) {
    return res.status(400).json({ error: 'Missing videoId or search query (q)' });
  }

  try {
    const searchResults = await searchVideoContent(videoId, q);
    res.json(searchResults);
  } catch (error) {
    console.error('GET /api/search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/export
 * Download compiled Markdown/HTML documents
 */
app.post('/api/export', async (req, res) => {
  const { videoId, format } = req.body;
  if (!videoId || !format) {
    return res.status(400).json({ error: 'Missing videoId or format' });
  }

  try {
    const fileData = await exportNotes(videoId, format);
    res.setHeader('Content-disposition', `attachment; filename=${fileData.filename}`);
    res.setHeader('Content-type', fileData.mimeType);
    res.send(fileData.content);
  } catch (error) {
    console.error('POST /api/export error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/notes/save
 * Saves markdown content updated by editor (client or extension)
 */
app.post('/api/notes/save', async (req, res) => {
  const { videoId, markdownContent } = req.body;
  if (!videoId) {
    return res.status(400).json({ error: 'Missing videoId' });
  }

  try {
    const notes = await prisma.notes.upsert({
      where: { videoId },
      update: { markdownContent },
      create: {
        videoId,
        summaryText: '',
        studyNotesText: '',
        markdownContent,
        jsonStructure: {}
      }
    });
    res.json({ success: true, notes });
  } catch (error) {
    console.error('POST /api/notes/save error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/notes/ai-quick
 * Generates a 60-second transcript summary at the current video timestamp
 */
app.post('/api/notes/ai-quick', async (req, res) => {
  const { videoId, currentTime } = req.body;
  if (!videoId || currentTime === undefined) {
    return res.status(400).json({ error: 'Missing videoId or currentTime' });
  }

  try {
    const time = parseFloat(currentTime);
    const transcripts = await prisma.transcript.findMany({
      where: {
        videoId,
        startTime: {
          gte: Math.max(0, time - 60),
          lte: time
        }
      },
      orderBy: { startTime: 'asc' }
    });

    if (transcripts.length === 0) {
      return res.json({ summary: "No transcript segments found in the last 60 seconds." });
    }

    const textContext = transcripts.map(t => t.translatedText || t.originalText).join(' ');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following 60-second video segment transcript and generate a very concise summary, insight, key takeaway, or formula mentioned. Keep it to a maximum of 2 sentences.
      
      Transcript segment:
      "${textContext}"`,
    });

    res.json({ summary: response.text.trim() });
  } catch (error) {
    console.error('POST /api/notes/ai-quick error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Root Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Noter (AI Video Operating System) API' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Noter Backend running on http://localhost:${PORT}`);
});
