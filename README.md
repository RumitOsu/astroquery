# AstroQuery — Space & Astronomy AI Explorer

A multi-tool AI chatbot agent built with **LangChain.js** that uses the **ReAct pattern** to help users explore space and astronomy. It autonomously decides which tools to invoke — math, web search, knowledge retrieval, or unit conversion — and chains them together to answer complex questions about the cosmos.

![AstroQuery](https://img.shields.io/badge/LangChain.js-ReAct_Agent-blue) ![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-purple)

## Features

- **AstroCalculator** — Evaluates math with 13 built-in astronomical constants (speed of light, AU, parsec, solar mass, etc.)
- **SpaceSearch** — Real-time web search via Tavily for current space news and discoveries
- **CosmicLibrary** (RAG) — Vector search over 7 curated astronomy documents (~15k words) with source attribution
- **UnitConverter** — Converts between astronomical distance and mass units
- **Conversation Memory** — Multi-turn context with a 20-message sliding window
- **Streaming UI** — Server-Sent Events for real-time token streaming with tool call indicators
- **Persistent Vector Store** — Embeddings are cached to disk and survive server restarts

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Agent Framework | LangChain.js + LangGraph (ReAct agent) |
| LLM | OpenAI GPT-4o-mini |
| Embeddings | OpenAI text-embedding-3-small |
| Web Search | Tavily API |
| Vector Store | MemoryVectorStore (persisted to JSON) |
| Backend | Node.js + Express |
| Frontend | Vanilla HTML/CSS/JS with SSE |
| Logging | Winston (structured JSON) |

## Getting Started

### Prerequisites
- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)
- A [Tavily API key](https://tavily.com) (free tier available)

### Installation

```bash
# Clone the repo
git clone https://github.com/RumitOsu/astroquery.git
cd astroquery

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your API keys:
#   OPENAI_API_KEY=sk-...
#   TAVILY_API_KEY=tvly-...

# Build the vector store (first time only — persists to disk)
npm run ingest

# Start the server
npm start
```

Then open **http://localhost:3000** in your browser.

### Development

```bash
npm run dev   # auto-restart on file changes
```

## Project Structure

```
astroquery/
├── docs/
│   ├── prd.md              # Product requirements document
│   ├── roadmap.md          # Development roadmap with progress
│   └── agent-proposal.md   # Agent pattern proposal (stretch)
├── src/
│   ├── server.js           # Express server + SSE streaming
│   ├── logger.js           # Winston structured logging
│   ├── agent/
│   │   ├── index.js        # LangChain ReAct agent + memory
│   │   └── tools/
│   │       ├── calculator.js    # AstroCalculator (mathjs + constants)
│   │       ├── webSearch.js     # SpaceSearch (Tavily)
│   │       ├── ragTool.js       # CosmicLibrary (RAG with citations)
│   │       └── unitConverter.js # UnitConverter (stretch)
│   ├── rag/
│   │   ├── ingest.js       # Document chunking + embedding
│   │   └── documents/      # 7 curated astronomy docs (markdown)
│   └── public/
│       ├── index.html       # Chat UI
│       ├── style.css        # Dark cosmic theme
│       └── app.js           # Frontend logic + SSE client
├── context.md              # AI tool orientation
├── .env.example            # Environment template
├── .gitignore
├── package.json
└── README.md
```

## Tools in Action

### AstroCalculator
> "How long does it take light to travel from the Sun to Earth?"

Uses `mathjs` with the constant `AU / c` to compute ~499 seconds (8.3 minutes).

### SpaceSearch
> "What's the latest news from the James Webb Space Telescope?"

Searches the web via Tavily and returns current articles with titles, snippets, and source URLs.

### CosmicLibrary (RAG)
> "What methods do scientists use to detect exoplanets?"

Retrieves relevant passages from the curated knowledge base with source attribution like:
*📄 Exoplanet Discovery and Characterization › Detection Methods*

### UnitConverter
> "Convert 4.24 light-years to kilometers"

Returns `4.24 ly = 4.0115e+13 km`

## Logging

The server outputs structured logs showing tool calls, arguments, and results:

```
[14:32:01] info: AstroCalculator invoked
  { "tool": "AstroCalculator", "expression": "AU / c" }
[14:32:01] info: AstroCalculator result
  { "tool": "AstroCalculator", "expression": "AU / c", "result": "499.0047..." }
```

## License

MIT
