import React, { useState } from 'react';
import { useStore } from '../store';
import { 
  ArrowLeft, Folder, Plus, Youtube, Play, FileText, Clock, Trash2, ChevronRight 
} from 'lucide-react';

export default function CoursePlaylistView() {
  const { 
    activeCourse, setCurrentView, openVideoWorkspace, triggerAIPipeline 
  } = useStore();
  const [videoUrl, setVideoUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  if (!activeCourse) return null;

  const handleAddVideo = async (e) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;

    // Extract ID
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = videoUrl.match(regex);
    const id = match ? match[1] : videoUrl.trim();

    setIsAdding(true);
    setVideoUrl('');
    
    // Process video with courseId attached
    await triggerAIPipeline(id, activeCourse.id);
    setIsAdding(false);
  };

  function formatTime(seconds) {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      {/* Navigation Header */}
      <div className="flex flex-col gap-4 border-b border-slate-900 pb-6">
        <button
          onClick={() => setCurrentView('courses')}
          className="self-start flex items-center gap-2 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Course Folders</span>
        </button>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Folder size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-100">{activeCourse.title}</h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30">
                  {activeCourse.videos?.length || 0} Lectures
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                {activeCourse.description || 'Course Playlist Module'}
              </p>
            </div>
          </div>

          {/* Add Video to Playlist Form */}
          <form onSubmit={handleAddVideo} className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Youtube size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Add YouTube lecture URL..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isAdding || !videoUrl.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-colors disabled:opacity-40"
            >
              <Plus size={14} />
              <span>Add Lecture</span>
            </button>
          </form>
        </div>
      </div>

      {/* Playlist Video Items */}
      {activeCourse.videos?.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-slate-900/40 border border-slate-800 rounded-2xl text-center gap-3">
          <Youtube size={40} className="text-slate-600" />
          <p className="font-semibold text-slate-300">No lectures added to this course playlist yet</p>
          <p className="text-xs text-slate-500">Paste a YouTube lecture URL above to add it to this course playlist.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Course Playlist Lectures ({activeCourse.videos.length})
          </h3>

          <div className="flex flex-col gap-3">
            {activeCourse.videos.map((vid, index) => (
              <div
                key={vid.id}
                onClick={() => openVideoWorkspace(vid.id)}
                className="flex flex-wrap items-center justify-between p-4 bg-slate-900 border border-slate-800 hover:border-violet-500/40 rounded-2xl cursor-pointer transition-all hover:bg-slate-900/90 gap-4 group"
              >
                <div className="flex items-center gap-4 flex-1 min-w-[280px]">
                  {/* Sequence number */}
                  <span className="font-mono text-sm font-bold text-slate-500 w-6 text-center">
                    {index + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="relative w-28 aspect-video rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                    <img src={vid.thumbnail} alt={vid.title} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] text-white px-1 rounded font-mono">
                      {formatTime(vid.duration)}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex flex-col gap-1 pr-2">
                    <h4 className="font-bold text-sm text-slate-100 group-hover:text-violet-300 transition-colors line-clamp-1">
                      {vid.title}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {vid.channel}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                    <FileText size={13} className="text-violet-400" />
                    <span>Notes Ready</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openVideoWorkspace(vid.id);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-300 group-hover:bg-violet-600 group-hover:text-white font-semibold text-xs transition-colors"
                  >
                    <Play size={13} />
                    <span>Watch & Edit</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
