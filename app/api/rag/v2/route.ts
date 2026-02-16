// ============================================
// RAG Pipeline API - Comprehensive Implementation
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import OpenAI from "openai";
import { createRagService, truncateContext, RagQueryService, DocumentIngestionService, RagPipeline } from "@/lib/rag";
import { defaultRagConfig } from "@/lib/rag/types";

// Type for RAG service
type RagServiceType = {
  ingestion: DocumentIngestionService;
  query: RagQueryService;
  pipeline: RagPipeline;
};

// Lazy initialization
let ragServicePromise: Promise<RagServiceType> | null = null;

async function getRagService() {
  if (!ragServicePromise) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }
    
    ragServicePromise = createRagService({
      embeddingProvider: "openai",
      embeddingApiKey: apiKey,
      embeddingModel: "text-embedding-3-small",
      vectorStore: "internal",
      prisma,
      ragConfig: {
        ...defaultRagConfig,
        retrievalTopK: 5,
        similarityThreshold: 0.7,
        maxContextTokens: 4000,
        includeCitations: true,
      },
    });
  }
  return ragServicePromise;
}

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ============================================
// POST - Main RAG query endpoint
// ============================================

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      message, 
      conversationId, 
      useRag = true, 
      model = "gpt-4",
      temperature = 0.7,
      maxTokens = 2048,
      transformQuery = "original",
      customSystemPrompt,
    } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: session.user.id },
      });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId: session.user.id,
          title: message.slice(0, 50) + "...",
          model,
          useRag,
          temperature,
        },
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: message,
        isComplete: true,
      },
    });

    let ragContext: any = null;
    let citations: any[] = [];

    // If RAG is enabled, retrieve relevant context
    if (useRag) {
      try {
        const { query } = await getRagService();
        
        const result = await query.query({
          query: message,
          userId: session.user.id,
          topK: 5,
          similarityThreshold: 0.7,
          transformQuery: transformQuery as any,
        });
        
        ragContext = result.ragContext;
        citations = ragContext.citations;
      } catch (ragError: any) {
        console.error("RAG retrieval error:", ragError);
        // Continue without RAG context if there's an error
      }
    }

    // Build the prompt
    const systemPrompt = useRag && ragContext
      ? `${customSystemPrompt || `You are NexusAI, an AI assistant that helps users answer questions based on their connected data sources.`}

Context from user's documents:
${ragContext.context || "No relevant context found."}

Instructions:
- Answer based on the provided context when available
- If the context doesn't contain enough information, say so
- Be concise and helpful
- Cite your sources using the provided citations`
      : customSystemPrompt || `You are NexusAI, a helpful AI assistant.`;

    // Call OpenAI
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    const response = completion.choices[0]?.message?.content || "I couldn't generate a response.";

    // Save assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: response,
        isComplete: true,
        citations: citations.length > 0 ? citations : undefined,
        tokens: completion.usage?.total_tokens,
        model,
      },
    });

    // Update conversation stats
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        messagesCount: { increment: 2 },
        tokensUsed: { increment: completion.usage?.total_tokens || 0 },
      },
    });

    // Record usage
    await prisma.usageRecord.create({
      data: {
        userId: session.user.id,
        tokensUsed: completion.usage?.total_tokens || 0,
        tokensInput: completion.usage?.prompt_tokens || 0,
        tokensOutput: completion.usage?.completion_tokens || 0,
        requests: 1,
        cost: ((completion.usage?.total_tokens || 0) / 1000) * 0.01,
        model,
        operation: "rag",
        metadata: {
          useRag,
          citationsCount: citations.length,
          contextTokens: ragContext?.metadata?.totalTokens || 0,
        },
      },
    });

    return NextResponse.json({
      message: assistantMessage,
      conversationId: conversation.id,
      citations,
      context: ragContext?.context ? truncateContext(ragContext.context, 500) : null,
      usage: {
        tokens: completion.usage?.total_tokens,
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
      },
    });
  } catch (error: any) {
    console.error("RAG API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}

// ============================================
// GET - Retrieve conversation or search
// ============================================

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    const action = searchParams.get("action") || "messages";

    // Search action - find relevant documents
    if (action === "search") {
      const query = searchParams.get("query");
      const topK = parseInt(searchParams.get("topK") || "5");

      if (!query) {
        return NextResponse.json({ error: "Query is required" }, { status: 400 });
      }

      try {
        const { query: ragQuery } = await getRagService();
        
        const result = await ragQuery.retrieve({
          query,
          userId: session.user.id,
          topK,
        });

        return NextResponse.json({
          chunks: result.chunks.map((c: any) => ({
            id: c.id,
            documentId: c.documentId,
            documentName: c.documentName,
            content: c.content,
            score: c.score,
            chunkIndex: c.chunkIndex,
          })),
          citations: result.citations,
        });
      } catch (error: any) {
        console.error("Search error:", error);
        return NextResponse.json(
          { error: "Search failed" },
          { status: 500 }
        );
      }
    }

    // Get conversation messages
    if (conversationId) {
      const messages = await prisma.message.findMany({
        where: {
          conversation: {
            id: conversationId,
            userId: session.user.id,
          },
        },
        orderBy: { createdAt: "asc" },
      });

      return NextResponse.json(messages);
    }

    // Return list of conversations
    const conversations = await prisma.conversation.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        model: true,
        useRag: true,
        messagesCount: true,
        tokensUsed: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Get error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Delete conversation
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("id");

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 });
    }

    // Delete messages first
    await prisma.message.deleteMany({
      where: { conversationId },
    });

    // Delete conversation
    await prisma.conversation.delete({
      where: { id: conversationId, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
