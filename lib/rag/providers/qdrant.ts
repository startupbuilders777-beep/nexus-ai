// ============================================
// Qdrant Vector Store
// Requires: npm install @qdrant/js-client-rest
// ============================================

import { VectorRecord, VectorSearchResult, VectorStoreConfig } from "../types";

export class QdrantVectorStore {
  name = "qdrant";
  private url: string;
  private apiKey: string;
  private collectionName: string;
  private client: any = null;
  private dimension: number;
  
  constructor(config: {
    url: string;
    apiKey?: string;
    collectionName: string;
    dimension: number;
  }) {
    this.url = config.url;
    this.apiKey = config.apiKey || "";
    this.collectionName = config.collectionName;
    this.dimension = config.dimension;
  }
  
  async initialize(_config: VectorStoreConfig): Promise<void> {
    try {
      const { QdrantClient } = await import("@qdrant/js-client-rest");
      this.client = new QdrantClient({
        url: this.url,
        apiKey: this.apiKey,
      });
    } catch (error) {
      throw new Error("Qdrant client not available. Install: npm install @qdrant/js-client-rest");
    }
  }
  
  async upsert(records: VectorRecord[]): Promise<void> {
    if (!this.client) {
      throw new Error("Qdrant not initialized. Call initialize() first.");
    }
    
    const points = records.map(record => ({
      id: record.id,
      vector: record.embedding,
      payload: {
        documentId: record.documentId,
        chunkIndex: record.chunkIndex,
        content: record.content,
        ...record.metadata,
      },
    }));
    
    await this.client.upsert(this.collectionName, { points });
  }
  
  async search(
    queryEmbedding: number[],
    topK: number,
    _filter?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    if (!this.client) {
      throw new Error("Qdrant not initialized. Call initialize() first.");
    }
    
    const response = await this.client.search(this.collectionName, {
      vector: queryEmbedding,
      limit: topK,
    });
    
    return response.map((result: any) => ({
      id: result.id,
      documentId: result.payload?.documentId,
      chunkIndex: result.payload?.chunkIndex,
      content: result.payload?.content,
      score: result.score,
      metadata: result.payload,
    }));
  }
  
  async delete(documentId: string): Promise<void> {
    if (!this.client) {
      throw new Error("Qdrant not initialized. Call initialize() first.");
    }
    
    await this.client.delete(this.collectionName, {
      filter: {
        must: [{ key: "documentId", match: { value: documentId } }],
      },
    });
  }
  
  async deleteChunk(chunkId: string): Promise<void> {
    if (!this.client) {
      throw new Error("Qdrant not initialized. Call initialize() first.");
    }
    
    await this.client.delete(this.collectionName, { points: [chunkId] });
  }
  
  async getStats(): Promise<{ totalVectors: number; dimension: number }> {
    if (!this.client) {
      throw new Error("Qdrant not initialized. Call initialize() first.");
    }
    
    const response = await this.client.getCollection(this.collectionName);
    return {
      totalVectors: response.points_count,
      dimension: this.dimension,
    };
  }
}
