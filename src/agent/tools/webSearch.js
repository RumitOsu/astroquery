import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { tavily } from "@tavily/core";
import logger from "../../logger.js";

let tvly = null;

function getClient() {
  if (!tvly) {
    tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
  }
  return tvly;
}

const spaceSearch = tool(
  async ({ query }) => {
    logger.info("SpaceSearch invoked", { tool: "SpaceSearch", query });
    try {
      const response = await getClient().search(query, {
        maxResults: 5,
        searchDepth: "basic",
        includeAnswer: true,
      });

      let output = "";
      if (response.answer) {
        output += `**Quick Answer:** ${response.answer}\n\n`;
      }
      output += "**Sources:**\n";
      for (const result of response.results) {
        output += `- **${result.title}**\n  ${result.content}\n  🔗 ${result.url}\n\n`;
      }

      logger.info("SpaceSearch results", {
        tool: "SpaceSearch",
        query,
        resultCount: response.results.length,
      });
      return output;
    } catch (err) {
      const errorMsg = `Search failed for "${query}": ${err.message}`;
      logger.error("SpaceSearch error", { tool: "SpaceSearch", query, error: err.message });
      return errorMsg;
    }
  },
  {
    name: "SpaceSearch",
    description:
      "Searches the web for current space news, astronomical events, mission updates, and any real-time astronomy information. Use this for questions about recent discoveries, upcoming launches, or current events in space exploration.",
    schema: z.object({
      query: z.string().describe("The search query, e.g. 'latest James Webb Space Telescope discoveries 2026'"),
    }),
  }
);

export default spaceSearch;
