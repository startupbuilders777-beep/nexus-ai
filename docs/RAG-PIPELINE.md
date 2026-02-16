# NexusAI RAG Pipeline Design

## Overview
The RAG (Retrieval Augmented Generation) pipeline for NexusAI enables the AI assistant to answer questions based on user-provided documents and data sources. This document outlines the complete implementation.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          RAG Pipeline Architecture                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────────┐   │
│  │  Documents  │────▶│  Ingestion  │────▶│    Vector Store         │   │
│  │ (PDF/TXT/  │     │   Service   │     │  (Pinecone/Internal/    │   │
│  │   MD/DOCX) │     │             │     │   Weaviate/Qdrant)      │   │
│  └─────────────┘     └─────────────┘     └───────────┬─────────────┘   │
│                                                       │                  │
│                                                       ▼                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────────┐   │
│  │    User     │────▶│   Query     │────▶│     Retriever           │   │
│  │  Question   │     │   Builder   │     │  (Embedding + Search)   │   │
│  └─────────────┘     └─────────────┘     └───────────┬─────────────┘   │
│                                                       │                  │
│                                                       ▼                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────────┐   │
│  │    LLM      │◀────│   Context   │◀────│     RAG Context         │   │
│  │  (GPT-4)    │     │   Builder   │     │  (Chunks + Citations)  │   │
│  └─────────────┘     └─────────────┘     └─────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Document Ingestion (`lib/rag/service.ts`)
- **Supported Formats**: PDF, TXT, MD, DOCX, CSV
- **Pipeline**:
  1. Parse document using appropriate parser
  2. Chunk text using configured strategy
  3. Generate embeddings for each chunk
  4. Upsert to vector store
  5. Save metadata to database

### 2. Text Chunking (`lib/rag/chunking.ts`)
Strategies:
- **Fixed Size**: Word-based chunks with overlap
- **Paragraph**: Split by paragraph boundaries
- **Sentence**: Split by sentence boundaries
- **Semantic**: Use embeddings to find semantic boundaries

Configuration:
```typescript
{
  strategy: "paragraph", // or "fixed", "sentence", "semantic"
  chunkSize: 1000,        // characters
  chunkOverlap: 200,      // characters
  minChunkSize: 100,      // minimum chunk size
}
```

### 3. Embedding Generation (`lib/rag/embeddings.ts`)
Supported Providers:
- **OpenAI**: `text-embedding-3-small` (1536d) or `text-embedding-3-large` (3072d)
- **Cohere**: `embed-english-v3.0` (1024d)
- **Local**: Using transformers.js (Xenova/all-MiniLM-L6-v2)

### 4. Vector Storage (`lib/rag/vector-store.ts`)
Supported Providers:
- **Internal**: Using Prisma with pgvector
- **Pinecone**: Cloud-hosted vector database
- **Weaviate**: Open-source vector database
- **Qdrant**: Open-source vector database

### 5. Retrieval (`lib/rag/retrieval.ts`)
Query Transformations:
- **Original**: Use query as-is
- **Expanded**: Add relevant keywords
- **HyDE**: Generate hypothetical document
- **Sub-question**: Decompose into sub-questions

Retrieval Process:
1. Transform query
2. Generate query embedding
3. Search vector store
4. Apply similarity threshold
5. Re-rank results (optional)

### 6. Context Injection (`lib/rag/retrieval.ts`)
- Formats context with citations
- Truncates to max token limit
- Builds system prompt with context

## API Endpoints

### RAG Query (`POST /api/rag/v2`)
```json
{
  "message": "What is this document about?",
  "conversationId": "optional",
  "useRag": true,
  "model": "gpt-4",
  "transformQuery": "expanded",
  "customSystemPrompt": "You are a helpful assistant."
}
```

### Search (`GET /api/rag/v2?action=search&query=...`)
```json
{
  "chunks": [
    {
      "id": "chunk-1",
      "documentName": "document.pdf",
      "content": "...",
      "score": 0.92
    }
  ]
}
```

## Database Schema

### Document
- id, name, type, size
- content (text)
- status, embeddingStatus
- chunksCount, qualityScore

### Chunk
- id, documentId
- content, chunkIndex
- startChar, endChar
- metadata (JSON)

### Conversation
- id, title, model
- useRag, temperature
- messagesCount, tokensUsed

### Message
- id, conversationId
- role, content
- citations (JSON)
- tokens, model

## Configuration

```typescript
const config = {
  // Embeddings
  embeddingProvider: "openai", // or "cohere", "local"
  embeddingModel: "text-embedding-3-small",
  
  // Chunking
  chunkingStrategy: "paragraph",
  chunkSize: 1000,
  chunkOverlap: 200,
  
  // Retrieval
  retrievalTopK: 5,
  similarityThreshold: 0.7,
  rerankEnabled: false,
  
  // Vector Store
  vectorStore: "internal", // or "pinecone", "weaviate", "qdrant"
  
  // Context
  maxContextTokens: 4000,
  includeCitations: true,
};
```

## Usage Examples

### Ingest a Document
```typescript
const { ingestion } = await createRagService(config);
const result = await ingestion.ingestDocument(
  "/path/to/document.pdf",
  "user-123"
);
```

### Query with RAG
```typescript
const { query } = await createRagService(config);
const { ragContext } = await query.query({
  query: "What is this about?",
  userId: "user-123",
  useRag: true,
});
```

### Search Documents
```typescript
const chunks = await query.retrieve({
  query: "machine learning",
  userId: "user-123",
  topK: 10,
});
```

## Acceptance Criteria Status

| Criteria | Status | Implementation |
|----------|--------|----------------|
| Document ingestion (PDF, txt, md) | ✅ | `lib/rag/parsers.ts` |
| Text chunking strategy | ✅ | `lib/rag/chunking.ts` |
| Embedding generation | ✅ | `lib/rag/embeddings.ts` |
| Vector storage | ✅ | `lib/rag/vector-store.ts` |
| Retrieval query builder | ✅ | `lib/rag/retrieval.ts` |
| Context injection | ✅ | `lib/rag/service.ts` |

## Performance Considerations

1. **Batch Processing**: Embeddings generated in batches (100 at a time)
2. **Caching**: Query embeddings can be cached
3. **Async Processing**: Long-running ingestion can be queued
4. **Pagination**: Large document sets retrieved in pages

## Security

- All RAG operations scoped to authenticated user
- Document access controlled by userId
- API keys stored in environment variables
- Vector store filters by userId

## Future Enhancements

- [ ] Multi-modal RAG (images, audio)
- [ ] Real-time document sync
- [ ] Custom embedding fine-tuning
- [ ] Hybrid search (keyword + vector)
- [ ] Agentic RAG with self-correction
