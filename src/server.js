import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { initAgent, chatStream, clearHistory } from "./agent/index.js";
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

// Streaming chat endpoint (SSE)
app.post("/api/chat/stream", async (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessionId || !message) {
    return res.status(400).json({ error: "sessionId and message are required" });
  }

  if (message.length > 2000) {
    return res.status(400).json({ error: "Message too long (max 2000 characters)" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  // Handle client disconnect
  let closed = false;
  req.on("close", () => { closed = true; });

  try {
    for await (const event of chatStream(sessionId, message)) {
      if (closed) break;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
    if (!closed) {
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    }
  } catch (err) {
    logger.error("Stream error", {
      sessionId: sessionId.slice(0, 8),
      error: err.message,
      stack: err.stack?.split("\n").slice(0, 3).join(" | "),
    });
    if (!closed) {
      res.write(`data: ${JSON.stringify({ type: "error", content: err.message })}\n\n`);
    }
  }
  res.end();
});

// Start server
async function start() {
  // Validate environment
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
