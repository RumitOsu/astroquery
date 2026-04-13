# AstroQuery — Project Context

## What This Is
AstroQuery is a multi-tool AI chatbot agent built with LangChain.js that helps users explore space and astronomy. It uses the ReAct (Reasoning + Acting) pattern to decide which tools to invoke based on user queries.

## Architecture
- **Runtime**: Node.js + Express
- **Agent Framework**: LangChain.js with OpenAI function-calling agent
- **Frontend**: Vanilla HTML/CSS/JS with Server-Sent Events for streaming
- **Vector Store**: In-memory vector store with OpenAI embeddings (persisted to disk)

## Tools
1. **AstroCalculator** — evaluates math expressions with built-in astronomical constants (speed of light, AU, parsec, solar mass, etc.)
2. **SpaceSearch** — searches the web via Tavily API for current space news, mission updates, and astronomical events
3. **CosmicLibrary** — RAG tool that searches a curated vector store of 7 astronomy documents covering the solar system, stellar physics, exoplanets, mission history, cosmology, black holes, and space weather
4. **UnitConverter** (stretch) — converts between astronomical units (light-years, parsecs, AU, km, miles, etc.)

## Key Files
- `src/server.js` — Express server with SSE streaming endpoint
- `src/agent/index.js` — LangChain agent setup with ReAct pattern
- `src/agent/tools/` — individual tool implementations
- `src/rag/ingest.js` — document ingestion into vector store
- `src/rag/documents/` — source astronomy documents (7 markdown files)
- `src/public/` — frontend UI (HTML, CSS, JS)
- `src/logger.js` — structured Winston logger

## Running
```bash
cp .env.example .env  # add your API keys
npm run ingest         # build the vector store
npm start              # launch on http://localhost:3000
```
