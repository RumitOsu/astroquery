# AstroQuery — AI Instructions

## Project Overview
Multi-tool AI chatbot agent for space/astronomy using LangChain.js ReAct pattern.

## Stack
- Node.js + Express backend
- LangChain.js + LangGraph (ReAct agent) with OpenAI GPT-4o-mini
- Vanilla HTML/CSS/JS frontend with typewriter effect
- OpenAI embeddings + MemoryVectorStore for RAG
- Tavily API for web search
- Winston for structured logging

## Key Commands
- `npm start` — run production server
- `npm run dev` — run with --watch for auto-restart
- `npm run ingest` — build/rebuild vector store from documents

## Architecture
- `src/server.js` — Express server, REST + SSE endpoints
- `src/agent/index.js` — LangChain ReAct agent, conversation memory
- `src/agent/tools/` — five tools (calculator, webSearch, ragTool, unitConverter, cosmicScale)
- `src/rag/ingest.js` — document ingestion pipeline
- `src/rag/documents/` — 7 curated markdown docs
- `src/public/` — frontend (index.html, style.css, app.js)

## Conventions
- ES modules (`"type": "module"` in package.json)
- Tools use `@langchain/core/tools` `tool()` function with zod schemas
- All tools log invocations and results via Winston logger
- Frontend uses no framework — vanilla JS with typewriter effect for response display
