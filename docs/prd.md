# AstroQuery — Product Requirements Document

## Problem Statement
Space and astronomy are endlessly fascinating, but the information landscape is fragmented. NASA papers, Wikipedia, news articles, and textbooks each cover different slices. A casual learner asking "How far is the nearest exoplanet and could we ever reach it?" needs to mentally stitch together unit conversions, current mission data, and astrophysics concepts. There's no single conversational interface that combines real-time search, domain-specific calculation, and curated knowledge retrieval in one place.

## Solution
AstroQuery is a conversational AI agent that acts as a personal astronomy research assistant. It autonomously decides whether a question needs math, a web lookup, or retrieval from its curated knowledge base — and often chains them together in a single response.

## Target Users
- Astronomy enthusiasts and hobbyists
- Students studying introductory astrophysics
- Science communicators looking for quick, sourced facts
- Anyone curious about space who wants more depth than a simple Google search

## Core Tools

### 1. AstroCalculator
- Evaluates arbitrary math expressions using `mathjs`
- Pre-loaded with astronomical constants: speed of light, AU, parsec, solar mass, Earth radius, Hubble constant, etc.
- Example: "How many seconds would it take light to travel from the Sun to Neptune?"

### 2. SpaceSearch
- Uses Tavily API to search the web for current space news and information
- Returns top results with titles, snippets, and source URLs
- Example: "What's the latest news from the James Webb Space Telescope?"

### 3. CosmicLibrary (RAG)
- Vector search over 7 curated astronomy documents (~15,000 words total)
- Returns relevant passages WITH source attribution (document title + section)
- Topics: Solar System, Stellar Physics, Exoplanets, Space Missions, Cosmology, Black Holes, Space Weather
- Example: "What methods do scientists use to detect exoplanets?"

### 4. UnitConverter (Stretch Goal — 4th Tool)
- Converts between astronomical distance/mass/time units
- Supports: light-years, parsecs, AU, kilometers, miles, solar masses, Earth masses, etc.
- Example: "Convert 4.24 light-years to kilometers"

## Conversation Memory
- Multi-turn context using LangChain's BufferWindowMemory
- Follow-up questions work naturally: "Tell me about Mars" → "What about its moons?"
- Memory window keeps the last 20 exchanges to stay within token limits

## Web UI
- Dark space-themed interface with particle background animation
- Real-time streaming responses via Server-Sent Events
- Tool call indicators showing which tools the agent invoked
- Source citations displayed inline for RAG results
- Mobile-responsive design

## Streaming (Stretch Goal)
- Server-Sent Events (SSE) for token-by-token streaming
- Visual typing indicator during agent reasoning
- Tool invocation events displayed in real-time

## Structured Logging
- Winston-based structured JSON logging
- Logs: tool calls with arguments, tool results, agent reasoning steps, errors
- Console output with color-coded log levels for development

## Non-Goals
- User authentication or accounts
- Persistent chat history across browser sessions
- Fine-tuned or custom-trained models
- Real-time telescope data feeds
