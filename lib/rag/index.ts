// ============================================
// RAG Pipeline - Main Export
// ============================================

// Types
export * from "./types";

// Embeddings
export * from "./embeddings";
export { createEmbeddingProvider } from "./embeddings";

// Chunking
export * from "./chunking";
export { chunkText } from "./chunking";

// Parsers
export * from "./parsers";
export { 
  parseDocument, 
  parseDocumentFromBuffer, 
  getParserForFile,
  getParserForMimeType 
} from "./parsers";

// Vector Store
export * from "./vector-store";
export { createVectorStore } from "./vector-store";

// Retrieval
export * from "./retrieval";
export { createRagPipeline, RagPipeline } from "./retrieval";

// Service
export * from "./service";
export { createRagService, DocumentIngestionService, RagQueryService } from "./service";

// ============================================
// Quick Start Examples
// ============================================

/**
 * Example 1: Basic RAG setup with OpenAI and internal vector store
 * 
 * ```typescript
 * import { createRagService } from "@/lib/rag";
 * import prisma from "@/lib/prisma";
 * 
 * const { ingestion, query } = await createRagService({
 *   embeddingProvider: "openai",
 *   embeddingApiKey: process.env.OPENAI_API_KEY,
 *   vectorStore: "internal",
 *   prisma,
 * });
 * 
 * // Ingest a document
 * const result = await ingestion.ingestDocument(
 *   "/path/to/document.pdf",
 *   "user-123"
 * );
 * 
 * // Query with RAG
 * const { ragContext } = await query.query({
 *   query: "What is this document about?",
 *   userId: "user-123",
 * });
 * ```
 */

/**
 * Example 2: RAG with Pinecone
 * 
 * ```typescript
 * const { ingestion, query } = await createRagService({
 *   embeddingProvider: "openai",
 *   embeddingApiKey: process.env.OPENAI_API_KEY,
 *   vectorStore: "pinecone",
 *   vectorStoreConfig: {
 *     pineconeApiKey: process.env.PINECONE_API_KEY,
 *     pineconeEnvironment: process.env.PINECONE_ENVIRONMENT,
 *     pineconeIndexName: "nexus-ai",
 *   },
 *   prisma,
 * });
 * ```
 */

/**
 * Example 3: Custom chunking and retrieval
 * 
 * ```typescript
 * import { createRagPipeline, createEmbeddingProvider, createVectorStore } from "@/lib/rag";
 * import { chunkText } from "@/lib/rag/chunking";
 * 
 * // Custom chunking
 * const chunks = chunkText(documentContent, {
 *   strategy: "semantic",
 *   chunkSize: 1500,
 *   chunkOverlap: 300,
 * });
 * 
 * // Build pipeline with custom config
 * const pipeline = await createRagPipeline({
 *   embeddingProvider: "openai",
 *   embeddingApiKey: process.env.OPENAI_API_KEY,
 *   vectorStore: "internal",
 *   ragConfig: {
 *     chunkingStrategy: "semantic",
 *     retrievalTopK: 10,
 *     similarityThreshold: 0.6,
 *     maxContextTokens: 6000,
 *   },
 * });
 * ```
 */

/**
 * Example 4: Query transformation
 * 
 * ```typescript
 * const { ragContext, transformedQuery } = await pipeline.query({
 *   query: "How does machine learning work?",
 *   userId: "user-123",
 *   transformQuery: "expanded", // or "hyde", "subquestion"
 *   llmGenerate: async (prompt) => {
 *     // Your LLM call here
 *     const response = await openai.chat.completions.create({
 *       model: "gpt-4",
 *       messages: [{ role: "user", content: prompt }],
 *     });
 *     return response.choices[0].message.content;
 *   },
 * });
 * ```
 */
