import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
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

  // Try to load persisted store (includes pre-computed vectors)
  if (fs.existsSync(STORE_PATH)) {
    logger.info("Loading persisted vector store from disk...");
    const data = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));

    // Check if vectors are persisted (new format)
    if (data.length > 0 && data[0].embedding) {
      const store = new MemoryVectorStore(embeddings);
      for (const item of data) {
        const doc = new Document({ pageContent: item.pageContent, metadata: item.metadata });
        store.memoryVectors.push({
          content: item.pageContent,
          embedding: item.embedding,
          metadata: item.metadata,
        });
      }
      logger.info(`Vector store loaded from cache: ${data.length} documents (no API calls)`);
      return store;
    }

    // Old format without embeddings — re-embed
    logger.info("Old format detected, re-embedding...");
    const docs = data.map(
      (d) => new Document({ pageContent: d.pageContent, metadata: d.metadata })
    );
    const store = await MemoryVectorStore.fromDocuments(docs, embeddings);
    persistStore(store);
    return store;
  }

  // Build fresh
  logger.info("Building vector store from documents...");
  const docs = await loadDocuments();
  const store = await MemoryVectorStore.fromDocuments(docs, embeddings);
  persistStore(store);
  return store;
}

function persistStore(store) {
  const serialized = store.memoryVectors.map((v) => ({
    pageContent: v.content,
    metadata: v.metadata,
    embedding: v.embedding,
  }));
  fs.writeFileSync(STORE_PATH, JSON.stringify(serialized));
  logger.info(`Vector store persisted: ${serialized.length} documents with embeddings`);
}

// Allow running as standalone script
if (process.argv[1] && process.argv[1].includes("ingest")) {
  const dotenv = await import("dotenv");
  dotenv.config();

  // Force rebuild by removing cached store
  if (fs.existsSync(STORE_PATH)) {
    fs.unlinkSync(STORE_PATH);
    logger.info("Removed existing vector store cache");
  }

  await buildVectorStore();
  logger.info("Ingestion complete.");
}
