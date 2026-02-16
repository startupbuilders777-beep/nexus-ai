/**
 * Message Router Service
 * 
 * Handles routing incoming messages from Telegram/Discord to the
 * appropriate user's agent and processing responses.
 */

import { prisma } from '@/lib/prisma';
import { detectIntent, IntentResult } from './intent';
import { v4 as uuidv4 } from 'uuid';

export type MessagingPlatform = 'TELEGRAM' | 'DISCORD';

export interface RoutedMessage {
  userId: string;
  userAgentId: string;
  platform: MessagingPlatform;
  platformUserId: string;
  platformChatId?: string;
  messageId?: string;
  content: string;
  intent: IntentResult;
  agentName?: string | null;
  systemPrompt?: string | null;
}

export interface MessageResponse {
  success: boolean;
  response?: string;
  error?: string;
  messageId?: string;
}

/**
 * Find or create a user agent for the given platform and user
 */
export async function findUserAgent(
  platform: MessagingPlatform,
  platformUserId: string
) {
  let userAgent = await prisma.userAgent.findUnique({
    where: {
      platform_platformUserId: {
        platform,
        platformUserId,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return userAgent;
}

/**
 * Route an incoming message to the appropriate user's agent
 */
export async function routeMessage(
  platform: MessagingPlatform,
  platformUserId: string,
  platformChatId: string | undefined,
  content: string,
  messageId?: string
): Promise<RoutedMessage | null> {
  // Find user agent for this platform user
  const userAgent = await findUserAgent(platform, platformUserId);

  if (!userAgent) {
    console.log(`No user agent found for ${platform} user: ${platformUserId}`);
    return null;
  }

  if (!userAgent.isActive) {
    console.log(`User agent is inactive: ${userAgent.id}`);
    return null;
  }

  // Detect intent
  const intent = detectIntent(content);

  // Log the message
  await prisma.messageLog.create({
    data: {
      userAgentId: userAgent.id,
      platform,
      messageId,
      content,
      intent: intent.intent,
      confidence: intent.confidence,
      metadata: {
        platformChatId,
        entities: intent.entities,
      },
    },
  });

  return {
    userId: userAgent.userId,
    userAgentId: userAgent.id,
    platform,
    platformUserId,
    platformChatId,
    messageId,
    content,
    intent,
    agentName: userAgent.agentName,
    systemPrompt: userAgent.systemPrompt,
  };
}

/**
 * Generate a response for a routed message
 * This is a placeholder - integrate with your AI/agent service
 */
export async function generateAgentResponse(
  routedMessage: RoutedMessage
): Promise<string> {
  const { intent, content, agentName, systemPrompt } = routedMessage;

  // Get the user's custom agent settings
  const name = agentName || 'Assistant';
  const prompt = systemPrompt || 
    `You are ${name}, a helpful AI assistant. Respond to user messages concisely and helpfully.`;

  // TODO: Integrate with your AI service (e.g., OpenAI, Anthropic)
  // For now, return a simple response based on intent
  const { getIntentResponse } = await import('./intent');
  
  let response = getIntentResponse(intent.intent);
  
  // Add some context about the user's message
  if (intent.confidence < 0.5) {
    response += `\n\nI'm not entirely sure what you're asking about "${content.slice(0, 50)}...". Could you provide more details?`;
  }

  return response;
}

/**
 * Process a message and generate a response
 */
export async function processMessage(
  platform: MessagingPlatform,
  platformUserId: string,
  platformChatId: string | undefined,
  content: string,
  messageId?: string
): Promise<MessageResponse> {
  try {
    const routedMessage = await routeMessage(
      platform,
      platformUserId,
      platformChatId,
      content,
      messageId
    );

    if (!routedMessage) {
      return {
        success: false,
        error: 'No active agent found for this user',
      };
    }

    // Generate response from agent
    const response = await generateAgentResponse(routedMessage);

    return {
      success: true,
      response,
      messageId: uuidv4(),
    };
  } catch (error) {
    console.error('Error processing message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Register a new user agent (link a platform user to a system user)
 */
export async function registerUserAgent(
  userId: string,
  platform: MessagingPlatform,
  platformUserId: string,
  platformChatId?: string,
  options?: {
    agentName?: string;
    systemPrompt?: string;
    botToken?: string;
  }
) {
  // Check if already exists
  const existing = await prisma.userAgent.findUnique({
    where: {
      platform_platformUserId: {
        platform,
        platformUserId,
      },
    },
  });

  if (existing) {
    // Update existing
    return prisma.userAgent.update({
      where: { id: existing.id },
      data: {
        platformChatId,
        agentName: options?.agentName,
        systemPrompt: options?.systemPrompt,
        botToken: options?.botToken,
        isActive: true,
      },
    });
  }

  // Create new
  return prisma.userAgent.create({
    data: {
      userId,
      platform,
      platformUserId,
      platformChatId,
      agentName: options?.agentName,
      systemPrompt: options?.systemPrompt,
      botToken: options?.botToken,
    },
  });
}
