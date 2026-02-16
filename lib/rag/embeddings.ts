// ============================================
// Embedding Provider - Multi-provider support
// ============================================

import OpenAI from "openai";
import { RagConfig } from "./types";

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  provider: string;
  tokens: number;
}

export interface EmbeddingProvider {
  name: string;
  dimension: number;
  maxBatchSize: number;
  embed(texts: string[]): Promise<EmbeddingResult[]>;
  embedSingle(text: string): Promise<EmbeddingResult>;
}

// ============================================
// OpenAI Embeddings
// ============================================

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = "openai";
  dimension = 1536;
  maxBatchSize = 2048; // OpenAI limit
  
  private client: OpenAI;
  private model: string;
  
  constructor(apiKey: string, model: string = "text-embedding-3-small") {
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.dimension = model === "text-embedding-3-large" ? 3072 : 1536;
  }
  
  async embed(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    
    // Process in batches
    for (let i = 0; i < texts.length; i += this.maxBatchSize) {
      const batch = texts.slice(i, i + this.maxBatchSize);
      const response = await this.client.embeddings.create({
        model: this.model,
        input: batch,
      });
      
      for (const data of response.data) {
        results.push({
          embedding: data.embedding,
          model: this.model,
          provider: this.name,
          tokens: response.usage?.prompt_tokens || 0,
        });
      }
    }
    
    return results;
  }
  
  async embedSingle(text: string): Promise<EmbeddingResult> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
    });
    
    return {
      embedding: response.data[0].embedding,
      model: this.model,
      provider: this.name,
      tokens: response.usage?.prompt_tokens || 0,
    };
  }
}

// ============================================
// Cohere Embeddings
// ============================================

export class CohereEmbeddingProvider implements EmbeddingProvider {
  name = "cohere";
  dimension = 1024;
  maxBatchSize = 96; // Cohere limit
  
  private apiKey: string;
  private model: string;
  
  constructor(apiKey: string, model: string = "embed-english-v3.0") {
    this.apiKey = apiKey;
    this.model = model;
  }
  
  async embed(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    
    for (let i = 0; i < texts.length; i += this.maxBatchSize) {
      const batch = texts.slice(i, i + this.maxBatchSize);
      
      const response = await fetch("https://api.cohere.ai/v1/embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          texts: batch,
          input_type: "search_document",
        }),
      });
      
      const data = await response.json();
      
      for (let j = 0; j < data.embeddings.length; j++) {
        results.push({
          embedding: data.embeddings[j],
          model: this.model,
          provider: this.name,
          tokens: 0, // Cohere doesn't return token count
        });
      }
    }
    
    return results;
  }
  
  async embedSingle(text: string): Promise<EmbeddingResult> {
    const response = await fetch("https://api.cohere.ai/v1/embed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        texts: [text],
        input_type: "search_query",
      }),
    });
    
    const data = await response.json();
    
    return {
      embedding: data.embeddings[0],
      model: this.model,
      provider: this.name,
      tokens: 0,
    };
  }
}

// ============================================
// Local/On-prem Embeddings (using transformers.js)
// Requires: npm install @xenova/transformers
// ============================================

export class LocalEmbeddingProvider implements EmbeddingProvider {
  name = "local";
  dimension = 384;
  maxBatchSize = 32;
  
  constructor(private modelName: string = "Xenova/all-MiniLM-L6-v2") {
    this.dimension = modelName.includes("L6") ? 384 : 768;
  }
  
  async initialize(): Promise<void> {
    throw new Error(
      "Local embeddings require '@xenova/transformers'. " +
      "Install it with: npm install @xenova/transformers"
    );
  }
  
  async embed(_texts: string[]): Promise<EmbeddingResult[]> {
    await this.initialize();
    return [];
  }
  
  async embedSingle(_text: string): Promise<EmbeddingResult> {
    await this.initialize();
    return { embedding: [], model: this.modelName, provider: this.name, tokens: 0 };
  }
}

// ============================================
// Factory function
// ============================================

export function createEmbeddingProvider(
  provider: "openai" | "cohere" | "local" | "anthropic",
  config: {
    apiKey?: string;
    model?: string;
  }
): EmbeddingProvider {
  switch (provider) {
    case "openai":
      if (!config.apiKey) {
        throw new Error("OpenAI API key required");
      }
      return new OpenAIEmbeddingProvider(config.apiKey, config.model);
    
    case "cohere":
      if (!config.apiKey) {
        throw new Error("Cohere API key required");
      }
      return new CohereEmbeddingProvider(config.apiKey, config.model);
    
    case "local":
      throw new Error(
        "Local embeddings require @xenova/transformers. " +
        "Install: npm install @xenova/transformers"
      );
    
    default:
      throw new Error(`Unsupported embedding provider: ${provider}`);
  }
}
