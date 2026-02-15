import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import OpenAI from "openai";

// Lazy initialization of OpenAI client
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const openai = getOpenAIClient();

    const body = await request.json();
    const { documentId, model = "text-embedding-3-small" } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Get document
    const document = await prisma.document.findFirst({
      where: { id: documentId, userId: session.user.id },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (!document.content) {
      return NextResponse.json(
        { error: "Document has no content" },
        { status: 400 }
      );
    }

    // Update document status
    await prisma.document.update({
      where: { id: documentId },
      data: { embeddingStatus: "PROCESSING" },
    });

    // Chunk the document
    const chunks = await chunkText(document.content, 1000, 200);

    // Generate embeddings
    const embeddings: { chunkIndex: number; embedding: number[] }[] = [];

    for (let i = 0; i < chunks.length; i++) {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
        model,
        input: chunks[i],
      });

      embeddings.push({
        chunkIndex: i,
        embedding: response.data[0].embedding,
      });
    }

    // Save chunks to database
    for (const emb of embeddings) {
      await prisma.chunk.create({
        data: {
          documentId,
          content: chunks[emb.chunkIndex],
          // Note: embedding stored separately in production
          chunkIndex: emb.chunkIndex,
          metadata: {
            model,
            generatedAt: new Date().toISOString(),
            embeddingVector: emb.embedding,
          },
        },
      });
    }

    // Update document status
    await prisma.document.update({
      where: { id: documentId },
      data: {
        embeddingStatus: "COMPLETED",
        chunksCount: chunks.length,
        processedAt: new Date(),
      },
    });

    // Record usage
    const totalTokens = embeddings.length * 300; // Approximate
    await prisma.usageRecord.create({
      data: {
        userId: session.user.id,
        tokensUsed: totalTokens,
        tokensInput: totalTokens,
        tokensOutput: 0,
        requests: embeddings.length,
        cost: (totalTokens / 1000) * 0.0001, // Approximate cost for embeddings
        model,
        operation: "embedding",
      },
    });

    return NextResponse.json({
      success: true,
      chunksCount: chunks.length,
    });
  } catch (error) {
    console.error("Embedding generation error:", error);

    // Update document status to failed
    const body = await request.json();
    if (body.documentId) {
      await prisma.document.update({
        where: { id: body.documentId },
        data: { embeddingStatus: "FAILED" },
      });
    }

    return NextResponse.json(
      { error: "Failed to generate embeddings" },
      { status: 500 }
    );
  }
}

// Simple text chunking function
async function chunkText(text: string, chunkSize: number, overlap: number): Promise<string[]> {
  const chunks: string[] = [];
  const words = text.split(/\s+/);
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const word of words) {
    const wordLength = word.length + 1; // +1 for space
    
    if (currentLength + wordLength > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join(" "));
      
      // Keep last few words for overlap
      const overlapWords = currentChunk.slice(-Math.floor(overlap / 5));
      currentChunk = [...overlapWords, word];
      currentLength = overlapWords.join(" ").length + wordLength;
    } else {
      currentChunk.push(word);
      currentLength += wordLength;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
}

// Search for similar chunks (RAG)
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const documentId = searchParams.get("documentId");
    const limit = parseInt(searchParams.get("limit") || "5");

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Generate embedding for query
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const queryEmbedding = response.data[0].embedding;

    // Search for similar chunks (using pgvector similarity)
    // This is a simplified version - in production, use raw SQL for vector operations
    const chunks = await prisma.chunk.findMany({
      where: {
        document: {
          userId: session.user.id,
          embeddingStatus: "COMPLETED",
          ...(documentId && { id: documentId }),
        },
      },
      include: {
        document: true,
      },
      take: limit,
    });

    // Calculate simple cosine similarity (for demo - use proper vector DB in production)
    // Get embedding from metadata since it's stored there
    const results = chunks.map((chunk) => ({
      ...chunk,
      score: (chunk.metadata as any)?.embeddingVector 
        ? cosineSimilarity(queryEmbedding, (chunk.metadata as any).embeddingVector)
        : 0,
    }));

    // Sort by score and return top results
    results.sort((a, b) => b.score - a.score);

    return NextResponse.json(results.slice(0, limit));
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}

// Simple cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  
  return dotProduct / (magnitudeA * magnitudeB);
}
