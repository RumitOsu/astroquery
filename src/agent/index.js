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

const SYSTEM_PROMPT = `You are **AstroQuery**, an expert astronomy and space exploration assistant with an infectious passion for the cosmos. You have access to five powerful tools:

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
    maxIterations: 10,
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

  // Use "updates" stream mode for reliable event detection
  const stream = await agent.stream(
    { messages: [new SystemMessage(SYSTEM_PROMPT), ...recentHistory] },
    { streamMode: "updates" }
  );

  let fullResponse = "";
  const toolsUsed = [];

  for await (const update of stream) {
    // Agent node — contains AI message with tool calls or final response
    if (update.agent) {
      const msgs = update.agent.messages || [];
      for (const msg of msgs) {
        // Tool calls
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          for (const tc of msg.tool_calls) {
            if (!tc.name) continue;
            toolsUsed.push(tc.name);
            logger.info("Tool call", {
              tool: tc.name,
              args: JSON.stringify(tc.args).slice(0, 200),
            });
            yield { type: "tool_call", name: tc.name, args: tc.args };
          }
        }

        // Final AI text response (no tool calls = final answer)
        if (msg.content && typeof msg.content === "string" && (!msg.tool_calls || msg.tool_calls.length === 0)) {
          fullResponse = msg.content;
          logger.info("AI response", { length: msg.content.length });
          // Send the full response in chunks for a streaming feel
          const words = msg.content.split(/(\s+)/);
          let buffer = "";
          for (const word of words) {
            buffer += word;
            if (buffer.length >= 15) {
              yield { type: "token", content: buffer };
              buffer = "";
            }
          }
          if (buffer) yield { type: "token", content: buffer };
        }
      }
    }

    // Tools node — contains tool results
    if (update.tools) {
      const msgs = update.tools.messages || [];
      for (const msg of msgs) {
        if (msg.content) {
          const preview = typeof msg.content === "string"
            ? msg.content.slice(0, 300)
            : JSON.stringify(msg.content).slice(0, 300);
          logger.info("Tool result", {
            tool: msg.name,
            resultLength: msg.content.length || 0,
            preview: preview.slice(0, 100),
          });
          yield { type: "tool_result", name: msg.name, content: preview };
        }
      }
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
