import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import logger from "../logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.join(__dirname, "documents");
const STORE_PATH = path.join(__dirname, "vectorstore.json");

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ["\n## ", "\n### ", "\n\n", "\n", " "],
});

async function loadDocuments() {
  const files = fs.readdirSync(DOCS_DIR).filter((f) => f.endsWith(".md"));
  const docs = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(DOCS_DIR, file), "utf-8");
    const title = content.split("\n")[0].replace(/^#\s*/, "").trim();

    const chunks = await splitter.createDocuments([content], [{ source: file, title }]);
    for (const chunk of chunks) {
      // Extract the nearest heading as section context
      const lines = chunk.pageContent.split("\n");
      let section = title;
      for (const line of lines) {
        if (line.startsWith("## ") || line.startsWith("### ")) {
          section = line.replace(/^#+\s*/, "").trim();
          break;
        }
      }
      chunk.metadata.section = section;
      chunk.metadata.title = title;
    }
    docs.push(...chunks);
    logger.info(`Loaded ${chunks.length} chunks from ${file} ("${title}")`);
  }

  logger.info(`Total chunks: ${docs.length}`);
  return docs;
}

export async function buildVectorStore() {
  const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });

  // Try to load persisted store
  if (fs.existsSync(STORE_PATH)) {
    logger.info("Loading persisted vector store from disk...");
    const data = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
    const docs = data.map(
      (d) => new Document({ pageContent: d.pageContent, metadata: d.metadata })
    );
    const store = await MemoryVectorStore.fromDocuments(docs, embeddings);
    logger.info(`Vector store loaded: ${docs.length} documents`);
    return store;
  }

  // Build fresh
  logger.info("Building vector store from documents...");
  const docs = await loadDocuments();
  const store = await MemoryVectorStore.fromDocuments(docs, embeddings);

  // Persist to disk
  const serialized = docs.map((d) => ({
    pageContent: d.pageContent,
    metadata: d.metadata,
  }));
  fs.writeFileSync(STORE_PATH, JSON.stringify(serialized, null, 2));
  logger.info(`Vector store persisted to ${STORE_PATH}`);

  return store;
}

// Allow running as standalone script
if (process.argv[1] && process.argv[1].includes("ingest")) {
  const dotenv = await import("dotenv");
  dotenv.config();
  await buildVectorStore();
  logger.info("Ingestion complete.");
}
