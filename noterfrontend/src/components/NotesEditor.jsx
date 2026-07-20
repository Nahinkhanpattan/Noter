import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useStore } from '../store';
import { 
  Bold, Italic, Heading1, Heading2, List, ListOrdered, Quote, 
  Clock, FileText, Code2, Check
} from 'lucide-react';

function htmlToMarkdown(html) {
  if (!html) return '';
  let md = html;
  
  md = md.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n');
  
  md = md.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i>(.*?)<\/i>/gi, '*$1*');
  
  md = md.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n');
  md = md.replace(/<code>(.*?)<\/code>/gi, '`$1`');
  
  md = md.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, '> $1\n\n');
  
  md = md.replace(/<a[^>]*data-time="([^"]+)"[^>]*>.*?<\/a>/gi, '[[$1]]');
  md = md.replace(/\[\[\[\[/gi, '[[').replace(/\]\]\]\]/gi, ']]');
  
  md = md.replace(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)\n\n');
  md = md.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]+)"[^>]*>/gi, '![$1]($2)\n\n');
  
  md = md.replace(/<li>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<ul>/gi, '').replace(/<\/ul>/gi, '\n');
  md = md.replace(/<ol>/gi, '').replace(/<\/ol>/gi, '\n');
  
  md = md.replace(/<p>(.*?)<\/p>/gi, '$1\n\n');
  
  md = md.replace(/<[^>]*>/g, '');
  return md.trim();
}

function markdownToHtml(md) {
  if (!md) return '';
  let html = md;
  
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:100%; border-radius:8px; border:1px solid rgba(255,255,255,0.1); margin:12px 0;" />');

  html = html.replace(/^# (.*?)$/gm, '<h1 style="font-size: 1.35rem; font-weight: 800; color: #c084fc; border-bottom: 1px solid #1e293b; padding-bottom: 6px; margin-top: 16px; margin-bottom: 12px; line-height: 1.4;">$1</h1>');
  html = html.replace(/^## (.*?)$/gm, '<h2 style="font-size: 1.15rem; font-weight: 700; color: #818cf8; margin-top: 18px; margin-bottom: 8px;">$1</h2>');
  html = html.replace(/^### (.*?)$/gm, '<h3 style="font-size: 1.0rem; font-weight: 600; color: #f1f5f9; margin-top: 14px; margin-bottom: 6px;">$1</h3>');

  html = html.replace(/\[\[((\d{1,2}:)?\d{1,2}:\d{2})\]\]/g, (match, timeStr) => {
    return `<a href="#" class="time-link" data-time="${timeStr}" style="color: #60a5fa; text-decoration: underline; font-weight: bold; background: rgba(96, 165, 250, 0.1); padding: 2px 6px; border-radius: 4px; display: inline-block;">[[${timeStr}]]</a>`;
  });

  html = html.replace(/^> (.*?)$/gm, '<blockquote style="border-left: 3px solid #8b5cf6; padding-left: 12px; margin: 12px 0; color: #c084fc; background: rgba(139, 92, 246, 0.08); padding-top: 6px; padding-bottom: 6px; border-radius: 0 6px 6px 0;">$1</blockquote>');

  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.*?)`/g, '<code style="background:#0f172a; color:#cbd5e1; padding:2px 6px; border-radius:4px; font-size:0.85em;">$1</code>');

  html = html.split('\n\n').map(p => {
    if (p.trim().startsWith('<h') || p.trim().startsWith('<block') || p.trim().startsWith('<ul') || p.trim().startsWith('<img')) {
      return p;
    }
    return `<p style="margin-bottom: 12px; line-height: 1.6; color: #cbd5e1;">${p.replace(/\n/g, '<br/>')}</p>`;
  }).join('');

  return html;
}

export default function NotesEditor() {
  const { notes, saveNotesMarkdown, currentTime, triggerSeek } = useStore();
  const [editorMode, setEditorMode] = useState('rich');
  const [rawText, setRawText] = useState('');

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      saveNotesMarkdown(markdown);
      setRawText(markdown);
    }
  });

  useEffect(() => {
    if (notes && editor) {
      const htmlContent = markdownToHtml(notes.markdownContent);
      if (editor.getHTML() !== htmlContent) {
        editor.commands.setContent(htmlContent);
      }
      setRawText(notes.markdownContent);
    }
  }, [notes, editor]);

  const handleEditorClick = (e) => {
    const target = e.target.closest('.time-link');
    if (target) {
      e.preventDefault();
      const timeStr = target.getAttribute('data-time');
      triggerSeek(timeStr);
    }
  };

  const injectTimestamp = () => {
    if (!editor) return;
    const timeStr = formatSecondsToTime(currentTime);
    const htmlToInsert = `<a href="#" class="time-link" data-time="${timeStr}" style="color: #60a5fa; text-decoration: underline; font-weight: bold; background: rgba(96, 165, 250, 0.1); padding: 2px 6px; border-radius: 4px;">[[${timeStr}]]</a>&nbsp;`;
    editor.commands.insertContent(htmlToInsert);
    editor.commands.focus();
  };

  const handleRawChange = (e) => {
    const text = e.target.value;
    setRawText(text);
    saveNotesMarkdown(text);
    if (editor) {
      editor.commands.setContent(markdownToHtml(text));
    }
  };

  function formatSecondsToTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  if (!notes) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-slate-400">
        <FileText size={48} className="mb-4 opacity-50" />
        <p className="font-semibold text-lg">No notes created yet</p>
        <p className="text-sm opacity-70">Enter a video URL and click Analyze to generate notes.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between p-3.5 bg-slate-950 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <FileText className="text-violet-400" size={18} />
          <span className="font-bold text-sm text-slate-200">Study Journal</span>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={injectTimestamp}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 transition-colors border border-violet-500/20"
          >
            <Clock size={13} />
            <span>Pin ({formatSecondsToTime(currentTime)})</span>
          </button>
          
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button 
              onClick={() => setEditorMode('rich')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${editorMode === 'rich' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Rich Editor
            </button>
            <button 
              onClick={() => setEditorMode('raw')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${editorMode === 'raw' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Markdown Raw
            </button>
          </div>
        </div>
      </div>

      {/* Editor Toolbar */}
      {editorMode === 'rich' && editor && (
        <div className="flex flex-wrap gap-1 p-2 bg-slate-950/70 border-b border-slate-800/80">
          <button 
            onClick={() => editor.chain().focus().toggleBold().run()} 
            className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('bold') ? 'bg-slate-800 text-violet-400' : ''}`}
            title="Bold"
          >
            <Bold size={15} />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleItalic().run()} 
            className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('italic') ? 'bg-slate-800 text-violet-400' : ''}`}
            title="Italic"
          >
            <Italic size={15} />
          </button>
          <div className="w-[1px] bg-slate-800 self-stretch my-1 mx-0.5" />
          <button 
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
            className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-800 text-violet-400' : ''}`}
            title="Heading 1"
          >
            <Heading1 size={15} />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
            className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-800 text-violet-400' : ''}`}
            title="Heading 2"
          >
            <Heading2 size={15} />
          </button>
          <div className="w-[1px] bg-slate-800 self-stretch my-1 mx-0.5" />
          <button 
            onClick={() => editor.chain().focus().toggleBulletList().run()} 
            className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('bulletList') ? 'bg-slate-800 text-violet-400' : ''}`}
            title="Bullet List"
          >
            <List size={15} />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleOrderedList().run()} 
            className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('orderedList') ? 'bg-slate-800 text-violet-400' : ''}`}
            title="Ordered List"
          >
            <ListOrdered size={15} />
          </button>
          <div className="w-[1px] bg-slate-800 self-stretch my-1 mx-0.5" />
          <button 
            onClick={() => editor.chain().focus().toggleBlockquote().run()} 
            className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('blockquote') ? 'bg-slate-800 text-violet-400' : ''}`}
            title="Blockquote"
          >
            <Quote size={15} />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleCodeBlock().run()} 
            className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('codeBlock') ? 'bg-slate-800 text-violet-400' : ''}`}
            title="Code Block"
          >
            <Code2 size={15} />
          </button>
        </div>
      )}

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto p-4" onClick={handleEditorClick}>
        {editorMode === 'rich' ? (
          <EditorContent 
            editor={editor} 
            className="prose prose-invert max-w-none focus:outline-none min-h-[300px]" 
          />
        ) : (
          <textarea
            value={rawText}
            onChange={handleRawChange}
            className="w-full h-full min-h-[300px] bg-transparent text-slate-200 border-none outline-none font-mono text-sm leading-relaxed resize-none"
            placeholder="Write markdown directly..."
          />
        )}
      </div>
      
      {/* Footer Status */}
      <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <Check size={12} className="text-emerald-400" />
          <span>Draft saved</span>
        </div>
        <div>
          {editorMode === 'rich' ? 'TipTap Engine' : 'Raw Markdown'}
        </div>
      </div>
    </div>
  );
}
