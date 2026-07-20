const BACKEND_URL = 'http://localhost:5000';
import { create } from 'zustand';

export const useStore = create((set, get) => ({
  currentView: 'dashboard', // 'dashboard', 'courses', 'course-detail', 'workspace'
  videoId: null,
  video: null,
  notes: null,
  chapters: [],
  flashcards: [],
  quizzes: [],
  chatHistory: [],
  currentTime: 0,
  seekToSeconds: null,
  isProcessing: false,
  searchQuery: '',
  searchResults: { transcripts: [], chapters: [], notes: [], glossary: [] },

  // Course & Navigation state
  courses: [],
  activeCourse: null,
  recentVideos: [],

  setCurrentView: (view) => set({ currentView: view }),
  setVideoId: (id) => set({ videoId: id }),
  setPlaybackTime: (time) => set({ currentTime: time }),
  
  triggerSeek: (seconds) => {
    set({ seekToSeconds: seconds });
    setTimeout(() => {
      set({ seekToSeconds: null });
    }, 100);
  },

  // Fetch all Course Folders
  fetchCourses: async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/courses`);
      if (response.ok) {
        const { courses } = await response.json();
        set({ courses: courses || [] });
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  },

  // Create a new Course Playlist Folder
  createCourseFolder: async (title, description, color) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, color })
      });
      if (response.ok) {
        await get().fetchCourses();
        return true;
      }
    } catch (err) {
      console.error('Error creating course folder:', err);
    }
    return false;
  },

  // Fetch specific course details & playlist videos
  fetchCourseDetail: async (courseId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/courses/${courseId}`);
      if (response.ok) {
        const { course } = await response.json();
        set({ activeCourse: course, currentView: 'course-detail' });
      }
    } catch (err) {
      console.error('Error fetching course detail:', err);
    }
  },

  // Fetch recent videos for home dashboard
  fetchRecentVideos: async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/videos/recent`);
      if (response.ok) {
        const { videos } = await response.json();
        set({ recentVideos: videos || [] });
      }
    } catch (err) {
      console.error('Error fetching recent videos:', err);
    }
  },

  // Open a specific video workspace
  openVideoWorkspace: async (videoId) => {
    set({ videoId, currentView: 'workspace' });
    await get().fetchVideoDetails(videoId);
  },

  // Fetch full video details, notes, quizzes, flashcards
  fetchVideoDetails: async (videoId) => {
    if (!videoId) return;
    set({ videoId, isProcessing: false });

    try {
      // 1. Get video details
      const vResponse = await fetch(`${BACKEND_URL}/api/video/${videoId}`);
      if (vResponse.ok) {
        const { video } = await vResponse.json();
        set({
          video,
          chapters: video.chapters || [],
          flashcards: video.flashcards || [],
          quizzes: video.quizItems || []
        });
      }

      // 2. Get notes details
      const nResponse = await fetch(`${BACKEND_URL}/api/notes/${videoId}`);
      if (nResponse.ok) {
        const { notes } = await nResponse.json();
        set({ notes });
      } else {
        set({ notes: null });
      }

      // 3. Get chat history
      const cResponse = await fetch(`${BACKEND_URL}/api/chat/history/${videoId}`);
      if (cResponse.ok) {
        const { history } = await cResponse.json();
        set({ chatHistory: history || [] });
      } else {
        set({ chatHistory: [] });
      }
    } catch (err) {
      console.error('Error fetching video details:', err);
    }
  },

  // Run unified AI processing pipeline
  triggerAIPipeline: async (videoId, courseId = null) => {
    if (!videoId) return;
    set({ isProcessing: true });
    
    try {
      // Step 0: Ensure Video record is created in DB
      await fetch(`${BACKEND_URL}/api/video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${videoId}`, courseId })
      });

      // Step 1: Subtitles & Translation
      await fetch(`${BACKEND_URL}/api/subtitles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      });

      await fetch(`${BACKEND_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      });

      // Step 2: Unified AI Generation
      const notesRes = await fetch(`${BACKEND_URL}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      });

      if (notesRes.ok) {
        const data = await notesRes.json();
        set({ notes: data.notes, currentView: 'workspace' });
        await get().fetchVideoDetails(videoId);
        await get().fetchRecentVideos();
      } else {
        const errData = await notesRes.json();
        alert(`AI Generation Notice: ${errData.error || 'Failed to process notes'}`);
      }
    } catch (err) {
      console.error('AI Pipeline failed:', err);
    } finally {
      set({ isProcessing: false });
    }
  },

  saveNotesMarkdown: async (markdownContent) => {
    const { videoId } = get();
    if (!videoId) return;

    set(state => ({
      notes: state.notes ? { ...state.notes, markdownContent } : { id: 'temp', videoId, markdownContent, summaryText: '', studyNotesText: '', jsonStructure: {} }
    }));

    try {
      await fetch(`${BACKEND_URL}/api/notes/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, markdownContent })
      });
    } catch (err) {
      console.error('Failed to save notes draft:', err);
    }
  },

  sendChatMessage: async (message) => {
    const { videoId, chatHistory } = get();
    if (!videoId || !message) return;

    const userMsg = { id: `user-${Date.now()}`, role: 'user', content: message, createdAt: new Date() };
    set({ chatHistory: [...chatHistory, userMsg] });

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, history: chatHistory, message })
      });

      if (response.ok) {
        const { reply } = await response.json();
        const assistantMsg = { id: `bot-${Date.now()}`, role: 'assistant', content: reply, createdAt: new Date() };
        set(state => ({ chatHistory: [...state.chatHistory, assistantMsg] }));
      }
    } catch (err) {
      console.error('Chat request failed:', err);
    }
  },

  searchContent: async (query) => {
    const { videoId } = get();
    if (!videoId) return;
    
    set({ searchQuery: query });
    if (!query || query.trim() === '') {
      set({ searchResults: { transcripts: [], chapters: [], notes: [], glossary: [] } });
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/search?videoId=${videoId}&q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        set({ searchResults: data.results || { transcripts: [], chapters: [], notes: [], glossary: [] } });
      }
    } catch (err) {
      console.error('Search query failed:', err);
    }
  }
}));
