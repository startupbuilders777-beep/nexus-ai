// ============================================
// Weaviate Vector Store
// Requires: npm install weaviate-client
// ============================================

import { VectorRecord, VectorSearchResult, VectorStoreConfig } from "../types";

export class WeaviateVectorStore {
  name = "weaviate";
  private url: string;
  private apiKey: string;
  private className: string;
  private client: any = null;
  private dimension: number;
  
  constructor(config: {
    url: string;
    apiKey?: string;
    className: string;
    dimension: number;
  }) {
    this.url = config.url;
    this.apiKey = config.apiKey || "";
    this.className = config.className;
    this.dimension = config.dimension;
  }
  
  async initialize(_config: VectorStoreConfig): Promise<void> {
    try {
      // Dynamic import for weaviate-client
      const weaviateModule = await import("weaviate-client");
      const weaviate = weaviateModule.default || weaviateModule;
      this.client = await weaviate.connectToCustom({
        url: this.url,
        headers: { "X-Api-Key": this.apiKey },
      });
    } catch (error) {
      throw new Error("Weaviate client not available. Install: npm install weaviate-client");
    }
  }
  
  async upsert(records: VectorRecord[]): Promise<void> {
    if (!this.client) {
      throw new Error("Weaviate not initialized. Call initialize() first.");
    }
    
    const collection = this.client.collections.get(this.className);
    
    const objects = records.map(record => ({
      id: record.id,
      properties: {
        documentId: record.documentId,
        chunkIndex: record.chunkIndex,
        content: record.content,
        ...record.metadata,
      },
      vector: record.embedding,
    }));
    
    await collection.data.insertMany(objects);
  }
  
  async search(
    queryEmbedding: number[],
    topK: number,
    _filter?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    if (!this.client) {
      throw new Error("Weaviate not initialized. Call initialize() first.");
    }
    
    const collection = this.client.collections.get(this.className);
    
    const response = await collection.query.nearVector(queryEmbedding, {
      limit: topK,
    });
    
    return response.objects.map((obj: any) => ({
      id: obj.id,
      documentId: obj.properties?.documentId,
      chunkIndex: obj.properties?.chunkIndex,
      content: obj.properties?.content,
      score: obj.score || 0,
      metadata: obj.properties,
    }));
  }
  
  async delete(documentId: string): Promise<void> {
    if (!this.client) {
      throw new Error("Weaviate not initialized. Call initialize() first.");
    }
    
    const collection = this.client.collections.get(this.className);
    await collection.data.deleteMany({
      where: { operator: "Equal", path: ["documentId"], value: documentId },
    } as any);
  }
  
  async deleteChunk(chunkId: string): Promise<void> {
    if (!this.client) {
      throw new Error("Weaviate not initialized. Call initialize() first.");
    }
    
    const collection = this.client.collections.get(this.className);
    await collection.data.deleteByID(chunkId);
  }
  
  async getStats(): Promise<{ totalVectors: number; dimension: number }> {
    return { totalVectors: 0, dimension: this.dimension };
  }
}
