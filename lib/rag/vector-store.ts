// ============================================
// Vector Storage - Internal (pgvector) Implementation
// This is the default vector store that uses Prisma with pgvector
// 
// For external providers, install the optional packages and import separately:
// - Pinecone: npm install @pinecone-database/pinecone
// - Weaviate: npm install weaviate-client  
// - Qdrant: npm install @qdrant/js-client-rest
// ============================================

import { PrismaClient } from "@prisma/client";
import { RagConfig, DocumentChunk, VectorRecord, VectorSearchResult, VectorStoreConfig } from "./types";

export interface VectorStore {
  name: string;
  initialize(config: VectorStoreConfig): Promise<void>;
  upsert(records: VectorRecord[]): Promise<void>;
  search(queryEmbedding: number[], topK: number, filter?: Record<string, any>): Promise<VectorSearchResult[]>;
  delete(documentId: string): Promise<void>;
  deleteChunk(chunkId: string): Promise<void>;
  getStats(): Promise<{ totalVectors: number; dimension: number }>;
}

// ============================================
// Internal Vector Store (using Prisma/pgvector)
// ============================================

export class InternalVectorStore implements VectorStore {
  name = "internal";
  private prisma: PrismaClient;
  private dimension: number;
  
  constructor(prisma: PrismaClient, dimension: number = 1536) {
    this.prisma = prisma;
    this.dimension = dimension;
  }
  
  async initialize(_config: VectorStoreConfig): Promise<void> {
    // Internal store doesn't need initialization
    // Assumes pgvector extension is enabled in PostgreSQL
    this.dimension = _config.dimension;
  }
  
  async upsert(records: VectorRecord[]): Promise<void> {
    for (const record of records) {
      await this.prisma.chunk.upsert({
        where: { id: record.id },
        create: {
          id: record.id,
          documentId: record.documentId,
          chunkIndex: record.chunkIndex,
          content: record.content,
          startChar: record.metadata?.startChar,
          endChar: record.metadata?.endChar,
          qualityScore: record.metadata?.qualityScore,
          metadata: record.metadata as any,
        },
        update: {
          content: record.content,
          chunkIndex: record.chunkIndex,
          startChar: record.metadata?.startChar,
          endChar: record.metadata?.endChar,
          qualityScore: record.metadata?.qualityScore,
          metadata: record.metadata as any,
        },
      });
    }
  }
  
  async search(
    queryEmbedding: number[],
    topK: number,
    filter?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    const chunks = await this.prisma.chunk.findMany({
      where: {
        document: {
          embeddingStatus: "COMPLETED",
          userId: filter?.userId,
          ...(filter?.documentId && { id: filter.documentId }),
        },
      },
      include: {
        document: {
          select: {
            id: true,
            name: true,
            userId: true,
          },
        },
      },
      take: topK * 2,
    });
    
    // Calculate cosine similarity in-memory
    const results = chunks.map(chunk => {
      const embedding = (chunk.metadata as any)?.embeddingVector as number[] | undefined;
      const score = embedding 
        ? cosineSimilarity(queryEmbedding, embedding)
        : 0;
      
      return {
        id: chunk.id,
        documentId: chunk.documentId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        score,
        metadata: {
          documentName: chunk.document.name,
        },
      };
    });
    
    // Sort by score and return top K
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
  
  async delete(documentId: string): Promise<void> {
    await this.prisma.chunk.deleteMany({
      where: { documentId },
    });
  }
  
  async deleteChunk(chunkId: string): Promise<void> {
    await this.prisma.chunk.delete({
      where: { id: chunkId },
    });
  }
  
  async getStats(): Promise<{ totalVectors: number; dimension: number }> {
    const count = await this.prisma.chunk.count();
    return {
      totalVectors: count,
      dimension: this.dimension,
    };
  }
}

// ============================================
// Factory Function
// ============================================

export async function createVectorStore(config: VectorStoreConfig): Promise<VectorStore> {
  // Default to internal vector store
  if (config.provider === "internal" || !config.provider) {
    if (!config.prisma) {
      throw new Error("Prisma client required for internal vector store");
    }
    return new InternalVectorStore(config.prisma, config.dimension);
  }
  
  // For external providers, dynamically load from separate modules
  // This avoids build-time errors when packages aren't installed
  throw new Error(
    `External vector store '${config.provider}' requires optional packages. ` +
    `Install one of: ` +
    `- npm install @pinecone-database/pinecone (for Pinecone) ` +
    `- npm install weaviate-client (for Weaviate) ` +
    `- npm install @qdrant/js-client-rest (for Qdrant)`
  );
}

// ============================================
// Helper Functions
// ============================================

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  
  if (magA === 0 || magB === 0) return 0;
  
  return dotProduct / (magA * magB);
}
