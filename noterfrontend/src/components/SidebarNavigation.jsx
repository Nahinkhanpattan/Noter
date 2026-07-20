import React, { useEffect } from 'react';
import { useStore } from '../store';
import { 
  Home, FolderPlus, Folder, Tv, Plus, Layers, ChevronRight, Video, FileText
} from 'lucide-react';

export default function SidebarNavigation({ onOpenNewCourseModal }) {
  const { 
    currentView, setCurrentView, courses, fetchCourses, 
    fetchCourseDetail, video, openVideoWorkspace 
  } = useStore();

  useEffect(() => {
    fetchCourses();
  }, []);

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-900 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      <div className="flex flex-col gap-6 p-4 overflow-y-auto">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-600/20">
            <Layers size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-slate-100 tracking-tight leading-none">Noter OS</h1>
            <span className="text-[10px] text-violet-400 font-semibold tracking-wider uppercase">AI Video Workspace</span>
          </div>
        </div>

        {/* Primary Navigation Links */}
        <nav className="flex flex-col gap-1">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${currentView === 'dashboard' ? 'bg-violet-600/15 text-violet-300 border border-violet-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
          >
            <Home size={18} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setCurrentView('courses')}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${currentView === 'courses' || currentView === 'course-detail' ? 'bg-violet-600/15 text-violet-300 border border-violet-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
          >
            <div className="flex items-center gap-3">
              <Folder size={18} />
              <span>Course Playlists</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 font-bold border border-slate-800">
              {courses.length}
            </span>
          </button>

          {video && (
            <button
              onClick={() => openVideoWorkspace(video.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${currentView === 'workspace' ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <Tv size={18} />
              <span className="truncate">Active Video</span>
            </button>
          )}
        </nav>

        {/* Course Folders Section */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-900">
          <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>My Courses</span>
            <button 
              onClick={onOpenNewCourseModal}
              className="p-1 rounded-md hover:bg-slate-900 text-slate-400 hover:text-violet-400 transition-colors"
              title="Create New Course Folder"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
            {courses.length === 0 ? (
              <p className="text-xs text-slate-600 px-2 py-1 italic">No course folders created yet.</p>
            ) : (
              courses.map(course => (
                <button
                  key={course.id}
                  onClick={() => fetchCourseDetail(course.id)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                    <span className="truncate">{course.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-600 group-hover:text-slate-400 font-mono">
                    {course.videos?.length || 0} vids
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="p-4 border-t border-slate-900 text-xs text-slate-600 flex items-center justify-between">
        <span>Noter OS v1.0</span>
        <span className="text-emerald-500 font-bold">Online</span>
      </div>
    </aside>
  );
}
