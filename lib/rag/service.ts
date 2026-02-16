// ============================================
// RAG Pipeline Service - Main orchestration
// ============================================

import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs/promises";
import * as path from "path";

import { createEmbeddingProvider, EmbeddingProvider } from "./embeddings";
import { createVectorStore, VectorStore } from "./vector-store";
import { chunkText, ChunkOptions } from "./chunking";
import { parseDocument, parseDocumentFromBuffer, ParsedDocument } from "./parsers";
import { RagPipeline, createRagPipeline, RetrievalOptions } from "./retrieval";
import { RagConfig, defaultRagConfig, RagContext, DocumentChunk } from "./types";

export interface IngestionResult {
  documentId: string;
  chunksCount: number;
  status: "success" | "failed" | "partial";
  errors?: string[];
}

export interface ProcessingProgress {
  documentId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message?: string;
  chunksProcessed?: number;
  totalChunks?: number;
}

// ============================================
// Document Ingestion Service
// ============================================

export class DocumentIngestionService {
  private prisma: PrismaClient;
  private vectorStore: VectorStore;
  private embeddingProvider: EmbeddingProvider;
  private config: RagConfig;
  
  constructor(
    prisma: PrismaClient,
    vectorStore: VectorStore,
    embeddingProvider: EmbeddingProvider,
    config: Partial<RagConfig> = {}
  ) {
    this.prisma = prisma;
    this.vectorStore = vectorStore;
    this.embeddingProvider = embeddingProvider;
    this.config = { ...defaultRagConfig, ...config } as RagConfig;
  }
  
  // Process a document from file path
  async ingestDocument(
    filePath: string,
    userId: string,
    sourceId?: string,
    options?: {
      chunkingOptions?: Partial<ChunkOptions>;
      metadata?: Record<string, any>;
    }
  ): Promise<IngestionResult> {
    try {
      // Parse document
      const parsed = await parseDocument(filePath);
      
      // Create document record
      const document = await this.prisma.document.create({
        data: {
          id: uuidv4(),
          name: parsed.metadata.title || path.basename(filePath),
          type: parsed.metadata.fileType,
          size: parsed.metadata.fileSize,
          content: parsed.content,
          status: "PROCESSING",
          embeddingStatus: "PROCESSING",
          userId,
          sourceId: sourceId || "",
          metadata: {
            ...parsed.metadata,
            ...options?.metadata,
          },
          chunkingStrategy: "PARAGRAPH",
        },
      });
      
      // Process document
      return await this.processDocument(document.id, parsed, options?.chunkingOptions);
    } catch (error: any) {
      console.error("Document ingestion error:", error);
      return {
        documentId: "",
        chunksCount: 0,
        status: "failed",
        errors: [error.message],
      };
    }
  }
  
  // Process a document from buffer
  async ingestDocumentFromBuffer(
    buffer: Buffer,
    filename: string,
    userId: string,
    sourceId?: string,
    options?: {
      chunkingOptions?: Partial<ChunkOptions>;
      metadata?: Record<string, any>;
    }
  ): Promise<IngestionResult> {
    try {
      // Parse document
      const parsed = await parseDocumentFromBuffer(buffer, filename);
      
      // Create document record
      const document = await this.prisma.document.create({
        data: {
          id: uuidv4(),
          name: parsed.metadata.title || filename,
          type: parsed.metadata.fileType,
          size: parsed.metadata.fileSize,
          content: parsed.content,
          status: "PROCESSING",
          embeddingStatus: "PROCESSING",
          userId,
          sourceId: sourceId || "",
          metadata: {
            ...parsed.metadata,
            ...options?.metadata,
          },
          chunkingStrategy: "PARAGRAPH",
        },
      });
      
      // Process document
      return await this.processDocument(document.id, parsed, options?.chunkingOptions);
    } catch (error: any) {
      console.error("Document ingestion error:", error);
      return {
        documentId: "",
        chunksCount: 0,
        status: "failed",
        errors: [error.message],
      };
    }
  }
  
  // Process document content into chunks and embeddings
  private async processDocument(
    documentId: string,
    parsed: ParsedDocument,
    chunkingOptions?: Partial<ChunkOptions>
  ): Promise<IngestionResult> {
    const errors: string[] = [];
    
    try {
      // Determine chunking strategy
      const chunkingConfig: ChunkOptions = {
        strategy: chunkingOptions?.strategy || "paragraph",
        chunkSize: chunkingOptions?.chunkSize || this.config.chunkSize,
        chunkOverlap: chunkingOptions?.chunkOverlap || this.config.chunkOverlap,
        minChunkSize: chunkingOptions?.minChunkSize || this.config.minChunkSize,
      };
      
      // Chunk text
      const chunks = chunkText(parsed.content, chunkingConfig);
      
      if (chunks.length === 0) {
        await this.updateDocumentStatus(documentId, "FAILED");
        return {
          documentId,
          chunksCount: 0,
          status: "failed",
          errors: ["No content to chunk"],
        };
      }
      
      // Generate embeddings in batches
      const batchSize = 100;
      const allEmbeddings: { chunk: typeof chunks[0]; embedding: number[] }[] = [];
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const texts = batch.map(c => c.content);
        
        try {
          const results = await this.embeddingProvider.embed(texts);
          
          for (let j = 0; j < results.length; j++) {
            allEmbeddings.push({
              chunk: batch[j],
              embedding: results[j].embedding,
            });
          }
        } catch (embedError: any) {
          errors.push(`Embedding batch ${Math.floor(i / batchSize) + 1} failed: ${embedError.message}`);
        }
        
        // Update progress
        await this.prisma.document.update({
          where: { id: documentId },
          data: {
            chunksCount: Math.min(i + batchSize, chunks.length),
          },
        });
      }
      
      // Upsert to vector store
      const vectorRecords = allEmbeddings.map(({ chunk, embedding }) => ({
        id: `${documentId}-chunk-${chunk.index}`,
        documentId,
        chunkIndex: chunk.index,
        content: chunk.content,
        embedding,
        metadata: {
          startChar: chunk.startChar,
          endChar: chunk.endChar,
          qualityScore: this.calculateChunkQuality(chunk.content),
          documentName: parsed.metadata.title,
        },
      }));
      
      await this.vectorStore.upsert(vectorRecords);
      
      // Also save chunks to database
      for (const record of vectorRecords) {
        await this.prisma.chunk.upsert({
          where: { id: record.id },
          create: {
            id: record.id,
            documentId: record.documentId,
            chunkIndex: record.chunkIndex,
            content: record.content,
            startChar: record.metadata.startChar,
            endChar: record.metadata.endChar,
            qualityScore: record.metadata.qualityScore,
            metadata: record.metadata,
          },
          update: {
            content: record.content,
            chunkIndex: record.chunkIndex,
            startChar: record.metadata.startChar,
            endChar: record.metadata.endChar,
            qualityScore: record.metadata.qualityScore,
            metadata: record.metadata,
          },
        });
      }
      
      // Update document status
      await this.updateDocumentStatus(documentId, "COMPLETED", allEmbeddings.length);
      
      return {
        documentId,
        chunksCount: allEmbeddings.length,
        status: errors.length > 0 ? "partial" : "success",
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      await this.updateDocumentStatus(documentId, "FAILED");
      errors.push(error.message);
      
      return {
        documentId,
        chunksCount: 0,
        status: "failed",
        errors,
      };
    }
  }
  
  // Update document status
  private async updateDocumentStatus(
    documentId: string,
    status: "COMPLETED" | "FAILED" | "PROCESSING",
    chunksCount?: number
  ): Promise<void> {
    const updateData: any = {
      status,
      embeddingStatus: status === "COMPLETED" ? "COMPLETED" : status === "FAILED" ? "FAILED" : "PROCESSING",
    };
    
    if (status === "COMPLETED") {
      updateData.processedAt = new Date();
      if (chunksCount) {
        updateData.chunksCount = chunksCount;
      }
    }
    
    await this.prisma.document.update({
      where: { id: documentId },
      data: updateData,
    });
  }
  
  // Calculate chunk quality score
  private calculateChunkQuality(content: string): number {
    let score = 50; // Base score
    
    // Length score (0-20)
    const length = content.length;
    if (length >= 200 && length <= 1000) {
      score += 20;
    } else if (length > 1000) {
      score += 10;
    } else {
      score += length / 50;
    }
    
    // Structure score (0-15)
    if (content.includes(".") && content.includes(" ")) {
      score += 15;
    }
    
    // Coherence score (0-15)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length >= 2) {
      score += 15;
    }
    
    return Math.min(100, score);
  }
  
  // Delete document and its chunks
  async deleteDocument(documentId: string): Promise<void> {
    // Delete from vector store
    await this.vectorStore.delete(documentId);
    
    // Delete chunks from database
    await this.prisma.chunk.deleteMany({
      where: { documentId },
    });
    
    // Delete document
    await this.prisma.document.delete({
      where: { id: documentId },
    });
  }
  
  // Reprocess document with different settings
  async reprocessDocument(
    documentId: string,
    options?: {
      chunkingOptions?: Partial<ChunkOptions>;
    }
  ): Promise<IngestionResult> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    
    if (!document || !document.content) {
      return {
        documentId,
        chunksCount: 0,
        status: "failed",
        errors: ["Document not found or has no content"],
      };
    }
    
    // Delete existing chunks
    await this.vectorStore.delete(documentId);
    await this.prisma.chunk.deleteMany({
      where: { documentId },
    });
    
    // Reprocess
    const parsed: ParsedDocument = {
      content: document.content,
      metadata: {
        title: document.name,
        fileType: document.type,
        fileName: document.name,
        fileSize: document.size,
      },
    };
    
    return await this.processDocument(documentId, parsed, options?.chunkingOptions);
  }
}

// ============================================
// RAG Query Service
// ============================================

export class RagQueryService {
  private pipeline: RagPipeline;
  private config: RagConfig;
  
  constructor(pipeline: RagPipeline, config: RagConfig) {
    this.pipeline = pipeline;
    this.config = config;
  }
  
  // Query with RAG
  async query(options: RetrievalOptions & {
    transformQuery?: "original" | "expanded" | "hyde" | "subquestion";
    customSystemPrompt?: string;
  }): Promise<{
    ragContext: RagContext;
    transformedQuery?: string;
  }> {
    return this.pipeline.query(options);
  }
  
  // Simple query (just retrieval)
  async retrieve(options: RetrievalOptions): Promise<{
    chunks: DocumentChunk[];
    citations: RagContext["citations"];
  }> {
    const result = await this.pipeline.retrieve(options);
    
    return {
      chunks: result.chunks,
      citations: result.chunks.map(chunk => ({
        chunkId: chunk.id,
        documentId: chunk.documentId,
        documentName: chunk.documentName,
        score: chunk.score || 0,
        content: chunk.content,
      })),
    };
  }
  
  // Get relevant documents for a query
  async findRelevantDocuments(
    userId: string,
    query: string,
    topK: number = 5
  ): Promise<DocumentChunk[]> {
    const result = await this.pipeline.retrieve({
      query,
      userId,
      topK,
      useRag: true,
    });
    
    return result.chunks;
  }
}

// ============================================
// Main RAG Service Factory
// ============================================

export interface RagServiceConfig {
  // Embedding
  embeddingProvider: "openai" | "cohere" | "local";
  embeddingApiKey?: string;
  embeddingModel?: string;
  
  // Vector store
  vectorStore: "pinecone" | "weaviate" | "qdrant" | "internal";
  vectorStoreConfig?: any;
  
  // RAG config
  ragConfig?: Partial<RagConfig>;
  
  // Database
  prisma: PrismaClient;
}

export async function createRagService(config: RagServiceConfig): Promise<{
  ingestion: DocumentIngestionService;
  query: RagQueryService;
  pipeline: RagPipeline;
}> {
  // Create embedding provider
  const embeddingProvider = createEmbeddingProvider(config.embeddingProvider, {
    apiKey: config.embeddingApiKey,
    model: config.embeddingModel,
  });
  
  // Create vector store (async)
  const vectorStore = await createVectorStore({
    provider: config.vectorStore,
    dimension: config.embeddingModel === "text-embedding-3-large" ? 3072 : 1536,
    prisma: config.prisma,
    ...config.vectorStoreConfig,
  });
  
  // Initialize vector store
  await vectorStore.initialize({
    provider: config.vectorStore,
    dimension: config.embeddingModel === "text-embedding-3-large" ? 3072 : 1536,
  });
  
  // Create RAG pipeline
  const pipeline = new RagPipeline(vectorStore, embeddingProvider, config.ragConfig);
  
  // Create services
  const ingestion = new DocumentIngestionService(
    config.prisma,
    vectorStore,
    embeddingProvider,
    config.ragConfig
  );
  
  const query = new RagQueryService(
    pipeline,
    { ...defaultRagConfig, ...config.ragConfig } as RagConfig
  );
  
  return {
    ingestion,
    query,
    pipeline,
  };
}

// ============================================
// Utility Functions
// ============================================

export async function estimateTokens(text: string): Promise<number> {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

export function truncateContext(
  context: string,
  maxTokens: number
): string {
  const maxChars = maxTokens * 4;
  
  if (context.length <= maxChars) {
    return context;
  }
  
  // Try to truncate at a sentence boundary
  const truncated = context.slice(0, maxChars);
  const lastPeriod = truncated.lastIndexOf(".");
  const lastNewline = truncated.lastIndexOf("\n");
  
  const cutoff = Math.max(lastPeriod, lastNewline);
  
  if (cutoff > maxChars * 0.8) {
    return truncated.slice(0, cutoff + 1);
  }
  
  return truncated + "...";
}

export function formatChunkForDisplay(chunk: DocumentChunk, maxLength: number = 200): string {
  const prefix = chunk.documentName ? `[${chunk.documentName}] ` : "";
  const content = chunk.content.length > maxLength
    ? chunk.content.slice(0, maxLength) + "..."
    : chunk.content;
  
  return `${prefix}${content}`;
}
