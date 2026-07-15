const BACKEND_URL = 'http://localhost:5000';

import { create } from 'zustand';

export const useStore = create((set, get) => ({
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

  setVideoId: (id) => set({ videoId: id }),
  setPlaybackTime: (time) => set({ currentTime: time }),
  
  triggerSeek: (seconds) => {
    set({ seekToSeconds: seconds });
    // Reset after a short delay so consecutive clicks register
    setTimeout(() => {
      set({ seekToSeconds: null });
    }, 100);
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

  // Run isolated AI processing pipeline
  triggerAIPipeline: async (videoId) => {
    if (!videoId) return;
    set({ isProcessing: true });
    
    try {
      // Step 1: Initialize subtitles & translation
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

      // Step 2: Trigger AI Generation pipeline
      const notesRes = await fetch(`${BACKEND_URL}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      });

      if (notesRes.ok) {
        const data = await notesRes.json();
        set({ notes: data.notes });
        
        // Refresh all details to load newly generated chapters, flashcards, quizzes
        await get().fetchVideoDetails(videoId);
      }
    } catch (err) {
      console.error('AI Pipeline failed:', err);
    } finally {
      set({ isProcessing: false });
    }
  },

  // Save notes editor updates to DB
  saveNotesMarkdown: async (markdownContent) => {
    const { videoId } = get();
    if (!videoId) return;

    // Update local state
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

  // Send a chat message to the video bot
  sendChatMessage: async (message) => {
    const { videoId, chatHistory } = get();
    if (!videoId || !message) return;

    // Optimistically update history
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

  // Search inside video notes and transcripts
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
