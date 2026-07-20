import React, { useEffect } from 'react';
import { useStore } from '../store';
import { 
  Folder, Play, Plus, Clock, FileText, Youtube, Brain, ChevronRight, Layers
} from 'lucide-react';

export default function DashboardView({ onOpenNewCourseModal }) {
  const { 
    courses, recentVideos, fetchCourses, fetchRecentVideos, 
    fetchCourseDetail, openVideoWorkspace, triggerAIPipeline 
  } = useStore();

  useEffect(() => {
    fetchCourses();
    fetchRecentVideos();
  }, []);

  function formatTime(seconds) {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return (
    <div className="flex flex-col gap-8 p-6 max-w-6xl mx-auto w-full">
      {/* COURSES PLAYLIST FOLDERS SECTION */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder size={18} className="text-violet-400" />
            <h2 className="text-lg font-bold text-slate-100">Course Playlists</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800 font-mono">
              {courses.length}
            </span>
          </div>
          <button
            onClick={onOpenNewCourseModal}
            className="flex items-center gap-1 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors"
          >
            <Plus size={14} />
            <span>New Course Folder</span>
          </button>
        </div>

        {courses.length === 0 ? (
          <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
            <Folder size={32} className="text-slate-600" />
            <p className="text-xs text-slate-400">No course playlists created yet. Create one to organize video lectures.</p>
            <button
              onClick={onOpenNewCourseModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 text-white font-semibold text-xs transition-colors"
            >
              <Plus size={14} />
              <span>Create Course Folder</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.slice(0, 3).map(course => (
              <div
                key={course.id}
                onClick={() => fetchCourseDetail(course.id)}
                className="p-5 bg-slate-900 border border-slate-800 hover:border-violet-500/40 rounded-2xl cursor-pointer transition-all hover:-translate-y-0.5 flex flex-col justify-between gap-4 group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-400 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                    <Folder size={18} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                    {course.videos?.length || 0} Lectures
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-100 group-hover:text-violet-300 transition-colors">
                    {course.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                    {course.description || 'Course Playlist'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RECENT VIDEOS LIBRARY SECTION */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Youtube size={18} className="text-red-500" />
          <h2 className="text-lg font-bold text-slate-100">Recent Video Library</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800 font-mono">
            {recentVideos.length}
          </span>
        </div>

        {recentVideos.length === 0 ? (
          <div className="p-12 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
            <Youtube size={40} className="text-slate-600" />
            <p className="font-semibold text-slate-300 text-sm">Your library is currently empty</p>
            <p className="text-xs text-slate-500 max-w-sm">
              Paste any YouTube lecture URL in the search bar above to generate AI notes, quizzes, and flashcards.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentVideos.map(vid => (
              <div
                key={vid.id}
                onClick={() => openVideoWorkspace(vid.id)}
                className="bg-slate-900 border border-slate-800 hover:border-violet-500/40 rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1 shadow-xl flex flex-col justify-between group"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video w-full bg-slate-950">
                  <img src={vid.thumbnail} alt={vid.title} className="w-full h-full object-cover" />
                  <span className="absolute bottom-2 right-2 bg-black/80 text-[10px] text-white font-mono px-1.5 py-0.5 rounded">
                    {formatTime(vid.duration)}
                  </span>
                  {vid.course && (
                    <span className="absolute top-2 left-2 bg-violet-900/90 text-violet-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-violet-500/30">
                      {vid.course.title}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 flex flex-col gap-3">
                  <h4 className="font-bold text-sm text-slate-100 group-hover:text-violet-300 transition-colors line-clamp-2 leading-snug">
                    {vid.title}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {vid.channel}
                  </p>
                </div>

                {/* Footer action */}
                <div className="px-4 py-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <FileText size={13} className="text-violet-400" />
                    <span>Notes ready</span>
                  </div>
                  <div className="flex items-center gap-1 text-violet-400 font-semibold group-hover:translate-x-1 transition-transform">
                    <span>Open</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
