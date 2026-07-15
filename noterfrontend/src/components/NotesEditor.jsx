import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useStore } from '../store';
import { 
  Bold, Italic, Heading1, Heading2, List, ListOrdered, Quote, Code, 
  Clock, Save, FileText, Code2, ArrowLeftRight
} from 'lucide-react';

// Custom lightweight converter from HTML back to Markdown
function htmlToMarkdown(html) {
  if (!html) return '';
  
  let md = html;
  
  // Headers
  md = md.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n');
  
  // Bold & Italic
  md = md.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i>(.*?)<\/i>/gi, '*$1*');
  
  // Code block
  md = md.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n');
  md = md.replace(/<code>(.*?)<\/code>/gi, '`$1`');
  
  // Blockquotes
  md = md.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, '> $1\n\n');
  
  // Timestamp link seeks back to markdown representation [[MM:SS]]
  md = md.replace(/<a[^>]*data-time="([^"]+)"[^>]*>.*?<\/a>/gi, '[[$1]]');
  md = md.replace(/\[\[\[\[/gi, '[[').replace(/\]\]\]\]/gi, ']]'); // Sanitize double brackets
  
  // Images
  md = md.replace(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)\n\n');
  md = md.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]+)"[^>]*>/gi, '![$1]($2)\n\n');
  
  // List items
  md = md.replace(/<li>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<ul>/gi, '').replace(/<\/ul>/gi, '\n');
  md = md.replace(/<ol>/gi, '').replace(/<\/ol>/gi, '\n');
  
  // Paragraphs
  md = md.replace(/<p>(.*?)<\/p>/gi, '$1\n\n');
  
  // Tables
  md = md.replace(/<tr>([\s\S]*?)<\/tr>/gi, '|$1\n');
  md = md.replace(/<th>(.*?)<\/th>/gi, ' **$1** |');
  md = md.replace(/<td>(.*?)<\/td>/gi, ' $1 |');
  md = md.replace(/<thead>[\s\S]*?<\/thead>/gi, '');
  md = md.replace(/<tbody>/gi, '').replace(/<\/tbody>/gi, '');
  md = md.replace(/<table>/gi, '\n').replace(/<\/table>/gi, '\n');
  
  // Strip remaining HTML tags
  md = md.replace(/<[^>]*>/g, '');
  
  // Clean double spaces and returns
  return md.trim();
}

// Convert markdown to clean HTML to load into TipTap
function markdownToHtml(md) {
  if (!md) return '';
  
  let html = md;
  
  // Escape HTML entities to prevent rendering bugs
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  // Images
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); margin: 8px 0;" />');

  // Headers
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');

  // Timestamps: replace [[MM:SS]] or [[HH:MM:SS]]
  html = html.replace(/\[\[((\d{1,2}:)?\d{1,2}:\d{2})\]\]/g, (match, timeStr) => {
    return `<a href="#" class="time-link" data-time="${timeStr}" style="color: #60a5fa; text-decoration: underline; font-weight: bold;">[[${timeStr}]]</a>`;
  });

  // Blockquotes
  html = html.replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>');

  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Inline Code
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');

  // Paragraphs (rest of lines)
  html = html.split('\n\n').map(p => {
    if (p.trim().startsWith('<h') || p.trim().startsWith('<block') || p.trim().startsWith('<ul') || p.trim().startsWith('<table')) {
      return p;
    }
    return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
  }).join('');

  return html;
}

export default function NotesEditor() {
  const { notes, saveNotesMarkdown, currentTime, triggerSeek } = useStore();
  const [editorMode, setEditorMode] = useState('rich'); // 'rich' or 'raw'
  const [rawText, setRawText] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      saveNotesMarkdown(markdown);
      setRawText(markdown);
    }
  });

  // Load backend notes when component mounts or active notes state changes
  useEffect(() => {
    if (notes && editor) {
      const htmlContent = markdownToHtml(notes.markdownContent);
      if (editor.getHTML() !== htmlContent) {
        editor.commands.setContent(htmlContent);
      }
      setRawText(notes.markdownContent);
    }
  }, [notes, editor]);

  // Click handler inside editor to seek player on clicking timestamps
  const handleEditorClick = (e) => {
    const target = e.target.closest('.time-link');
    if (target) {
      e.preventDefault();
      const timeStr = target.getAttribute('data-time');
      triggerSeek(timeStr);
    }
  };

  // Inject current playback time e.g. [[02:40]]
  const injectTimestamp = () => {
    if (!editor) return;
    const timeStr = formatSecondsToTime(currentTime);
    const htmlToInsert = `<a href="#" class="time-link" data-time="${timeStr}" style="color: #60a5fa; text-decoration: underline; font-weight: bold;">[[${timeStr}]]</a>&nbsp;`;
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
        <p className="text-sm opacity-70">Enter a video URL and click Generate to start.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <FileText className="text-violet-400" size={20} />
          <span className="font-bold text-slate-200">Study Journal</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={injectTimestamp}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 transition-colors"
          >
            <Clock size={14} />
            <span>Drop Pin ({formatSecondsToTime(currentTime)})</span>
          </button>
          
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button 
              onClick={() => setEditorMode('rich')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${editorMode === 'rich' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Rich Editor
            </button>
            <button 
              onClick={() => setEditorMode('raw')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${editorMode === 'raw' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Markdown Raw
            </button>
          </div>
        </div>
      </div>

      {/* Editor Toolbar (For Rich Mode Only) */}
      {editorMode === 'rich' && editor && (
        <div className="flex flex-wrap gap-1 p-2 bg-slate-950/60 border-b border-slate-800/80 overflow-x-auto">
          <button 
            onClick={() => editor.chain().focus().toggleBold().run()} 
            className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('bold') ? 'bg-slate-800 text-violet-400' : ''}`}
            title="Bold"
          >
            <Bold size={16} />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleItalic().run()} 
            className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('italic') ? 'bg-slate-800 text-violet-400' : ''}`}
            title="Italic"
          >
            <Italic size={16} />
          </button>
          <div className="w-[1px] bg-slate-800 self-stretch my-1 mx-0.5" />
          <button 
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
            className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-800 text-violet-400' : ''}`}
            title="Heading 1"
          >
            <Heading1 size={16} />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
            className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-800 text-violet-400' : ''}`}
            title="Heading 2"
          >
            <Heading2 size={16} />
          </button>
          <div className="w-[1px] bg-slate-800 self-stretch my-1 mx-0.5" />
          <button 
            onClick={() => editor.chain().focus().toggleBulletList().run()} 
            className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('bulletList') ? 'bg-slate-800 text-violet-400' : ''}`}
            title="Bullet List"
          >
            <List size={16} />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleOrderedList().run()} 
            className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('orderedList') ? 'bg-slate-800 text-violet-400' : ''}`}
            title="Ordered List"
          >
            <ListOrdered size={16} />
          </button>
          <div className="w-[1px] bg-slate-800 self-stretch my-1 mx-0.5" />
          <button 
            onClick={() => editor.chain().focus().toggleBlockquote().run()} 
            className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('blockquote') ? 'bg-slate-800 text-violet-400' : ''}`}
            title="Blockquote"
          >
            <Quote size={16} />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleCodeBlock().run()} 
            className={`p-1.5 rounded hover:bg-slate-800 text-slate-300 ${editor.isActive('codeBlock') ? 'bg-slate-800 text-violet-400' : ''}`}
            title="Code Block"
          >
            <Code2 size={16} />
          </button>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto p-4" onClick={handleEditorClick}>
        {editorMode === 'rich' ? (
          <EditorContent 
            editor={editor} 
            className="prose prose-invert max-w-none focus:outline-none min-h-[300px] text-slate-200" 
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
      
      {/* Editor Footer / Auto-save Indicator */}
      <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
          <span>Draft autosaved instantly</span>
        </div>
        <div>
          {editorMode === 'rich' ? 'HTML-to-MD Live Link active' : 'Direct Markdown Draft'}
        </div>
      </div>
    </div>
  );
}
