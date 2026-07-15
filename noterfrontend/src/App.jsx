import React, { useState, useEffect } from 'react';
import { useStore } from './store';
import VideoPlayer from './components/VideoPlayer';
import NotesEditor from './components/NotesEditor';
import StudyModules from './components/StudyModules';
import AIChat from './components/AIChat';
import { 
  Search, Youtube, Brain, Download, RefreshCw, Sparkles, BookOpen, 
  HelpCircle, MessageSquare, ListTodo, SearchCode
} from 'lucide-react';

// Extract YouTube ID from URL
function extractVideoId(url) {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export default function App() {
  const [urlInput, setUrlInput] = useState('');
  const { 
    video, notes, chapters, isProcessing, fetchVideoDetails, 
    triggerAIPipeline, triggerSeek, searchContent, searchQuery, searchResults 
  } = useStore();

  const [activeRightTab, setActiveRightTab] = useState('editor'); // 'editor', 'study', 'chat'
  const [localSearch, setLocalSearch] = useState('');

  // Handle URL submissions
  const handleLoadVideo = async (e) => {
    e.preventDefault();
    const id = extractVideoId(urlInput);
    if (!id) {
      alert('Please enter a valid YouTube video URL');
      return;
    }

    // 1. Fetch details (checks if already in DB)
    await fetchVideoDetails(id);

    // 2. Check if notes are loaded in store
    const state = useStore.getState();
    if (!state.notes) {
      // Run AI pipeline if no notes exist
      await triggerAIPipeline(id);
    }
  };

  const handleForceRegenerate = async () => {
    if (!video) return;
    if (window.confirm('Are you sure you want to regenerate all notes and study tools? This will overwrite your current journal.')) {
      await triggerAIPipeline(video.id);
    }
  };

  // Perform search
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setLocalSearch(query);
    searchContent(query);
  };

  // Export File (MD/HTML) via POST request
  const handleExport = async (format) => {
    if (!video) return;
    try {
      const response = await fetch('http://localhost:5000/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id, format })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = format === 'markdown' ? `Notes_${video.id}.md` : `Notes_${video.id}.html`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-violet-650 selection:text-white">
      {/* GLOBAL NAVBAR */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20">
            <Brain size={18} className="text-white" />
          </div>
          <h1 className="text-xl font-black bg-gradient-to-r from-violet-400 via-indigo-200 to-white bg-clip-text text-transparent tracking-tight">
            Noter <span className="text-xs font-bold px-2 py-0.5 rounded-full border border-violet-500/30 bg-violet-600/10 text-violet-300 ml-1.5 uppercase">OS v1</span>
          </h1>
        </div>

        {/* Video Load URL Form */}
        <form onSubmit={handleLoadVideo} className="flex-1 max-w-xl mx-8 flex gap-2">
          <div className="relative flex-1">
            <Youtube className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Enter YouTube URL (e.g. https://www.youtube.com/watch?v=...)"
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-11 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/30 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-650 text-white text-sm font-semibold hover:bg-violet-600 disabled:opacity-40 transition-colors shadow-lg shadow-violet-600/10"
          >
            <span>Analyze</span>
          </button>
        </form>

        {/* Global Toolbar */}
        {video && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleForceRegenerate}
              className="p-2 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200 transition-colors"
              title="Force Regenerate notes"
            >
              <RefreshCw size={16} />
            </button>
            <div className="h-6 w-[1px] bg-slate-800 mx-1"></div>
            <button
              onClick={() => handleExport('markdown')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/20 text-slate-300 hover:bg-slate-900/50 text-xs font-semibold transition-colors"
            >
              <Download size={14} />
              <span>Markdown</span>
            </button>
            <button
              onClick={() => handleExport('html')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/20 text-slate-300 hover:bg-slate-900/50 text-xs font-semibold transition-colors"
            >
              <Download size={14} />
              <span>HTML</span>
            </button>
          </div>
        )}
      </header>

      {/* PIPELINE PROCESSING MASK */}
      {isProcessing && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/80 backdrop-blur-sm z-40">
          <div className="relative w-20 h-20 mb-8 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 border-r-indigo-500 border-slate-800 animate-spin"></div>
            <Brain className="text-violet-400 animate-pulse" size={32} />
          </div>
          <h2 className="text-xl font-bold mb-2">Analyzing Video Context</h2>
          <p className="text-slate-500 text-sm max-w-sm text-center leading-relaxed mb-6">
            Gemini is fetching transcripts, translating to English, and building structured notes, study tools, and interactive quizzes...
          </p>
          {/* Progress Indicators */}
          <div className="w-full max-w-xs flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-400 px-1">
              <span>Execution Pipeline</span>
              <span className="text-violet-400">Processing...</span>
            </div>
            <div className="h-1.5 w-full bg-slate-850 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full animate-pulse" style={{ width: '80%' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD CORE CONTENT CONTAINER */}
      {!isProcessing && (
        <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
          {!video ? (
            /* WELCOME DISPLAY STATE */
            <div className="col-span-12 flex flex-col items-center justify-center py-20 px-6 max-w-2xl mx-auto text-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-2xl flex items-center justify-center transform rotate-3">
                <Brain size={40} className="text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-extrabold text-white leading-tight">
                  Welcome to Noter OS
                </h2>
                <p className="text-slate-500 text-md mt-2 max-w-lg leading-relaxed">
                  The AI Video Operating System. Paste any YouTube watch link above to translate transcripts, generate detailed concept summaries, flashcard decks, and practice tests.
                </p>
              </div>
              {/* Feature grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-4">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center text-center gap-2">
                  <span className="text-2xl">🌍</span>
                  <h4 className="font-semibold text-sm text-slate-200">Auto Translate</h4>
                  <p className="text-xs text-slate-500">English translation via Gemini Flash</p>
                </div>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center text-center gap-2">
                  <span className="text-2xl">🧠</span>
                  <h4 className="font-semibold text-sm text-slate-200">Study Desk</h4>
                  <p className="text-xs text-slate-500">Quizzes, flashcards, glossary</p>
                </div>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center text-center gap-2">
                  <span className="text-2xl">🔌</span>
                  <h4 className="font-semibold text-sm text-slate-200">Extension Sync</h4>
                  <p className="text-xs text-slate-500">Live screenshot overlays on YT</p>
                </div>
              </div>
            </div>
          ) : (
            /* ACTIVE RUNTIME DISPLAY STATE */
            <>
              {/* LEFT ROW: PLAYER & TIMELINES (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-6 overflow-y-auto pr-1">
                {/* Embedded YouTube Player */}
                <VideoPlayer />

                {/* Search Bar / Indexer */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="text"
                      value={localSearch}
                      onChange={handleSearchChange}
                      placeholder="Search transcripts, study notes, or glossary..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>

                  {/* Search Results Display */}
                  {searchQuery && (
                    <div className="flex flex-col gap-3 max-h-60 overflow-y-auto border-t border-slate-800 pt-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Search Matches for "{searchQuery}"
                      </h4>
                      {/* Empty state */}
                      {searchResults.transcripts.length === 0 && 
                       searchResults.chapters.length === 0 && 
                       searchResults.notes.length === 0 && (
                        <p className="text-xs text-slate-500 italic">No exact matches found.</p>
                      )}

                      {/* Notes Matches */}
                      {searchResults.notes.map((n, i) => (
                        <div key={`n-${i}`} className="flex items-start gap-2 text-xs">
                          <button
                            onClick={() => triggerSeek(n.timestamp)}
                            className="bg-violet-900/35 border border-violet-500/20 px-1.5 py-0.5 rounded text-violet-300 font-bold shrink-0"
                          >
                            {formatSecondsToTime(n.timestamp)}
                          </button>
                          <div className="leading-relaxed">
                            <strong className="text-slate-200">{n.concept}:</strong> <span className="text-slate-400">{n.text}</span>
                          </div>
                        </div>
                      ))}

                      {/* Transcripts Matches */}
                      {searchResults.transcripts.map((t, i) => (
                        <div key={`t-${i}`} className="flex items-start gap-2 text-xs">
                          <button
                            onClick={() => triggerSeek(t.timestamp)}
                            className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-350 font-bold shrink-0"
                          >
                            {formatSecondsToTime(t.timestamp)}
                          </button>
                          <p className="text-slate-350 leading-relaxed italic">
                            "{t.text}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chapters Navigation Timeline */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-violet-400 font-bold uppercase tracking-wider">
                    <ListTodo size={14} />
                    <span>Interactive Chapters</span>
                  </div>
                  
                  {chapters.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No chapters defined.</p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                      {chapters.map((ch, idx) => (
                        <div 
                          key={idx}
                          className="flex items-start justify-between p-3 rounded-lg bg-slate-950/45 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all"
                        >
                          <div className="flex flex-col gap-1 pr-4">
                            <span className="font-semibold text-sm text-slate-200">{ch.title}</span>
                            <span className="text-xs text-slate-500">{ch.description}</span>
                          </div>
                          <button
                            onClick={() => triggerSeek(ch.startTime)}
                            className="text-xs font-bold bg-violet-600/10 border border-violet-500/20 text-violet-300 hover:bg-violet-650 hover:text-white px-2.5 py-1 rounded-lg transition-colors"
                          >
                            {formatSecondsToTime(ch.startTime)}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT ROW: ACTIONS TABS (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-4 h-[calc(100vh-100px)] overflow-hidden">
                {/* Tab selections */}
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
                  <button
                    onClick={() => setActiveRightTab('editor')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-colors ${activeRightTab === 'editor' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <BookOpen size={14} />
                    <span>Editor</span>
                  </button>
                  <button
                    onClick={() => setActiveRightTab('study')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-colors ${activeRightTab === 'study' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <HelpCircle size={14} />
                    <span>Study Desk</span>
                  </button>
                  <button
                    onClick={() => setActiveRightTab('chat')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-colors ${activeRightTab === 'chat' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <MessageSquare size={14} />
                    <span>AI Copilot</span>
                  </button>
                </div>

                {/* Tab Viewport */}
                <div className="flex-1 overflow-hidden">
                  {activeRightTab === 'editor' && <NotesEditor />}
                  {activeRightTab === 'study' && <StudyModules />}
                  {activeRightTab === 'chat' && <AIChat />}
                </div>
              </div>
            </>
          )}
        </main>
      )}
    </div>
  );
}

// Seconds formatter helper
function formatSecondsToTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
