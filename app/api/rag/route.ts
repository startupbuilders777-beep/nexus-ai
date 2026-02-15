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

    const body = await request.json();
    const { message, conversationId, useRag = true, model = "gpt-4", temperature = 0.7 } = body;

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

    let context = "";
    let citations: { chunkId: string; documentId: string; score: number }[] = [];

    // If RAG is enabled, search for relevant chunks
    if (useRag) {
      // For demo purposes, we'll use a simple text search
      // In production, you'd use vector similarity search with embeddings
      const chunks = await prisma.chunk.findMany({
        where: {
          document: {
            userId: session.user.id,
            embeddingStatus: "COMPLETED",
          },
        },
        include: {
          document: true,
        },
        take: 5,
      });

      // For demo, we'll just get recent chunks as context
      // In production, you'd compute embeddings and do similarity search
      const recentDocuments = await prisma.document.findMany({
        where: {
          userId: session.user.id,
          status: "COMPLETED",
        },
        orderBy: { updatedAt: "desc" },
        take: 3,
      });

      context = recentDocuments
        .map((doc) => doc.content?.slice(0, 1000))
        .filter(Boolean)
        .join("\n\n---\n\n");
    }

    // Build the prompt
    const systemPrompt = useRag
      ? `You are NexusAI, an AI assistant that helps users answer questions based on their connected data sources. 
      
Context from user's data:
${context || "No context available."}

Instructions:
- Answer based on the provided context when available
- If the context doesn't contain enough information, say so
- Be concise and helpful
- Cite your sources when possible`
      : `You are NexusAI, a helpful AI assistant.`;

    // Call OpenAI
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature,
      max_tokens: 2048,
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
        cost: ((completion.usage?.total_tokens || 0) / 1000) * 0.01, // Approximate cost
        model,
        operation: "chat",
        apiKeyId: undefined,
      },
    });

    return NextResponse.json({
      message: assistantMessage,
      conversationId: conversation.id,
      citations,
    });
  } catch (error) {
    console.error("RAG API Error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      // Return list of conversations
      const conversations = await prisma.conversation.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: "desc" },
        take: 50,
      });
      return NextResponse.json(conversations);
    }

    // Return messages for a conversation
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
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
