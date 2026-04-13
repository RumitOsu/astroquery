import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import astroCalculator from "./tools/calculator.js";
import spaceSearch from "./tools/webSearch.js";
import cosmicLibrary, { setVectorStore } from "./tools/ragTool.js";
import unitConverter from "./tools/unitConverter.js";
import { buildVectorStore } from "../rag/ingest.js";
import logger from "../logger.js";

const SYSTEM_PROMPT = `You are AstroQuery, an expert astronomy and space exploration assistant. You have access to four powerful tools:

1. **AstroCalculator** — for math with built-in astronomical constants (speed of light, AU, parsec, solar mass, etc.)
2. **SpaceSearch** — for searching the web for current space news, discoveries, and events
3. **CosmicLibrary** — for searching a curated knowledge base of astronomy documents (solar system, stars, exoplanets, missions, cosmology, black holes, space weather)
4. **UnitConverter** — for converting between astronomical units (light-years, parsecs, AU, km, solar masses, etc.)

Guidelines:
- Use CosmicLibrary for factual astronomy questions — it provides sourced, reliable information.
- Use SpaceSearch for current events, recent discoveries, or real-time information not in the knowledge base.
- Use AstroCalculator for any mathematical computation — always show the calculation and explain the result.
- Use UnitConverter when the user wants to convert between different units of measurement.
- You can chain multiple tools in a single response when needed.
- Always cite your sources when using CosmicLibrary (the tool provides source attribution).
- Be enthusiastic about space! Make complex topics accessible and engaging.
- Format responses with markdown for readability.`;

let agent = null;
const conversationHistories = new Map();

export async function initAgent() {
  logger.info("Initializing AstroQuery agent...");

  // Build vector store
  const store = await buildVectorStore();
  setVectorStore(store);

  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.3,
    streaming: true,
  });

  const tools = [astroCalculator, spaceSearch, cosmicLibrary, unitConverter];

  agent = createReactAgent({
    llm: model,
    tools,
  });

  logger.info("Agent initialized with tools: " + tools.map((t) => t.name).join(", "));
  return agent;
}

export function getHistory(sessionId) {
  if (!conversationHistories.has(sessionId)) {
    conversationHistories.set(sessionId, []);
  }
  return conversationHistories.get(sessionId);
}

export async function chat(sessionId, userMessage) {
  if (!agent) throw new Error("Agent not initialized");

  const history = getHistory(sessionId);
  history.push(new HumanMessage(userMessage));

  // Keep last 20 messages for context window
  const recentHistory = history.slice(-20);

  logger.info("Chat request", { sessionId, message: userMessage });

  const response = await agent.invoke({
    messages: [new SystemMessage(SYSTEM_PROMPT), ...recentHistory],
  });

  const lastMsg = response.messages[response.messages.length - 1];
  history.push(new AIMessage(lastMsg.content));

  logger.info("Chat response", { sessionId, responseLength: lastMsg.content.length });

  return lastMsg.content;
}

export async function* chatStream(sessionId, userMessage) {
  if (!agent) throw new Error("Agent not initialized");

  const history = getHistory(sessionId);
  history.push(new HumanMessage(userMessage));

  const recentHistory = history.slice(-20);

  logger.info("Streaming chat request", { sessionId, message: userMessage });

  const stream = await agent.stream(
    { messages: [new SystemMessage(SYSTEM_PROMPT), ...recentHistory] },
    { streamMode: "messages" }
  );

  let fullResponse = "";
  for await (const [message, metadata] of stream) {
    // Emit tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const tc of message.tool_calls) {
        logger.info("Tool call", { tool: tc.name, args: tc.args });
        yield { type: "tool_call", name: tc.name, args: tc.args };
      }
    }

    // Emit tool results
    if (message.constructor.name === "ToolMessage" || message.name) {
      logger.info("Tool result", { tool: message.name, resultLength: message.content?.length });
      yield { type: "tool_result", name: message.name, content: message.content?.slice(0, 200) };
    }

    // Emit AI text tokens
    if (metadata?.langgraph_node === "__end__") continue;
    if (message.constructor.name === "AIMessageChunk" && message.content && !message.tool_calls?.length) {
      fullResponse += message.content;
      yield { type: "token", content: message.content };
    }
  }

  if (fullResponse) {
    history.push(new AIMessage(fullResponse));
  }

  logger.info("Stream complete", { sessionId, responseLength: fullResponse.length });
}
