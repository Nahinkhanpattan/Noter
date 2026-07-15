// Configuration
const BACKEND_URL = 'http://localhost:5000';
let activeVideoId = null;
let activeVideoTitle = 'Noter Notes';
let saveTimeout = null;

// Initialize Extension when page loads
function init() {
  const videoId = getYouTubeVideoId();
  if (!videoId) return;
  
  // If video changed on same page (YouTube SPA navigation)
  if (activeVideoId === videoId) return;
  activeVideoId = videoId;

  console.log(`[Noter] Initializing live widget for YouTube video: ${videoId}`);
  
  // Initialize video in backend database
  initializeVideoInBackend(window.location.href)
    .then(video => {
      activeVideoTitle = video.title;
      // Inject elements
      injectFloatingWidget();
      loadNotes();
    })
    .catch(err => {
      console.error('[Noter] Initialization failed:', err.message);
      showToast('⚠️ Backend Connection Failed');
    });
}

// Watch for YouTube page transitions (SPA navigation)
const observer = new MutationObserver(() => {
  const videoId = getYouTubeVideoId();
  if (videoId && videoId !== activeVideoId) {
    init();
  }
});
observer.observe(document.body, { childList: true, subtree: true });
init();

// Helper to extract YouTube Video ID
function getYouTubeVideoId() {
  const url = window.location.href;
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Format seconds into MM:SS or HH:MM:SS
function formatTime(seconds) {
  const secs = Math.floor(seconds);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const mStr = String(m).padStart(2, '0');
  const sStr = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${mStr}:${sStr}`;
  return `${mStr}:${sStr}`;
}

// Parse formatted timestamp string to seconds
function parseTimeToSeconds(timeStr) {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

// Call backend POST /api/video
async function initializeVideoInBackend(videoUrl) {
  const response = await fetch(`${BACKEND_URL}/api/video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: videoUrl })
  });
  if (!response.ok) throw new Error('Failed to register video');
  const data = await response.json();
  return data.video;
}

// Injects floating trigger and side drawer
function injectFloatingWidget() {
  // Remove existing widget if any
  document.getElementById('noter-widget-root')?.remove();
  document.getElementById('noter-drawer-root')?.remove();

  // 1. Floating Trigger Button
  const trigger = document.createElement('div');
  trigger.id = 'noter-widget-root';
  trigger.className = 'noter-widget-trigger';
  trigger.innerHTML = '📝';
  trigger.title = 'Open Noter Notes';
  document.body.appendChild(trigger);

  // 2. Side Drawer
  const drawer = document.createElement('div');
  drawer.id = 'noter-drawer-root';
  drawer.className = 'noter-side-drawer';
  drawer.innerHTML = `
    <div class="noter-drawer-header">
      <h3 class="noter-drawer-title">Noter Live Widget</h3>
      <button class="noter-drawer-close" id="noter-close-btn">&times;</button>
    </div>
    <div class="noter-drawer-content">
      <!-- Tab Selection -->
      <div style="display:flex; gap:8px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:10px;">
        <button id="noter-tab-edit" style="flex:1; background:rgba(255,255,255,0.1); border:none; padding:8px; color:white; border-radius:6px; font-weight:600; cursor:pointer;">Edit Notes</button>
        <button id="noter-tab-preview" style="flex:1; background:transparent; border:none; padding:8px; color:#94a3b8; border-radius:6px; font-weight:600; cursor:pointer;">Preview</button>
      </div>

      <!-- Action Toolbar -->
      <div class="noter-toolbar">
        <button class="noter-btn" id="noter-btn-screenshot" title="Capture current frame">
          <span class="noter-btn-icon">📸</span>
          <span>Screenshot</span>
        </button>
        <button class="noter-btn" id="noter-btn-pin" title="Pin current timestamp">
          <span class="noter-btn-icon">📌</span>
          <span>Pin Time</span>
        </button>
        <button class="noter-btn" id="noter-btn-ai" title="AI summarize last 60s">
          <span class="noter-btn-icon">🤖</span>
          <span>AI Insight</span>
        </button>
      </div>

      <!-- Editor Mode -->
      <div class="noter-editor-container" id="noter-container-edit">
        <label>Markdown Editor</label>
        <textarea class="noter-textarea" id="noter-notes-editor" placeholder="Write your notes here... Use [[MM:SS]] for clickable timestamps."></textarea>
      </div>

      <!-- Preview Mode -->
      <div class="noter-editor-container" id="noter-container-preview" style="display:none; overflow-y:auto; flex:1; max-height:calc(100vh - 220px);">
        <label>Notes Preview</label>
        <div id="noter-preview-content" style="padding:10px; background:rgba(0,0,0,0.2); border-radius:8px; border:1px solid rgba(255,255,255,0.05); font-size:14px; line-height:1.6; color:#e2e8f0; overflow-x:auto;"></div>
      </div>
    </div>
    <div class="noter-drawer-footer">
      <div class="noter-save-status">
        <span class="noter-status-dot" id="noter-status-dot"></span>
        <span id="noter-status-text">Saved</span>
      </div>
      <a href="http://localhost:5173/video/${activeVideoId}" target="_blank" style="color:#60a5fa; text-decoration:none; font-weight:600;">Open Dashboard &rarr;</a>
    </div>
    <div class="noter-toast" id="noter-toast">Screenshot uploaded!</div>
  `;
  document.body.appendChild(drawer);

  // Setup Event Listeners
  trigger.addEventListener('click', toggleDrawer);
  document.getElementById('noter-close-btn').addEventListener('click', closeDrawer);
  
  // Tab Switchers
  const tabEdit = document.getElementById('noter-tab-edit');
  const tabPreview = document.getElementById('noter-tab-preview');
  const containerEdit = document.getElementById('noter-container-edit');
  const containerPreview = document.getElementById('noter-container-preview');

  tabEdit.addEventListener('click', () => {
    tabEdit.style.background = 'rgba(255,255,255,0.1)';
    tabEdit.style.color = 'white';
    tabPreview.style.background = 'transparent';
    tabPreview.style.color = '#94a3b8';
    containerEdit.style.display = 'flex';
    containerPreview.style.display = 'none';
  });

  tabPreview.addEventListener('click', () => {
    tabPreview.style.background = 'rgba(255,255,255,0.1)';
    tabPreview.style.color = 'white';
    tabEdit.style.background = 'transparent';
    tabEdit.style.color = '#94a3b8';
    containerEdit.style.display = 'none';
    containerPreview.style.display = 'block';
    renderPreview();
  });

  // Editor Actions
  document.getElementById('noter-btn-screenshot').addEventListener('click', captureFrame);
  document.getElementById('noter-btn-pin').addEventListener('click', pinTimestamp);
  document.getElementById('noter-btn-ai').addEventListener('click', triggerAIInsight);
  
  // Editor Change listener for auto-save
  const editor = document.getElementById('noter-notes-editor');
  editor.addEventListener('input', () => {
    setSavingStatus(true);
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveNotes, 1000);
  });
}

function toggleDrawer() {
  const drawer = document.getElementById('noter-drawer-root');
  drawer.classList.toggle('open');
}

function closeDrawer() {
  const drawer = document.getElementById('noter-drawer-root');
  drawer.classList.remove('open');
}

// Load existing notes from backend
async function loadNotes() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/notes/${activeVideoId}`);
    if (response.ok) {
      const data = await response.json();
      const editor = document.getElementById('noter-notes-editor');
      if (editor && data.notes) {
        editor.value = data.notes.markdownContent || '';
      }
    }
  } catch (err) {
    console.error('[Noter] Error loading notes:', err);
  }
}

// Save notes to backend
async function saveNotes() {
  const editor = document.getElementById('noter-notes-editor');
  if (!editor || !activeVideoId) return;

  const markdownContent = editor.value;

  try {
    const response = await fetch(`${BACKEND_URL}/api/notes/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: activeVideoId, markdownContent })
    });
    if (response.ok) {
      setSavingStatus(false);
    }
  } catch (err) {
    console.error('[Noter] Save failed:', err);
    setSavingStatus(false, 'Save Failed');
  }
}

// Helper to show/hide save state
function setSavingStatus(isSaving, customText = '') {
  const dot = document.getElementById('noter-status-dot');
  const text = document.getElementById('noter-status-text');
  if (!dot || !text) return;

  if (isSaving) {
    dot.className = 'noter-status-dot saving';
    text.innerText = 'Saving...';
  } else {
    dot.className = 'noter-status-dot';
    text.innerText = customText || 'Saved';
  }
}

// Capture current video frame and upload to R2
async function captureFrame() {
  const video = document.querySelector('video');
  if (!video) {
    showToast('❌ No video element found');
    return;
  }

  const time = video.currentTime;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  showToast('📸 Capturing frame...');

  canvas.toBlob(async (blob) => {
    if (!blob) {
      showToast('❌ Frame capture failed');
      return;
    }

    const formData = new FormData();
    formData.append('videoId', activeVideoId);
    formData.append('timestamp', time);
    formData.append('screenshot', blob, 'screenshot.png');

    try {
      const response = await fetch(`${BACKEND_URL}/api/screenshot`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      
      // Inject markdown image link into text area
      const editor = document.getElementById('noter-notes-editor');
      const timeFormatted = formatTime(time);
      const markdownImage = `\n\n![Screenshot at ${timeFormatted}](${data.screenshot.r2Url})\n\n`;
      
      insertTextAtCursor(editor, markdownImage);
      showToast('📸 Screenshot added to notes!');
      saveNotes();
    } catch (err) {
      console.error('[Noter] Screenshot upload failed:', err);
      showToast('⚠️ R2 Storage is Unavailable');
    }
  }, 'image/png');
}

// Insert timestamp pin e.g. [[12:42]]
function pinTimestamp() {
  const video = document.querySelector('video');
  if (!video) {
    showToast('❌ No video element found');
    return;
  }

  const time = video.currentTime;
  const pin = ` [[${formatTime(time)}]] `;
  const editor = document.getElementById('noter-notes-editor');
  
  insertTextAtCursor(editor, pin);
  showToast('📌 Timestamp pin dropped!');
  saveNotes();
}

// Trigger AI Insight for the last 60 seconds
async function triggerAIInsight() {
  const video = document.querySelector('video');
  if (!video) {
    showToast('❌ No video element found');
    return;
  }

  const time = video.currentTime;
  showToast('🤖 AI is thinking...');

  try {
    const response = await fetch(`${BACKEND_URL}/api/notes/ai-quick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: activeVideoId, currentTime: time })
    });

    if (!response.ok) throw new Error('AI request failed');
    const data = await response.json();

    const editor = document.getElementById('noter-notes-editor');
    const aiInsightBlock = `\n\n> **AI Insight [[${formatTime(time)}]]:** *${data.summary}*\n\n`;
    
    insertTextAtCursor(editor, aiInsightBlock);
    showToast('🤖 AI note inserted!');
    saveNotes();
  } catch (err) {
    console.error('[Noter] Quick AI request failed:', err);
    showToast('❌ AI Processing failed');
  }
}

// Helper to insert text at the cursor position
function insertTextAtCursor(textarea, text) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const originalVal = textarea.value;

  textarea.value = originalVal.substring(0, start) + text + originalVal.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  textarea.focus();
}

// Renders markdown as basic preview, converting [[MM:SS]] into seek links
function renderPreview() {
  const editor = document.getElementById('noter-notes-editor');
  const previewDiv = document.getElementById('noter-preview-content');
  if (!editor || !previewDiv) return;

  let text = editor.value;

  // Simple HTML sanitizer/escaping
  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Convert image markdown ![alt](url) to HTML images
  text = text.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:100%; border-radius:6px; margin:8px 0; border:1px solid rgba(255,255,255,0.1);" />');

  // Convert [[MM:SS]] or [[HH:MM:SS]] to clickable seek links
  text = text.replace(/\[\[((\d{1,2}:)?\d{1,2}:\d{2})\]\]/g, (match, timeStr) => {
    return `<a href="#" class="noter-seek-link" data-time="${timeStr}" style="color:#60a5fa; text-decoration:underline; font-weight:bold;">[[${timeStr}]]</a>`;
  });

  // Basic paragraph double-newlines to breaks
  text = text.replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>');

  // Blockquotes styling
  text = text.replace(/&gt;\s*\*\*(.*?)\*\*(.*?)(<br\/>|$)/g, '<blockquote style="border-left:3px solid #8b5cf6; padding-left:10px; margin:10px 0; color:#c084fc;"><strong>$1</strong>$2</blockquote>');

  previewDiv.innerHTML = text || '<em style="color:#64748b;">No notes drafted yet. Click Edit to add some!</em>';

  // Attach click seeking listeners to seek links
  previewDiv.querySelectorAll('.noter-seek-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const timeStr = link.getAttribute('data-time');
      seekVideoToTime(timeStr);
    });
  });
}

// Seeks YouTube Player to time
function seekVideoToTime(timeStr) {
  const seconds = parseTimeToSeconds(timeStr);
  const video = document.querySelector('video');
  if (video) {
    video.currentTime = seconds;
    video.play();
    showToast(`Seeked to ${timeStr}`);
  }
}

// Show micro-notification toast
function showToast(message) {
  const toast = document.getElementById('noter-toast');
  if (!toast) return;
  toast.innerText = message;
  toast.className = 'noter-toast show';
  
  setTimeout(() => {
    if (toast.innerText === message) {
      toast.className = 'noter-toast';
    }
  }, 3000);
}
