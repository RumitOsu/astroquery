// ========== Star Background ==========
(function initStars() {
  const canvas = document.getElementById("stars");
  const ctx = canvas.getContext("2d");
  let stars = [];
  const STAR_COUNT = 200;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.8 + 0.2,
        drift: Math.random() * 0.3 + 0.05,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const time = Date.now() * 0.001;
    for (const s of stars) {
      const alpha = s.alpha * (0.6 + 0.4 * Math.sin(time * s.twinkleSpeed * 10 + s.twinklePhase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 210, 255, ${alpha})`;
      ctx.fill();
      s.y -= s.drift * 0.15;
      if (s.y < -5) { s.y = canvas.height + 5; s.x = Math.random() * canvas.width; }
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", () => { resize(); createStars(); });
  resize();
  createStars();
  draw();
})();

// ========== Simple Markdown Parser ==========
function renderMarkdown(text) {
  let html = text
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Line breaks to paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap list items
  html = html.replace(/(<li>.*?<\/li>(\s*<br>)?)+/g, (match) => `<ul>${match.replace(/<br>/g, '')}</ul>`);

  // Wrap in paragraphs
  html = `<p>${html}</p>`;

  // Clean empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>\s*(<h[1-3]>)/g, '$1');
  html = html.replace(/(<\/h[1-3]>)\s*<\/p>/g, '$1');
  html = html.replace(/<p>\s*(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)\s*<\/p>/g, '$1');
  html = html.replace(/<p>\s*(<pre>)/g, '$1');
  html = html.replace(/(<\/pre>)\s*<\/p>/g, '$1');
  html = html.replace(/<p>\s*(<hr>)\s*<\/p>/g, '$1');

  return html;
}

// ========== App State ==========
let sessionId = null;
let isStreaming = false;

const chatContainer = document.getElementById("chat-container");
const messagesEl = document.getElementById("messages");
const welcomeEl = document.getElementById("welcome");
const form = document.getElementById("chat-form");
const input = document.getElementById("message-input");
const sendBtn = document.getElementById("btn-send");
const clearBtn = document.getElementById("btn-clear");
const statusEl = document.getElementById("status");

// ========== Session Management ==========
async function createSession() {
  try {
    const res = await fetch("/api/session", { method: "POST" });
    const data = await res.json();
    sessionId = data.sessionId;
    statusEl.classList.add("connected");
    statusEl.querySelector(".status-text").textContent = "Ready";
  } catch (err) {
    statusEl.querySelector(".status-text").textContent = "Connection failed";
    console.error("Session creation failed:", err);
  }
}

// ========== Message Rendering ==========
function addUserMessage(text) {
  welcomeEl.classList.add("hidden");
  const msg = document.createElement("div");
  msg.className = "message user";
  msg.innerHTML = `
    <div class="message-avatar">👤</div>
    <div class="message-content">
      <div class="message-text">${escapeHtml(text)}</div>
    </div>
  `;
  messagesEl.appendChild(msg);
  scrollToBottom();
}

function createAssistantMessage() {
  const msg = document.createElement("div");
  msg.className = "message assistant";
  msg.innerHTML = `
    <div class="message-avatar">🪐</div>
    <div class="message-content">
      <div class="tool-indicators"></div>
      <div class="message-text">
        <div class="typing-indicator"><span></span><span></span><span></span></div>
      </div>
    </div>
  `;
  messagesEl.appendChild(msg);
  scrollToBottom();
  return msg;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function scrollToBottom() {
  chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
}

const TOOL_META = {
  AstroCalculator: { class: "calc", icon: "🧮", label: "Calculator" },
  SpaceSearch: { class: "search", icon: "🔍", label: "Web Search" },
  CosmicLibrary: { class: "rag", icon: "📚", label: "Knowledge Base" },
  UnitConverter: { class: "unit", icon: "📐", label: "Unit Converter" },
};

function addToolIndicator(msgEl, toolName) {
  const indicators = msgEl.querySelector(".tool-indicators");
  const meta = TOOL_META[toolName] || { class: "calc", icon: "⚙️", label: toolName };
  const indicator = document.createElement("span");
  indicator.className = `tool-indicator ${meta.class}`;
  indicator.id = `tool-${toolName}-${Date.now()}`;
  indicator.innerHTML = `<span class="spinner"></span> ${meta.icon} ${meta.label}`;
  indicators.appendChild(indicator);
  return indicator;
}

// ========== Streaming Chat ==========
async function sendMessage(text) {
  if (isStreaming || !text.trim()) return;
  isStreaming = true;
  sendBtn.disabled = true;
  input.value = "";
  input.style.height = "auto";

  addUserMessage(text);
  const msgEl = createAssistantMessage();
  const textEl = msgEl.querySelector(".message-text");
  let currentIndicator = null;
  let fullText = "";

  try {
    const res = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message: text }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = JSON.parse(line.slice(6));

        if (data.type === "tool_call") {
          currentIndicator = addToolIndicator(msgEl, data.name);
          scrollToBottom();
        }

        if (data.type === "tool_result" && currentIndicator) {
          currentIndicator.classList.add("done");
          currentIndicator = null;
        }

        if (data.type === "token") {
          if (fullText === "") {
            // Remove typing indicator
            const typing = textEl.querySelector(".typing-indicator");
            if (typing) typing.remove();
          }
          fullText += data.content;
          textEl.innerHTML = renderMarkdown(fullText);
          scrollToBottom();
        }

        if (data.type === "error") {
          textEl.innerHTML = `<p style="color: var(--error);">Error: ${escapeHtml(data.content)}</p>`;
        }

        if (data.type === "done" && fullText === "") {
          // Agent responded but no tokens streamed (shouldn't normally happen)
          const typing = textEl.querySelector(".typing-indicator");
          if (typing) typing.remove();
          textEl.innerHTML = "<p>I processed your request but didn't generate a text response. Please try rephrasing your question.</p>";
        }
      }
    }
  } catch (err) {
    console.error("Stream error:", err);
    const textEl2 = msgEl.querySelector(".message-text");
    textEl2.innerHTML = `<p style="color: var(--error);">Connection error. Please try again.</p>`;
  }

  isStreaming = false;
  sendBtn.disabled = !input.value.trim();
  scrollToBottom();
}

// ========== Event Listeners ==========
form.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage(input.value);
});

input.addEventListener("input", () => {
  sendBtn.disabled = !input.value.trim() || isStreaming;
  // Auto-resize textarea
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 150) + "px";
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!isStreaming && input.value.trim()) sendMessage(input.value);
  }
});

clearBtn.addEventListener("click", async () => {
  messagesEl.innerHTML = "";
  welcomeEl.classList.remove("hidden");
  await createSession();
});

document.querySelectorAll(".suggestion").forEach((btn) => {
  btn.addEventListener("click", () => {
    const query = btn.getAttribute("data-query");
    sendMessage(query);
  });
});

// ========== Init ==========
createSession();
