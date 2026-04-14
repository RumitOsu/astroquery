import { tool } from "@langchain/core/tools";
import { z } from "zod";
import logger from "../../logger.js";

let vectorStore = null;

export function setVectorStore(store) {
  vectorStore = store;
}

const cosmicLibrary = tool(
  async ({ query }) => {
    logger.info("CosmicLibrary invoked", { tool: "CosmicLibrary", query });

    if (!vectorStore) {
      return "Error: Vector store not initialized. Run 'npm run ingest' first.";
    }

    try {
      const results = await vectorStore.similaritySearchWithScore(query, 4);

      if (results.length === 0) {
        return "No relevant documents found for this query.";
      }

      let output = `Found ${results.length} relevant passages:\n\n`;
      for (let i = 0; i < results.length; i++) {
        const [doc, score] = results[i];
        const source = `[Source: ${doc.metadata.title} > ${doc.metadata.section}]`;
        output += `**Result ${i + 1}** ${source}\n`;
        output += `${doc.pageContent.slice(0, 700)}\n\n---\n\n`;
      }

      logger.info("CosmicLibrary results", {
        tool: "CosmicLibrary",
        query,
        resultCount: results.length,
        topSource: results[0][0].metadata.title,
      });

      return output;
    } catch (err) {
      const errorMsg = `RAG search failed: ${err.message}`;
      logger.error("CosmicLibrary error", { tool: "CosmicLibrary", query, error: err.message });
      return errorMsg;
    }
  },
  {
    name: "CosmicLibrary",
    description:
      "Searches a curated knowledge base of astronomy documents covering: the Solar System, stellar classification and life cycles, exoplanet discovery methods, historic space missions, cosmology and the Big Bang, black holes and neutron stars, and space weather. Use this for factual questions about astronomy, astrophysics, and space exploration. Results include source attribution showing which document and section the information comes from.",
    schema: z.object({
      query: z.string().describe("The search query, e.g. 'How do scientists detect exoplanets?' or 'What is Hawking radiation?'"),
    }),
  }
);

export default cosmicLibrary;
