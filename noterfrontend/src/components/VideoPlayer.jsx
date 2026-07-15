import React, { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { Play, Tv, Youtube } from 'lucide-react';

export default function VideoPlayer() {
  const { video, seekToSeconds, setPlaybackTime } = useStore();
  const iframeRef = useRef(null);

  // Sync seek requests from store to YouTube Iframe
  useEffect(() => {
    if (seekToSeconds !== null && iframeRef.current && iframeRef.current.contentWindow) {
      const seconds = typeof seekToSeconds === 'string' ? parseTimeToSeconds(seekToSeconds) : seekToSeconds;
      
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [seconds, true]
        }),
        '*'
      );
      
      // Also send command to make sure it plays after seeking
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'playVideo',
          args: []
        }),
        '*'
      );
    }
  }, [seekToSeconds]);

  // Hook into YouTube API iframe messages to poll current playback time
  useEffect(() => {
    const handleYoutubeMessage = (e) => {
      // Check message origin or structure
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'infoDelivery' && data.info && data.info.currentTime !== undefined) {
          setPlaybackTime(data.info.currentTime);
        }
      } catch (err) {
        // Not a JSON command or unrelated window message
      }
    };

    window.addEventListener('message', handleYoutubeMessage);
    return () => {
      window.removeEventListener('message', handleYoutubeMessage);
    };
  }, [setPlaybackTime]);

  // Helper to convert MM:SS or HH:MM:SS to seconds
  function parseTimeToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center aspect-video w-full rounded-xl border border-slate-800 bg-slate-950 text-slate-500 p-8">
        <Tv size={48} className="mb-3 opacity-55 animate-pulse" />
        <p className="font-semibold text-md text-slate-400">Video Player Dormant</p>
        <p className="text-xs opacity-70">Submit a YouTube URL above to load the interactive stream.</p>
      </div>
    );
  }

  // Embed URL with JS API enabled to allow postMessage communication
  const embedUrl = `https://www.youtube.com/embed/${video.id}?enablejsapi=1&origin=${window.location.origin}&rel=0`;

  return (
    <div className="flex flex-col gap-4">
      {/* Video Container */}
      <div className="relative aspect-video w-full rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-black">
        <iframe
          ref={iframeRef}
          id="youtube-player-iframe"
          src={embedUrl}
          title={video.title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
      </div>

      {/* Metadata Bar */}
      <div className="flex flex-col gap-1 p-1">
        <div className="flex items-center gap-2 text-xs text-red-500 font-bold uppercase tracking-wider">
          <Youtube size={14} />
          <span>YouTube stream active</span>
        </div>
        <h2 className="text-xl font-bold text-slate-100 leading-tight">
          {video.title}
        </h2>
        <p className="text-sm text-slate-400">
          {video.channel} • Published on {new Date(video.publishedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
