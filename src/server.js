import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { initAgent, chat, chatStream } from "./agent/index.js";
import logger from "./logger.js";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", agent: "AstroQuery" });
});

// Create a new session
app.post("/api/session", (req, res) => {
  const sessionId = uuidv4();
  logger.info("New session created", { sessionId });
  res.json({ sessionId });
});

// Non-streaming chat endpoint
app.post("/api/chat", async (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessionId || !message) {
    return res.status(400).json({ error: "sessionId and message are required" });
  }

  try {
    const response = await chat(sessionId, message);
    res.json({ response });
  } catch (err) {
    logger.error("Chat error", { sessionId, error: err.message });
    res.status(500).json({ error: "Agent error: " + err.message });
  }
});

// Streaming chat endpoint (SSE)
app.post("/api/chat/stream", async (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessionId || !message) {
    return res.status(400).json({ error: "sessionId and message are required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    for await (const event of chatStream(sessionId, message)) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (err) {
    logger.error("Stream error", { sessionId, error: err.message });
    res.write(`data: ${JSON.stringify({ type: "error", content: err.message })}\n\n`);
    res.end();
  }
});

// Start server
async function start() {
  try {
    await initAgent();
    app.listen(PORT, () => {
      logger.info(`AstroQuery server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    logger.error("Failed to start server", { error: err.message });
    process.exit(1);
  }
}

start();
