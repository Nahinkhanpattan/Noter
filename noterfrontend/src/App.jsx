import React, { useState, useEffect } from 'react';
import { useStore } from './store';
import SidebarNavigation from './components/SidebarNavigation';
import DashboardView from './components/DashboardView';
import CoursesView from './components/CoursesView';
import CoursePlaylistView from './components/CoursePlaylistView';
import VideoPlayer from './components/VideoPlayer';
import NotesEditor from './components/NotesEditor';
import StudyModules from './components/StudyModules';
import AIChat from './components/AIChat';
import { 
  Search, Youtube, Brain, Download, RefreshCw, BookOpen, 
  HelpCircle, MessageSquare, ListTodo, ArrowLeft, Folder, ChevronRight, Plus, X
} from 'lucide-react';

function extractVideoId(url) {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export default function App() {
  const [urlInput, setUrlInput] = useState('');
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDesc, setModalDesc] = useState('');

  const { 
    currentView, setCurrentView, video, chapters, isProcessing, activeCourse,
    fetchVideoDetails, triggerAIPipeline, triggerSeek, searchContent, searchQuery, 
    searchResults, createCourseFolder 
  } = useStore();

  const [activeRightTab, setActiveRightTab] = useState('editor');
  const [localSearch, setLocalSearch] = useState('');

  const handleLoadVideo = async (e) => {
    e.preventDefault();
    const id = extractVideoId(urlInput);
    if (!id) {
      alert('Please enter a valid YouTube video URL');
      return;
    }

    await fetchVideoDetails(id);
    const state = useStore.getState();
    if (!state.notes) {
      await triggerAIPipeline(id);
    } else {
      setCurrentView('workspace');
    }
  };

  const handleForceRegenerate = async () => {
    if (!video) return;
    if (window.confirm('Are you sure you want to regenerate all notes and study tools?')) {
      await triggerAIPipeline(video.id);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setLocalSearch(query);
    searchContent(query);
  };

  const handleCreateCourseModalSubmit = async (e) => {
    e.preventDefault();
    if (!modalTitle.trim()) return;
    const success = await createCourseFolder(modalTitle, modalDesc);
    if (success) {
      setModalTitle('');
      setModalDesc('');
      setShowCourseModal(false);
    }
  };

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

  function formatSecondsToTime(secs) {
    if (isNaN(secs) || secs === null) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-row overflow-x-hidden">
      {/* SIDEBAR NAVIGATION */}
      <SidebarNavigation onOpenNewCourseModal={() => setShowCourseModal(true)} />

      {/* MAIN VIEW AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* GLOBAL TOP NAVBAR */}
        <header className="border-b border-slate-900 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm text-slate-400">
            {currentView === 'workspace' && (
              <button
                onClick={() => setCurrentView(activeCourse ? 'course-detail' : 'dashboard')}
                className="flex items-center gap-1.5 font-semibold text-violet-400 hover:text-violet-300 transition-colors"
              >
                <ArrowLeft size={16} />
                <span>{activeCourse ? activeCourse.title : 'Dashboard'}</span>
              </button>
            )}

            {currentView === 'course-detail' && (
              <button
                onClick={() => setCurrentView('courses')}
                className="flex items-center gap-1.5 font-semibold text-violet-400 hover:text-violet-300 transition-colors"
              >
                <ArrowLeft size={16} />
                <span>Course Playlists</span>
              </button>
            )}

            {currentView === 'courses' && (
              <span className="font-bold text-slate-200">All Courses</span>
            )}

            {currentView === 'dashboard' && (
              <span className="font-bold text-slate-200">Dashboard</span>
            )}
          </div>

          {/* URL Analyzer Input */}
          <form onSubmit={handleLoadVideo} className="flex-1 max-w-lg mx-4 flex gap-2">
            <div className="relative flex-1">
              <Youtube className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Analyze YouTube URL (e.g. https://youtube.com/watch?v=...)"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-violet-600/20 disabled:opacity-40"
            >
              <span>Analyze</span>
            </button>
          </form>

          {/* Action Export Buttons */}
          {currentView === 'workspace' && video && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleForceRegenerate}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 transition-colors"
                title="Force Regenerate notes"
              >
                <RefreshCw size={15} />
              </button>
              <div className="h-5 w-[1px] bg-slate-800 mx-1"></div>
              <button
                onClick={() => handleExport('markdown')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                <Download size={13} />
                <span>Markdown</span>
              </button>
              <button
                onClick={() => handleExport('html')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                <Download size={13} />
                <span>HTML</span>
              </button>
            </div>
          )}
        </header>

        {/* AI LOADING MASK */}
        {isProcessing && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/90 backdrop-blur-sm z-50">
            <div className="relative w-20 h-20 mb-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 border-r-indigo-500 border-slate-800 animate-spin"></div>
              <Brain className="text-violet-400 animate-pulse" size={32} />
            </div>
            <h2 className="text-xl font-bold mb-2">Analyzing Video Context</h2>
            <p className="text-slate-400 text-sm max-w-sm text-center leading-relaxed mb-6">
              Gemini Flash is extracting transcripts, chapters, concept notes, flashcards, and practice quizzes...
            </p>
            <div className="w-full max-w-xs flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 px-1">
                <span>Single-Pass AI Processing</span>
                <span className="text-violet-400">Processing...</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full animate-pulse" style={{ width: '85%' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW ROUTER */}
        {!isProcessing && (
          <div className="flex-1 overflow-y-auto">
            {currentView === 'dashboard' && (
              <DashboardView onOpenNewCourseModal={() => setShowCourseModal(true)} />
            )}

            {currentView === 'courses' && (
              <CoursesView showModal={showCourseModal} setShowModal={setShowCourseModal} />
            )}

            {currentView === 'course-detail' && (
              <CoursePlaylistView />
            )}

            {currentView === 'workspace' && video && (
              <main className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN: PLAYER & SEARCH (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  <VideoPlayer />

                  {/* Search Bar */}
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

                    {searchQuery && (
                      <div className="flex flex-col gap-3 max-h-60 overflow-y-auto border-t border-slate-800 pt-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Search Matches for "{searchQuery}"
                        </h4>
                        {searchResults.transcripts.length === 0 && 
                         searchResults.chapters.length === 0 && 
                         searchResults.notes.length === 0 && (
                          <p className="text-xs text-slate-400 italic">No exact matches found.</p>
                        )}

                        {searchResults.notes.map((n, i) => (
                          <div key={`n-${i}`} className="flex items-start gap-2 text-xs">
                            <button
                              onClick={() => triggerSeek(n.timestamp)}
                              className="bg-violet-900/40 border border-violet-500/30 px-1.5 py-0.5 rounded text-violet-300 font-bold shrink-0"
                            >
                              {formatSecondsToTime(n.timestamp)}
                            </button>
                            <div className="leading-relaxed">
                              <strong className="text-slate-200">{n.concept}:</strong> <span className="text-slate-400">{n.text}</span>
                            </div>
                          </div>
                        ))}

                        {searchResults.transcripts.map((t, i) => (
                          <div key={`t-${i}`} className="flex items-start gap-2 text-xs">
                            <button
                              onClick={() => triggerSeek(t.timestamp)}
                              className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-bold shrink-0"
                            >
                              {formatSecondsToTime(t.timestamp)}
                            </button>
                            <p className="text-slate-400 leading-relaxed italic">
                              "{t.text}"
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Chapters Timeline */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-violet-400 font-bold uppercase tracking-wider">
                      <ListTodo size={14} />
                      <span>Interactive Chapters</span>
                    </div>
                    
                    {chapters.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No chapters defined.</p>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                        {chapters.map((ch, idx) => (
                          <div 
                            key={idx}
                            className="flex items-start justify-between p-3 rounded-lg bg-slate-950/50 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all"
                          >
                            <div className="flex flex-col gap-1 pr-4">
                              <span className="font-semibold text-sm text-slate-200">{ch.title}</span>
                              <span className="text-xs text-slate-400">{ch.description}</span>
                            </div>
                            <button
                              onClick={() => triggerSeek(ch.startTime)}
                              className="text-xs font-bold bg-violet-600/10 border border-violet-500/30 text-violet-300 hover:bg-violet-600 hover:text-white px-2.5 py-1 rounded-lg transition-colors"
                            >
                              {formatSecondsToTime(ch.startTime)}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: WORKSPACE TABS (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-4 h-[calc(100vh-140px)] sticky top-20">
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

                  <div className="flex-1 overflow-hidden">
                    {activeRightTab === 'editor' && <NotesEditor />}
                    {activeRightTab === 'study' && <StudyModules />}
                    {activeRightTab === 'chat' && <AIChat />}
                  </div>
                </div>
              </main>
            )}
          </div>
        )}
      </div>

      {/* CREATE COURSE GLOBAL MODAL */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-slate-100">Create Course Playlist Folder</h3>
              <button 
                onClick={() => setShowCourseModal(false)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCourseModalSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Course Title *</label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="e.g. DSA Series by Shradha Khapra"
                  required
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Description (Optional)</label>
                <textarea
                  value={modalDesc}
                  onChange={(e) => setModalDesc(e.target.value)}
                  placeholder="Course overview..."
                  rows={3}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-violet-500 transition-colors resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-violet-600/20"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
