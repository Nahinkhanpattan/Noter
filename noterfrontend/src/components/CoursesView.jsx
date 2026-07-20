import React, { useState } from 'react';
import { useStore } from '../store';
import { FolderPlus, Folder, Video, ChevronRight, Plus, X } from 'lucide-react';

export default function CoursesView({ showModal, setShowModal }) {
  const { courses, fetchCourseDetail, createCourseFolder } = useStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const success = await createCourseFolder(title, description);
    if (success) {
      setTitle('');
      setDescription('');
      setShowModal(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Course Playlists & Folders</h1>
          <p className="text-sm text-slate-400 mt-1">Organize YouTube video lectures into course modules with synced notes</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-violet-600/20"
        >
          <Plus size={16} />
          <span>New Course Folder</span>
        </button>
      </div>

      {/* Grid of Course Folders */}
      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-slate-900/40 border border-slate-800 rounded-2xl text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-950/50 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <FolderPlus size={32} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-200">No Course Folders yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-1">
              Create a course folder (e.g. "DSA Series by Shradha Khapra") to group lectures together into a playlist.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors mt-2"
          >
            <Plus size={16} />
            <span>Create First Course</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <div
              key={course.id}
              onClick={() => fetchCourseDetail(course.id)}
              className="flex flex-col justify-between p-6 bg-slate-900 border border-slate-800 hover:border-violet-500/40 rounded-2xl cursor-pointer transition-all hover:-translate-y-1 shadow-xl group"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-400 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                    <Folder size={20} />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                    {course.videos?.length || 0} Lectures
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-slate-100 group-hover:text-violet-300 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {course.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              {/* Video Previews */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Video size={14} className="text-slate-500" />
                  <span>Playlist Course</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-violet-400 group-hover:translate-x-1 transition-transform">
                  <span>Open Folder</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE COURSE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-slate-100">Create Course Playlist Folder</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Course Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. DSA Series by Shradha Khapra"
                  required
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Course overview or subject notes..."
                  rows={3}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-violet-500 transition-colors resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
