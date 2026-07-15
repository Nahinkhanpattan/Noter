import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Send, Bot, User, Sparkles } from 'lucide-react';

export default function AIChat() {
  const { chatHistory, sendChatMessage, triggerSeek } = useStore();
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef(null);

  // Auto Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || isSending) return;

    const query = messageText.trim();
    setMessageText('');
    setIsSending(true);
    
    await sendChatMessage(query);
    setIsSending(false);
  };

  // Convert [[MM:SS]] or [[HH:MM:SS]] in chat reply into clickable seeks
  const formatMessageText = (content) => {
    // Escape standard tags first
    let escaped = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Convert [[MM:SS]] or [[HH:MM:SS]] to links
    escaped = escaped.replace(/\[\[((\d{1,2}:)?\d{1,2}:\d{2})\]\]/g, (match, timeStr) => {
      return `<a href="#" class="chat-time-link" data-time="${timeStr}" style="color: #8b5cf6; text-decoration: underline; font-weight: bold;">[[${timeStr}]]</a>`;
    });

    // Replace newlines with <br/>
    return escaped.replace(/\n/g, '<br/>');
  };

  const handleChatClick = (e) => {
    const target = e.target.closest('.chat-time-link');
    if (target) {
      e.preventDefault();
      const timeStr = target.getAttribute('data-time');
      triggerSeek(timeStr);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Bot className="text-violet-400" size={20} />
          <span className="font-bold text-slate-200">Gemini Lecture Copilot</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-violet-400 bg-violet-650/10 px-2.5 py-1 rounded-full border border-violet-500/20">
          <Sparkles size={12} />
          <span>Gemini 2.5 Flash</span>
        </div>
      </div>

      {/* Messages Feed */}
      <div 
        onClick={handleChatClick}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-900/60"
      >
        {chatHistory.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 gap-2">
            <Bot size={40} className="opacity-40 animate-bounce" />
            <p className="font-semibold text-sm">Ask about the lecture</p>
            <p className="text-xs opacity-75 max-w-xs">
              "What formulas did he write at 12:00?" or "Summarize the concept of convolutional filters."
            </p>
          </div>
        ) : (
          chatHistory.map((msg) => {
            const isBot = msg.role === 'assistant' || msg.role === 'model';
            return (
              <div 
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${isBot ? 'self-start' : 'self-end flex-row-reverse'}`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${isBot ? 'bg-violet-950/40 border-violet-500/25 text-violet-400' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
                  {isBot ? <Bot size={16} /> : <User size={16} />}
                </div>
                
                <div className={`flex flex-col gap-1 p-3.5 rounded-xl text-sm leading-relaxed ${isBot ? 'bg-slate-950/60 text-slate-200 border border-slate-800/80 rounded-tl-none' : 'bg-violet-600 text-white rounded-tr-none'}`}>
                  <div 
                    dangerouslySetInnerHTML={{ __html: formatMessageText(msg.content) }}
                  />
                </div>
              </div>
            );
          })
        )}
        
        {/* Typing indicator */}
        {isSending && (
          <div className="flex gap-3 self-start max-w-[85%]">
            <div className="w-8 h-8 rounded-lg bg-violet-950/40 border border-violet-500/25 text-violet-400 flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div className="bg-slate-950/60 text-slate-400 p-3.5 rounded-xl rounded-tl-none border border-slate-800/80 flex items-center gap-1 text-xs font-semibold">
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Tray */}
      <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Ask a question about the video..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-violet-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!messageText.trim() || isSending}
          className="p-2 rounded-lg bg-violet-600 text-white disabled:opacity-40 hover:bg-violet-500 transition-colors"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
