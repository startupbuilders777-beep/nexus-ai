// ============================================
// Pinecone Vector Store
// Requires: npm install @pinecone-database/pinecone
// ============================================

import { VectorRecord, VectorSearchResult, VectorStoreConfig } from "../types";

interface PineconeIndex {
  upsert(vectors: any[]): Promise<{ upsertedCount: number }>;
  query(options: any): Promise<{ matches: any[] }>;
  deleteOne(id: string): Promise<void>;
  deleteMany(filter: any): Promise<void>;
  describeIndexStats(): Promise<{ totalVectorCount: number }>;
}

export class PineconeVectorStore {
  name = "pinecone";
  private apiKey: string;
  private environment: string;
  private indexName: string;
  private index: PineconeIndex | null = null;
  private dimension: number;
  
  constructor(config: {
    apiKey: string;
    environment: string;
    indexName: string;
    dimension: number;
  }) {
    this.apiKey = config.apiKey;
    this.environment = config.environment;
    this.indexName = config.indexName;
    this.dimension = config.dimension;
  }
  
  async initialize(_config: VectorStoreConfig): Promise<void> {
    try {
      const { Pinecone } = await import("@pinecone-database/pinecone");
      const pinecone = new Pinecone({
        apiKey: this.apiKey,
        environment: this.environment,
      });
      
      this.index = pinecone.Index(this.indexName) as unknown as PineconeIndex;
    } catch (error) {
      throw new Error("Pinecone client not available. Install: npm install @pinecone-database/pinecone");
    }
  }
  
  async upsert(records: VectorRecord[]): Promise<void> {
    if (!this.index) {
      throw new Error("Pinecone not initialized. Call initialize() first.");
    }
    
    const batchSize = 1000;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const vectors = batch.map(record => ({
        id: record.id,
        values: record.embedding,
        metadata: {
          documentId: record.documentId,
          chunkIndex: record.chunkIndex,
          content: record.content.slice(0, 10000),
          ...record.metadata,
        },
      }));
      
      await this.index.upsert(vectors);
    }
  }
  
  async search(
    queryEmbedding: number[],
    topK: number,
    _filter?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    if (!this.index) {
      throw new Error("Pinecone not initialized. Call initialize() first.");
    }
    
    const response = await this.index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });
    
    return response.matches.map((match: any) => ({
      id: match.id,
      documentId: match.metadata?.documentId,
      chunkIndex: match.metadata?.chunkIndex,
      content: match.metadata?.content,
      score: match.score,
      metadata: match.metadata,
    }));
  }
  
  async delete(documentId: string): Promise<void> {
    if (!this.index) {
      throw new Error("Pinecone not initialized. Call initialize() first.");
    }
    
    await this.index.deleteMany({ documentId: { $eq: documentId } } as any);
  }
  
  async deleteChunk(chunkId: string): Promise<void> {
    if (!this.index) {
      throw new Error("Pinecone not initialized. Call initialize() first.");
    }
    
    await this.index.deleteOne(chunkId);
  }
  
  async getStats(): Promise<{ totalVectors: number; dimension: number }> {
    if (!this.index) {
      throw new Error("Pinecone not initialized. Call initialize() first.");
    }
    
    const stats = await this.index.describeIndexStats();
    return {
      totalVectors: stats.totalVectorCount,
      dimension: this.dimension,
    };
  }
}
