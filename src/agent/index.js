import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import astroCalculator from "./tools/calculator.js";
import spaceSearch from "./tools/webSearch.js";
import cosmicLibrary, { setVectorStore } from "./tools/ragTool.js";
import unitConverter from "./tools/unitConverter.js";
import cosmicScale from "./tools/cosmicScale.js";
import { buildVectorStore } from "../rag/ingest.js";
import logger from "../logger.js";

const SYSTEM_PROMPT = `You are **AstroQuery**, an expert astronomy and space exploration assistant with an infectious passion for the cosmos. You have access to four powerful tools:

1. **AstroCalculator** — evaluates math expressions with built-in astronomical constants (c, AU, parsec, ly, solarMass, earthMass, jupiterMass, solarRadius, earthRadius, G, hubbleConstant, solarLuminosity, stefanBoltzmann). Use standard math syntax.
2. **SpaceSearch** — searches the web via Tavily for current space news, mission updates, discoveries, and astronomical events.
3. **CosmicLibrary** — searches a curated vector knowledge base of 7 astronomy documents covering: the Solar System, stellar physics, exoplanets, space missions, cosmology, black holes, and space weather. Returns passages with source attribution.
4. **UnitConverter** — converts between astronomical units. Distance: m, km, mi, AU, ly, parsec, pc, kpc, Mpc. Mass: kg, g, lb, solar-mass, earth-mass, jupiter-mass.
5. **CosmicScale** — puts numbers into human-relatable perspective. Give it a value and type (distance in meters, mass in kg, time in seconds, temperature in kelvin) and it returns intuitive comparisons.

## When to use each tool
- **CosmicLibrary first** for factual astronomy/astrophysics questions — it gives sourced, curated answers.
- **SpaceSearch** for anything requiring current/recent information (news, launches, discoveries from this year).
- **AstroCalculator** whenever math is involved — ALWAYS show your expression and explain the result in human-friendly terms.
- **UnitConverter** when the user asks to convert between units, or when a conversion would make your answer clearer.
- **CosmicScale** after computing a number to make it relatable. E.g., after calculating a distance, use CosmicScale to compare it to everyday objects.
- **Chain tools** freely. E.g., use CosmicLibrary to get a fact, then AstroCalculator to compute with it, then CosmicScale to make the result tangible.

## Response style
- Use **markdown** formatting: headers, bold, bullet points, tables when helpful.
- When citing CosmicLibrary results, mention the source document naturally (e.g., "According to our stellar physics reference...").
- Make numbers tangible — compare astronomical scales to everyday things ("that's like driving to the Sun and back 40 times").
- Be enthusiastic but accurate. Never invent facts — if you're unsure, say so.
- Keep responses focused and well-structured. Use headers for long answers.
- When showing calculations, format them clearly with the expression and result.`;

let agent = null;
const conversationHistories = new Map();

export async function initAgent() {
  logger.info("Initializing AstroQuery agent...");

  const store = await buildVectorStore();
  setVectorStore(store);

  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.3,
    streaming: true,
  });

  const tools = [astroCalculator, spaceSearch, cosmicLibrary, unitConverter, cosmicScale];

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

export function clearHistory(sessionId) {
  conversationHistories.delete(sessionId);
}

export async function* chatStream(sessionId, userMessage) {
  if (!agent) throw new Error("Agent not initialized");

  const history = getHistory(sessionId);
  history.push(new HumanMessage(userMessage));

  const recentHistory = history.slice(-24);

  logger.info("Chat request", {
    sessionId: sessionId.slice(0, 8),
    message: userMessage.slice(0, 100),
    historyLength: recentHistory.length,
  });

  const stream = await agent.stream(
    { messages: [new SystemMessage(SYSTEM_PROMPT), ...recentHistory] },
    { streamMode: "messages" }
  );

  let fullResponse = "";
  const toolsUsed = [];

  for await (const [message, metadata] of stream) {
    // Emit tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const tc of message.tool_calls) {
        if (!tc.name) continue;
        toolsUsed.push(tc.name);
        logger.info("Tool call", {
          tool: tc.name,
          args: JSON.stringify(tc.args).slice(0, 200),
        });
        yield { type: "tool_call", name: tc.name, args: tc.args };
      }
    }

    // Emit tool results
    if (message.name && message.content) {
      const preview = typeof message.content === "string"
        ? message.content.slice(0, 300)
        : JSON.stringify(message.content).slice(0, 300);
      logger.info("Tool result", {
        tool: message.name,
        resultLength: message.content?.length || 0,
        preview: preview.slice(0, 100),
      });
      yield { type: "tool_result", name: message.name, content: preview };
    }

    // Emit AI text tokens
    if (metadata?.langgraph_node === "__end__") continue;
    if (
      message.constructor.name === "AIMessageChunk" &&
      message.content &&
      typeof message.content === "string" &&
      !message.tool_calls?.length
    ) {
      fullResponse += message.content;
      yield { type: "token", content: message.content };
    }
  }

  if (fullResponse) {
    history.push(new AIMessage(fullResponse));
  }

  logger.info("Chat complete", {
    sessionId: sessionId.slice(0, 8),
    responseLength: fullResponse.length,
    toolsUsed: toolsUsed.join(", ") || "none",
  });
}
