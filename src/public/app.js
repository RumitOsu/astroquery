// ========== Star Background ==========
(function initStarfield() {
  const canvas = document.getElementById("stars");
  const ctx = canvas.getContext("2d");
  let stars = [];
  const COUNT = 280;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function create() {
    stars = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.2,
      alpha: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 0.15 + 0.02,
      twinkle: Math.random() * 0.015 + 0.003,
      phase: Math.random() * Math.PI * 2,
      hue: Math.random() > 0.85 ? 240 + Math.random() * 40 : 220 + Math.random() * 20,
    }));
  }

  function draw(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of stars) {
      const a = s.alpha * (0.5 + 0.5 * Math.sin(t * s.twinkle + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${s.hue}, 60%, 85%, ${a})`;
      ctx.fill();
      // Very subtle glow on brighter stars
      if (s.r > 1) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 60%, 85%, ${a * 0.08})`;
        ctx.fill();
      }
      s.y -= s.speed * 0.12;
      if (s.y < -5) { s.y = canvas.height + 5; s.x = Math.random() * canvas.width; }
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", () => { resize(); create(); });
  resize();
  create();
  requestAnimationFrame(draw);
})();

// ========== Shooting Stars ==========
(function initShootingStars() {
  const canvas = document.getElementById("shooting-stars");
  const ctx = canvas.getContext("2d");
  let shooters = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function spawn() {
    if (Math.random() > 0.003 || shooters.length >= 3) return;
    const x = Math.random() * canvas.width * 0.8;
    const y = Math.random() * canvas.height * 0.4;
    const angle = Math.PI / 4 + Math.random() * 0.3;
    shooters.push({
      x, y, angle,
      speed: 6 + Math.random() * 6,
      length: 60 + Math.random() * 80,
      life: 1,
      decay: 0.015 + Math.random() * 0.01,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    spawn();
    shooters = shooters.filter((s) => {
      s.x += Math.cos(s.angle) * s.speed;
      s.y += Math.sin(s.angle) * s.speed;
      s.life -= s.decay;
      if (s.life <= 0) return false;

      const tailX = s.x - Math.cos(s.angle) * s.length;
      const tailY = s.y - Math.sin(s.angle) * s.length;
      const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
      grad.addColorStop(0, `rgba(200, 210, 255, 0)`);
      grad.addColorStop(0.6, `rgba(200, 210, 255, ${s.life * 0.3})`);
      grad.addColorStop(1, `rgba(220, 225, 255, ${s.life * 0.8})`);
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(s.x, s.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Head glow
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 225, 255, ${s.life * 0.9})`;
      ctx.fill();
      return true;
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(draw);
})();

// ========== Markdown Rendering ==========
function renderMarkdown(text) {
  let html;
  if (typeof marked !== "undefined") {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
    try {
      html = marked.parse(text);
    } catch {
      html = escapeHtml(text).replace(/\n/g, "<br>");
    }
  } else {
    // Fallback
    html = escapeHtml(text)
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }
  // Strip any script/iframe tags for safety
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
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

// ========== Session ==========
async function createSession(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch("/api/session", { method: "POST" });
      const data = await res.json();
      sessionId = data.sessionId;
      statusEl.classList.add("connected");
      statusEl.querySelector(".status-text").textContent = "Online";
      sendBtn.disabled = !input.value.trim();
      return;
    } catch {
      if (i < retries - 1) await new Promise(r => setTimeout(r, 1500));
    }
  }
  statusEl.querySelector(".status-text").textContent = "Offline";
}

// ========== Messages ==========
function escapeHtml(text) {
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
  });
}

function timeStr() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function addUserMessage(text) {
  welcomeEl.classList.add("hidden");
  const msg = document.createElement("div");
  msg.className = "message user";
  msg.innerHTML = `
    <div class="message-avatar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    </div>
    <div class="message-content">
      <div class="message-text">${escapeHtml(text)}</div>
      <div class="message-meta">${timeStr()}</div>
    </div>
  `;
  messagesEl.appendChild(msg);
  scrollToBottom();
}

function createAssistantMessage() {
  const msg = document.createElement("div");
  msg.className = "message assistant";
  msg.innerHTML = `
    <div class="message-avatar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>
    </div>
    <div class="message-content">
      <div class="tool-indicators"></div>
      <div class="message-text">
        <div class="thinking-indicator">
          <div class="thinking-dots"><span></span><span></span><span></span></div>
          <span>Thinking...</span>
        </div>
      </div>
      <div class="message-actions" style="display:none">
        <button class="btn-copy" title="Copy response">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span>Copy</span>
        </button>
        <span class="message-meta">${timeStr()}</span>
      </div>
    </div>
  `;
  messagesEl.appendChild(msg);
  scrollToBottom();
  return msg;
}

// ========== Tool Cards ==========
const TOOL_META = {
  AstroCalculator: { cls: "calc", icon: "🧮", label: "Calculator" },
  SpaceSearch: { cls: "search", icon: "🔍", label: "Web Search" },
  CosmicLibrary: { cls: "rag", icon: "📚", label: "Knowledge Base" },
  UnitConverter: { cls: "unit", icon: "📐", label: "Unit Converter" },
  CosmicScale: { cls: "scale", icon: "🔬", label: "Scale Comparator" },
};

function addToolCard(msgEl, toolName, args) {
  const indicators = msgEl.querySelector(".tool-indicators");
  const meta = TOOL_META[toolName] || { cls: "calc", icon: "⚙️", label: toolName };

  // Format args for display
  let argsStr = "";
  if (args) {
    const vals = Object.values(args);
    argsStr = vals.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join(", ");
    if (argsStr.length > 60) argsStr = argsStr.slice(0, 57) + "...";
  }

  const card = document.createElement("div");
  card.className = `tool-card ${meta.cls}`;
  card.innerHTML = `
    <span class="tool-card-icon">${meta.icon}</span>
    <div class="tool-card-info">
      <span class="tool-card-name">${meta.label}</span>
      ${argsStr ? `<span class="tool-card-args">${escapeHtml(argsStr)}</span>` : ""}
    </div>
    <span class="spinner"></span>
    <span class="check-icon">✓</span>
    <div class="tool-card-result"></div>
  `;

  card.addEventListener("click", () => {
    if (card.classList.contains("done")) {
      card.classList.toggle("expanded");
    }
  });

  indicators.appendChild(card);
  scrollToBottom();
  return card;
}

// ========== Typewriter effect ==========
function typewriter(textEl, fullText, onDone) {
  const words = fullText.split(/(\s+)/);
  let shown = "";
  let i = 0;
  const speed = 12; // ms per word chunk

  function tick() {
    if (i >= words.length) {
      textEl.classList.remove("streaming-cursor");
      textEl.innerHTML = renderMarkdown(fullText);
      scrollToBottom();
      if (onDone) onDone();
      return;
    }
    // Show 2-3 words at a time for natural feel
    const chunk = words.slice(i, i + 3).join("");
    shown += chunk;
    i += 3;
    textEl.innerHTML = renderMarkdown(shown);
    textEl.classList.add("streaming-cursor");
    scrollToBottom();
    setTimeout(tick, speed);
  }
  tick();
}

// ========== Send Message ==========
async function sendMessage(text) {
  if (isStreaming || !text.trim()) return;
  if (!sessionId) {
    await createSession();
    if (!sessionId) return;
  }
  isStreaming = true;
  sendBtn.disabled = true;
  input.value = "";
  input.style.height = "auto";

  addUserMessage(text);
  const msgEl = createAssistantMessage();
  const textEl = msgEl.querySelector(".message-text");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message: text }),
    });

    const data = await res.json();

    if (data.error) {
      textEl.innerHTML = `<p style="color: var(--error);">Error: ${escapeHtml(data.error)}</p>`;
      isStreaming = false;
      sendBtn.disabled = !input.value.trim();
      return;
    }

    // Show tool cards
    if (data.tools && data.tools.length > 0) {
      for (const toolName of data.tools) {
        const card = addToolCard(msgEl, toolName, null);
        card.classList.add("done");
      }
    }

    // Typewriter the response
    textEl.innerHTML = "";
    const fullText = data.response || "No response generated.";

    typewriter(textEl, fullText, () => {
      // Show actions bar
      const actions = msgEl.querySelector(".message-actions");
      if (actions) {
        actions.style.display = "";
        const copyBtn = actions.querySelector(".btn-copy");
        copyBtn.addEventListener("click", () => {
          navigator.clipboard.writeText(fullText).then(() => {
            copyBtn.querySelector("span").textContent = "Copied!";
            setTimeout(() => { copyBtn.querySelector("span").textContent = "Copy"; }, 2000);
          });
        });
      }
      isStreaming = false;
      sendBtn.disabled = !input.value.trim();
      scrollToBottom();
      input.focus();
    });
  } catch (err) {
    console.error("Chat error:", err);
    textEl.innerHTML = `<p style="color: var(--error);">Connection error. Please check the server and try again.</p>`;
    isStreaming = false;
    sendBtn.disabled = !input.value.trim();
  }
}

// ========== Event Listeners ==========
form.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage(input.value);
});

input.addEventListener("input", () => {
  sendBtn.disabled = !input.value.trim() || isStreaming;
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
  btn.addEventListener("click", () => sendMessage(btn.dataset.query));
});

// ========== Init ==========
createSession();
