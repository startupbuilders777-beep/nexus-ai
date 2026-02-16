// ============================================
// RAG Pipeline Configuration
// ============================================

export interface RagConfig {
  // Embedding settings
  embeddingProvider: "openai" | "cohere" | "local" | "anthropic";
  embeddingModel: string;
  embeddingDimension: number;
  
  // Chunking settings
  chunkingStrategy: "fixed" | "semantic" | "paragraph" | "sentence";
  chunkSize: number;
  chunkOverlap: number;
  minChunkSize: number;
  
  // Retrieval settings
  retrievalTopK: number;
  similarityThreshold: number;
  rerankEnabled: boolean;
  rerankModel?: string;
  
  // Vector storage
  vectorStore: "pinecone" | "weaviate" | "qdrant" | "chroma" | "internal";
  vectorDimension: number;
  
  // Context injection
  maxContextTokens: number;
  includeCitations: boolean;
  citationFormat: "numbered" | "inline";
}

export const defaultRagConfig: RagConfig = {
  embeddingProvider: "openai",
  embeddingModel: "text-embedding-3-small",
  embeddingDimension: 1536,
  
  chunkingStrategy: "paragraph",
  chunkSize: 1000,
  chunkOverlap: 200,
  minChunkSize: 100,
  
  retrievalTopK: 5,
  similarityThreshold: 0.7,
  rerankEnabled: false,
  
  vectorStore: "internal",
  vectorDimension: 1536,
  
  maxContextTokens: 4000,
  includeCitations: true,
  citationFormat: "numbered",
};

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  chunkIndex: number;
  startChar?: number;
  endChar?: number;
  embedding?: number[];
  metadata?: Record<string, any>;
  score?: number;
}

export interface RetrievalResult {
  chunks: DocumentChunk[];
  totalChunks: number;
  query: string;
  executionTime: number;
}

export interface Citation {
  chunkId: string;
  documentId: string;
  documentName: string;
  score: number;
  content: string;
  startChar?: number;
  endChar?: number;
}

export interface RagContext {
  prompt: string;
  context: string;
  citations: Citation[];
  metadata: {
    retrievalTime: number;
    chunksUsed: number;
    totalTokens: number;
  };
}

// Re-export vector store types for providers
export interface VectorRecord {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface VectorSearchResult {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface VectorStoreConfig {
  provider: "pinecone" | "weaviate" | "qdrant" | "chroma" | "internal";
  dimension: number;
  prisma?: any;
  pineconeApiKey?: string;
  pineconeEnvironment?: string;
  pineconeIndexName?: string;
  weaviateUrl?: string;
  weaviateApiKey?: string;
  qdrantUrl?: string;
  qdrantApiKey?: string;
  chromaPath?: string;
  collectionName?: string;
}
