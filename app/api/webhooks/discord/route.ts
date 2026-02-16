/**
 * Discord Webhook Handler
 * 
 * Receives interactions from Discord and routes them to the appropriate
 * user's agent.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processMessage, MessagingPlatform } from '@/lib/message-router/router';

// Discord interaction types
type DiscordInteractionType = 
  | 1  // PING
  | 2  // APPLICATION_COMMAND
  | 3  // MESSAGE_COMPONENT
  | 4  // APPLICATION_COMMAND_AUTOCOMPLETE
  | 5  // MODAL_SUBMIT

interface DiscordInteraction {
  id: string;
  application_id: string;
  type: DiscordInteractionType;
  data?: DiscordInteractionData;
  guild_id?: string;
  channel_id?: string;
  member?: DiscordMember;
  user?: DiscordUser;
  token: string;
  message?: DiscordMessage;
}

interface DiscordInteractionData {
  id: string;
  name: string;
  options?: DiscordCommandOption[];
  resolved?: {
    users?: Record<string, DiscordUser>;
    members?: Record<string, DiscordMember>;
    channels?: Record<string, DiscordChannel>;
    roles?: Record<string, DiscordRole>;
  };
}

interface DiscordCommandOption {
  name: string;
  value?: string | number | boolean;
  options?: DiscordCommandOption[];
}

interface DiscordMember {
  user: DiscordUser;
  nick?: string;
  roles: string[];
  joined_at: string;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  bot?: boolean;
}

interface DiscordMessage {
  id: string;
  channel_id: string;
  author: DiscordUser;
  content: string;
  timestamp: string;
}

interface DiscordChannel {
  id: string;
  type: number;
  name: string;
}

interface DiscordRole {
  id: string;
  name: string;
}

// Discord message payload
interface DiscordMessagePayload {
  content?: string;
  embeds?: DiscordEmbed[];
  components?: DiscordComponent[];
}

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
}

interface DiscordComponent {
  type: number;
  components?: DiscordComponent[];
}

export async function POST(request: NextRequest) {
  try {
    // Verify Discord request (signature + timestamp)
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');

    if (!verifyDiscordRequest(signature, timestamp, await request.clone().text())) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 401 });
    }

    const interaction: DiscordInteraction = await request.json();

    // Handle PING (Discord webhook verification)
    if (interaction.type === 1) {
      return NextResponse.json({ type: 1 });
    }

    // Get user and message info
    const user = interaction.member?.user || interaction.user;
    const channelId = interaction.channel_id;
    const messageContent = interaction.data?.options?.find(o => o.name === 'message')?.value as string 
      || interaction.message?.content 
      || '';

    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 400 });
    }

    // For slash commands, respond immediately and process in background
    if (interaction.type === 2 && interaction.data?.name) {
      const commandName = interaction.data.name;

      if (commandName === 'chat' || commandName === 'talk') {
        const userMessage = interaction.data.options?.find(o => o.name === 'message')?.value as string;
        
        if (!userMessage) {
          // Acknowledge the interaction
          await respondToInteraction(interaction.token, {
            content: 'Please provide a message.',
          });
          return NextResponse.json({ type: 5 });
        }

        // Acknowledge immediately (Discord requires response within 3 seconds)
        await respondToInteraction(interaction.token, {
          content: '🤔 Thinking...',
        });

        // Process message asynchronously
        processDiscordMessage(
          user.id,
          channelId,
          userMessage,
          interaction.id
        ).then(async (result) => {
          if (result.success && result.response) {
            // Edit the original response
            await editInteractionResponse(interaction.token, {
              content: result.response,
            });
          } else {
            await editInteractionResponse(interaction.token, {
              content: result.error || 'Sorry, I encountered an error.',
            });
          }
        }).catch(async (error) => {
          await editInteractionResponse(interaction.token, {
            content: `Error: ${error.message}`,
          });
        });

        // Return deferred response
        return NextResponse.json({ type: 5 });
      }
    }

    // For message components, just acknowledge
    if (interaction.type === 3 || interaction.type === 5) {
      return NextResponse.json({ type: 5 });
    }

    return NextResponse.json({ type: 5 });
  } catch (error) {
    console.error('Discord webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Discord request verification (simplified - add proper Ed25519 verification in production)
function verifyDiscordRequest(
  signature: string | null,
  timestamp: string | null,
  _body: string
): boolean {
  // In production, verify using Ed25519 signature
  // For now, allow requests if they have the required headers
  if (!signature || !timestamp) {
    // Allow if no verification headers (development mode)
    return true;
  }
  return true;
}

async function processDiscordMessage(
  platformUserId: string,
  platformChatId: string | undefined,
  content: string,
  messageId?: string
) {
  return processMessage(
    'DISCORD',
    platformUserId,
    platformChatId,
    content,
    messageId
  );
}

async function respondToInteraction(token: string, payload: DiscordMessagePayload) {
  const discordBotToken = process.env.DISCORD_BOT_TOKEN;
  
  if (!discordBotToken) {
    console.warn('DISCORD_BOT_TOKEN not configured');
    return;
  }

  try {
    await fetch(
      `https://discord.com/api/v10/interactions/${token}/callback`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
          data: payload,
        }),
      }
    );
  } catch (error) {
    console.error('Failed to respond to Discord interaction:', error);
  }
}

async function editInteractionResponse(token: string, payload: DiscordMessagePayload) {
  const discordBotToken = process.env.DISCORD_BOT_TOKEN;
  
  if (!discordBotToken) {
    console.warn('DISCORD_BOT_TOKEN not configured');
    return;
  }

  try {
    await fetch(
      `https://discord.com/api/v10/webhooks/${process.env.DISCORD_APPLICATION_ID}/${token}/messages/@original`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );
  } catch (error) {
    console.error('Failed to edit Discord response:', error);
  }
}

// Discord also supports GET for endpoint verification
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'Discord webhook endpoint' });
}
