require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');

// Import services
const { getOrFetchVideo } = require('./services/videoService');
const { fetchSubtitles, saveRawTranscript } = require('./services/subtitleService');
const { translateSubtitles } = require('./services/translationService');
const { generateFullStudyPackage, chat } = require('./services/aiService');
const { uploadScreenshot } = require('./services/screenshotService');
const { exportNotes } = require('./services/exportService');
const { searchVideoContent } = require('./services/searchService');
const { 
  getCourses, 
  getCourseById, 
  createCourse, 
  deleteCourse, 
  addVideoToCourse, 
  getRecentVideos 
} = require('./services/courseService');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Setup Multer for screenshot image uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// --- API ENDPOINTS ---

/**
 * GET /api/courses
 * List all course folders
 */
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await getCourses();
    res.json({ courses });
  } catch (error) {
    console.error('GET /api/courses error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/courses
 * Create a new course folder
 */
app.post('/api/courses', async (req, res) => {
  const { title, description, color } = req.body;
  try {
    const course = await createCourse(title, description, color);
    res.json({ success: true, course });
  } catch (error) {
    console.error('POST /api/courses error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/courses/:id
 * Get course playlist & videos
 */
app.get('/api/courses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const course = await getCourseById(id);
    res.json({ course });
  } catch (error) {
    console.error('GET /api/courses/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/courses/:id
 */
app.delete('/api/courses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await deleteCourse(id);
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/courses/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/courses/:id/add-video
 */
app.post('/api/courses/:id/add-video', async (req, res) => {
  const { id } = req.params;
  const { videoId } = req.body;
  try {
    const video = await addVideoToCourse(id, videoId);
    res.json({ success: true, video });
  } catch (error) {
    console.error('POST /api/courses/:id/add-video error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/videos/recent
 * Get all analyzed videos for dashboard
 */
app.get('/api/videos/recent', async (req, res) => {
  try {
    const videos = await getRecentVideos();
    res.json({ videos });
  } catch (error) {
    console.error('GET /api/videos/recent error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/video
 */
app.post('/api/video', async (req, res) => {
  const { url, courseId } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Missing youtube video url' });
  }

  try {
    const video = await getOrFetchVideo(url);
    if (courseId) {
      await addVideoToCourse(courseId, video.id);
    }
    res.json({ video });
  } catch (error) {
    console.error('POST /api/video error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/video/:id
 */
app.get('/api/video/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const video = await prisma.video.findUnique({
      where: { id },
      include: {
        course: true,
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
 */
app.post('/api/subtitles', async (req, res) => {
  const { videoId } = req.body;
  if (!videoId) {
    return res.status(400).json({ error: 'Missing videoId' });
  }

  try {
    await getOrFetchVideo(videoId);
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
 */
app.post('/api/translate', async (req, res) => {
  const { videoId } = req.body;
  if (!videoId) {
    return res.status(400).json({ error: 'Missing videoId' });
  }

  try {
    await getOrFetchVideo(videoId);
    const translated = await translateSubtitles(videoId);
    res.json({ success: true, count: translated.length, translated });
  } catch (error) {
    console.error('POST /api/translate error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/notes
 */
app.post('/api/notes', async (req, res) => {
  const { videoId } = req.body;
  if (!videoId) {
    return res.status(400).json({ error: 'Missing videoId' });
  }

  try {
    console.log(`Starting AI Processing Pipeline for video: ${videoId}`);
    await getOrFetchVideo(videoId);
    
    const result = await generateFullStudyPackage(videoId);

    res.json({
      success: true,
      notes: result.notes,
      html: result.html,
      chapters: result.chapters,
      flashcards: result.flashcards,
      quiz: result.quiz
    });
  } catch (error) {
    console.error('POST /api/notes pipeline error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/notes/:videoId
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
 */
app.post('/api/notes/save', async (req, res) => {
  const { videoId, markdownContent } = req.body;
  if (!videoId) {
    return res.status(400).json({ error: 'Missing videoId' });
  }

  try {
    await getOrFetchVideo(videoId);
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

// Root Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Noter (AI Video Operating System) API' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Noter Backend running on http://localhost:${PORT}`);
});
