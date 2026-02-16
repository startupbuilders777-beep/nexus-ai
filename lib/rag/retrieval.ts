// ============================================
// Retrieval & Query Builder
// ============================================

import { createEmbeddingProvider, EmbeddingProvider } from "./embeddings";
import { createVectorStore, VectorStore } from "./vector-store";
import { 
  RagConfig, 
  DocumentChunk, 
  RetrievalResult, 
  Citation,
  RagContext,
  VectorSearchResult,
} from "./types";

export interface RetrievalOptions {
  query: string;
  userId: string;
  documentIds?: string[];
  dataSourceIds?: string[];
  topK?: number;
  similarityThreshold?: number;
  useRag?: boolean;
  conversationId?: string;
}

export interface QueryTransform {
  type: "original" | "expanded" | "hyde" | "subquestion";
  query: string;
}

// ============================================
// Query Builder
// ============================================

export class QueryBuilder {
  private embeddingProvider: EmbeddingProvider;
  
  constructor(embeddingProvider: EmbeddingProvider) {
    this.embeddingProvider = embeddingProvider;
  }
  
  // Original query (no transformation)
  async buildOriginalQuery(query: string): Promise<QueryTransform> {
    return {
      type: "original",
      query,
    };
  }
  
  // Query expansion using keywords
  async expandQuery(query: string, maxExpansions: number = 5): Promise<QueryTransform> {
    // Simple keyword extraction
    const stopWords = new Set([
      "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
      "have", "has", "had", "do", "does", "did", "will", "would", "could",
      "should", "may", "might", "must", "shall", "can", "need", "dare",
      "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
      "into", "through", "during", "before", "after", "above", "below",
      "between", "under", "again", "further", "then", "once", "here",
      "there", "when", "where", "why", "how", "all", "each", "few",
      "more", "most", "other", "some", "such", "no", "nor", "not",
      "only", "own", "same", "so", "than", "too", "very", "just",
    ]);
    
    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
    
    // Get unique keywords
    const keywords = Array.from(new Set(words)).slice(0, maxExpansions);
    
    // Create expanded query
    const expandedQuery = `${query} ${keywords.join(" ")}`;
    
    return {
      type: "expanded",
      query: expandedQuery,
    };
  }
  
  // HyDE (Hypothetical Document Embeddings)
  async buildHyDEQuery(query: string, llmGenerate: (prompt: string) => Promise<string>): Promise<QueryTransform> {
    // Generate a hypothetical document that would answer the query
    const hydePrompt = `Generate a brief, factual document that would answer this question. 
The document should contain relevant information that could help answer the question.
Question: ${query}

Document:`;
    
    const hypotheticalDoc = await llmGenerate(hydePrompt);
    
    return {
      type: "hyde",
      query: hypotheticalDoc,
    };
  }
  
  // Sub-question decomposition
  async decomposeQuery(query: string, llmGenerate: (prompt: string) => Promise<string>): Promise<QueryTransform[]> {
    const decomposePrompt = `Break down this question into 2-4 simpler sub-questions that would help answer the main question.
Each sub-question should be self-contained and searchable.

Main Question: ${query}

Sub-questions (one per line):`;
    
    const response = await llmGenerate(decomposePrompt);
    const subQuestions = response.split("\n")
      .map(q => q.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter(q => q.length > 10);
    
    return subQuestions.map(q => ({
      type: "subquestion" as const,
      query: q,
    }));
  }
  
  // Build embedding for query
  async buildQueryEmbedding(query: string): Promise<number[]> {
    const result = await this.embeddingProvider.embedSingle(query);
    return result.embedding;
  }
}

// ============================================
// Retriever
// ============================================

export class Retriever {
  private vectorStore: VectorStore;
  private embeddingProvider: EmbeddingProvider;
  private config: RagConfig;
  
  constructor(
    vectorStore: VectorStore,
    embeddingProvider: EmbeddingProvider,
    config: RagConfig
  ) {
    this.vectorStore = vectorStore;
    this.embeddingProvider = embeddingProvider;
    this.config = config;
  }
  
  // Main retrieval method
  async retrieve(options: RetrievalOptions): Promise<RetrievalResult> {
    const startTime = Date.now();
    
    const {
      query,
      userId,
      documentIds,
      dataSourceIds,
      topK = this.config.retrievalTopK,
      similarityThreshold = this.config.similarityThreshold,
      useRag = true,
    } = options;
    
    if (!useRag) {
      return {
        chunks: [],
        totalChunks: 0,
        query,
        executionTime: Date.now() - startTime,
      };
    }
    
    // Generate query embedding
    const queryEmbedding = await this.embeddingProvider.embedSingle(query);
    
    // Build filter
    const filter: Record<string, any> = {
      userId,
    };
    
    if (documentIds && documentIds.length > 0) {
      filter.documentId = { $in: documentIds };
    }
    
    // Search vector store
    const results = await this.vectorStore.search(
      queryEmbedding.embedding,
      topK * 2, // Get more for filtering
      filter
    );
    
    // Filter by similarity threshold
    const filteredResults = results.filter(r => r.score >= similarityThreshold);
    
    // Apply re-ranking if enabled
    let rankedResults = filteredResults;
    if (this.config.rerankEnabled && this.config.rerankModel) {
      rankedResults = await this.rerankResults(query, filteredResults, topK);
    } else {
      rankedResults = rankedResults.slice(0, topK);
    }
    
    // Convert to DocumentChunk format
    const chunks: DocumentChunk[] = rankedResults.map(r => ({
      id: r.id,
      documentId: r.documentId,
      documentName: r.metadata?.documentName || "Unknown",
      content: r.content,
      chunkIndex: r.chunkIndex,
      startChar: r.metadata?.startChar,
      endChar: r.metadata?.endChar,
      score: r.score,
      metadata: r.metadata,
    }));
    
    return {
      chunks,
      totalChunks: results.length,
      query,
      executionTime: Date.now() - startTime,
    };
  }
  
  // Re-ranking using cross-encoder
  private async rerankResults(
    query: string,
    results: VectorSearchResult[],
    topK: number
  ): Promise<VectorSearchResult[]> {
    // For production, use a cross-encoder model like cross-encoder/ms-marco-MiniLM-L-6-v2
    // This is a simplified version using the original scores
    // In practice, you'd call a re-ranking API or model
    
    // Sort by original score (placeholder for actual re-ranking)
    return results.slice(0, topK);
  }
  
  // Get document context
  async getDocumentContext(
    documentIds: string[],
    maxTokens: number = this.config.maxContextTokens
  ): Promise<string> {
    const chunks: string[] = [];
    let totalChars = 0;
    const charsPerToken = 4; // Approximate
    
    for (const docId of documentIds) {
      const results = await this.vectorStore.search(
        new Array(this.config.embeddingDimension).fill(0),
        10,
        { documentId: docId }
      );
      
      for (const result of results) {
        if (totalChars + result.content.length > maxTokens * charsPerToken) {
          break;
        }
        
        chunks.push(result.content);
        totalChars += result.content.length;
      }
    }
    
    return chunks.join("\n\n---\n\n");
  }
}

// ============================================
// Context Builder
// ============================================

export class ContextBuilder {
  private config: RagConfig;
  
  constructor(config: RagConfig) {
    this.config = config;
  }
  
  // Build context from retrieval results
  buildContext(retrievalResult: RetrievalResult): {
    context: string;
    citations: Citation[];
    metadata: { chunksUsed: number; totalTokens: number };
  } {
    const { chunks, query, executionTime } = retrievalResult;
    
    // Format context
    const context = chunks.map((chunk, idx) => {
      const prefix = this.config.citationFormat === "numbered" 
        ? `[${idx + 1}]` 
        : `(Source: ${chunk.documentName})`;
      return `${prefix}\n${chunk.content}`;
    }).join("\n\n");
    
    // Build citations
    const citations: Citation[] = chunks.map(chunk => ({
      chunkId: chunk.id,
      documentId: chunk.documentId,
      documentName: chunk.documentName,
      score: chunk.score || 0,
      content: chunk.content,
      startChar: chunk.startChar,
      endChar: chunk.endChar,
    }));
    
    // Estimate tokens
    const totalTokens = Math.ceil(context.length / 4) + Math.ceil(query.length / 4);
    
    return {
      context,
      citations,
      metadata: {
        chunksUsed: chunks.length,
        totalTokens,
      },
    };
  }
  
  // Build RAG context for LLM prompt
  buildRagPrompt(
    userQuery: string,
    retrievalResult: RetrievalResult,
    customSystemPrompt?: string
  ): RagContext {
    const { context, citations, metadata } = this.buildContext(retrievalResult);
    
    const systemPrompt = customSystemPrompt || `You are NexusAI, an AI assistant that helps users answer questions based on their connected data sources.`;
    
    const instructions = this.config.includeCitations
      ? `Answer based on the provided context. When referencing specific information, cite your sources using the provided citations.`
      : `Answer based on the provided context.`;
    
    const ragPrompt = `${systemPrompt}

Context from user's data:
${context || "No relevant context found."}

${instructions}

If the context doesn't contain enough information to answer the question, please say so.`;
    
    return {
      prompt: ragPrompt,
      context,
      citations,
      metadata: {
        retrievalTime: retrievalResult.executionTime,
        chunksUsed: metadata.chunksUsed,
        totalTokens: metadata.totalTokens,
      },
    };
  }
  
  // Format citations for display
  formatCitations(citations: Citation[], format: "numbered" | "inline" = "numbered"): string {
    if (format === "numbered") {
      return citations
        .map((c, i) => `[${i + 1}] ${c.documentName} (${(c.score * 100).toFixed(1)}% match)`)
        .join("\n");
    } else {
      return citations
        .map(c => `• ${c.documentName}: ${c.content.slice(0, 100)}...`)
        .join("\n");
    }
  }
}

// ============================================
// RAG Pipeline (Main Class)
// ============================================

export class RagPipeline {
  private queryBuilder: QueryBuilder;
  private retriever: Retriever;
  private contextBuilder: ContextBuilder;
  private config: RagConfig;
  
  constructor(
    vectorStore: VectorStore,
    embeddingProvider: EmbeddingProvider,
    config: Partial<RagConfig> = {}
  ) {
    this.config = { ...config } as RagConfig;
    this.queryBuilder = new QueryBuilder(embeddingProvider);
    this.retriever = new Retriever(vectorStore, embeddingProvider, this.config);
    this.contextBuilder = new ContextBuilder(this.config);
  }
  
  // Full RAG pipeline
  async query(
    options: RetrievalOptions & {
      transformQuery?: "original" | "expanded" | "hyde" | "subquestion";
      customSystemPrompt?: string;
      llmGenerate?: (prompt: string) => Promise<string>;
    }
  ): Promise<{
    ragContext: RagContext;
    transformedQuery?: string;
  }> {
    const {
      query,
      transformQuery = "original",
      customSystemPrompt,
      llmGenerate,
    } = options;
    
    // Transform query if needed
    let transformedQuery = query;
    if (transformQuery === "expanded") {
      const expanded = await this.queryBuilder.expandQuery(query);
      transformedQuery = expanded.query;
    } else if (transformQuery === "hyde" && llmGenerate) {
      const hyde = await this.queryBuilder.buildHyDEQuery(query, llmGenerate);
      transformedQuery = hyde.query;
    } else if (transformQuery === "subquestion" && llmGenerate) {
      const subquestions = await this.queryBuilder.decomposeQuery(query, llmGenerate);
      // Use the most relevant sub-question for retrieval
      transformedQuery = subquestions[0]?.query || query;
    }
    
    // Retrieve context
    const retrievalResult = await this.retriever.retrieve({
      ...options,
      query: transformedQuery,
    });
    
    // Build context
    const ragContext = this.contextBuilder.buildRagPrompt(
      query,
      retrievalResult,
      customSystemPrompt
    );
    
    return {
      ragContext,
      transformedQuery,
    };
  }
  
  // Just retrieval (without LLM prompt building)
  async retrieve(options: RetrievalOptions): Promise<RetrievalResult> {
    return this.retriever.retrieve(options);
  }
  
  // Update configuration
  updateConfig(config: Partial<RagConfig>): void {
    this.config = { ...this.config, ...config } as RagConfig;
  }
  
  // Get current configuration
  getConfig(): RagConfig {
    return this.config;
  }
}

// ============================================
// Factory Function
// ============================================

export async function createRagPipeline(
  config: {
    embeddingProvider: "openai" | "cohere" | "local";
    embeddingApiKey?: string;
    embeddingModel?: string;
    vectorStore: "pinecone" | "weaviate" | "qdrant" | "chroma" | "internal";
    vectorStoreConfig?: any;
    ragConfig?: Partial<RagConfig>;
    prisma?: any;
  }
): Promise<RagPipeline> {
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
  return new RagPipeline(vectorStore, embeddingProvider, config.ragConfig);
}
