import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { initAgent, chatStream } from "./agent/index.js";
import logger from "./logger.js";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", agent: "AstroQuery", uptime: process.uptime() });
});

// Create a new session
app.post("/api/session", (_req, res) => {
  const sessionId = uuidv4();
  logger.info("New session", { sessionId: sessionId.slice(0, 8) });
  res.json({ sessionId });
});

// Non-streaming chat endpoint (fallback)
app.post("/api/chat", async (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessionId || !message) {
    return res.status(400).json({ error: "sessionId and message are required" });
  }

  try {
    let fullResponse = "";
    const tools = [];
    for await (const event of chatStream(sessionId, message)) {
      if (event.type === "token") fullResponse += event.content;
      if (event.type === "tool_call") tools.push(event.name);
    }
    res.json({ response: fullResponse, tools });
  } catch (err) {
    logger.error("Chat error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Streaming chat endpoint (SSE) — use raw node response to avoid Express buffering
app.post("/api/chat/stream", async (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessionId || !message) {
    return res.status(400).json({ error: "sessionId and message are required" });
  }

  // Access the underlying node http.ServerResponse
  const nodeRes = res;

  // Write headers directly and flush
  nodeRes.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  // Flush headers immediately
  nodeRes.flushHeaders();

  let closed = false;
  req.on("close", () => { closed = true; });

  function send(data) {
    if (closed) return;
    nodeRes.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    for await (const event of chatStream(sessionId, message)) {
      if (closed) break;
      send(event);
    }
    send({ type: "done" });
  } catch (err) {
    logger.error("Stream error", {
      sessionId: sessionId.slice(0, 8),
      error: err.message,
    });
    send({ type: "error", content: err.message });
  }
  nodeRes.end();
});

// Start
async function start() {
  if (!process.env.OPENAI_API_KEY) {
    logger.error("OPENAI_API_KEY is not set. Create a .env file from .env.example");
    process.exit(1);
  }
  if (!process.env.TAVILY_API_KEY) {
    logger.warn("TAVILY_API_KEY is not set. SpaceSearch tool will not work.");
  }

  try {
    logger.info("Starting AstroQuery...");
    await initAgent();
    app.listen(PORT, () => {
      logger.info(`AstroQuery is live at http://localhost:${PORT}`);
    });
  } catch (err) {
    logger.error("Failed to start", { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

start();
