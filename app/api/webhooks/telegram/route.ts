/**
 * Telegram Webhook Handler
 * 
 * Receives updates from Telegram and routes them to the appropriate
 * user's agent.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { processMessage, MessagingPlatform } from '@/lib/message-router/router';

// Telegram message types
interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

// Verify Telegram webhook secret
function verifyTelegramSecret(secret: string | null): boolean {
  // In production, implement proper verification using HMAC
  // For now, allow all requests (add proper auth in production)
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if configured
    const secret = request.headers.get('x-telegram-bot-api-secret-token');
    if (!verifyTelegramSecret(secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: TelegramUpdate = await request.json();

    // Handle different update types
    let message: TelegramMessage | undefined;
    let callbackData: string | undefined;

    if (body.message) {
      message = body.message;
    } else if (body.edited_message) {
      message = body.edited_message;
    } else if (body.callback_query) {
      message = body.callback_query.message;
      callbackData = body.callback_query.data;
    }

    if (!message) {
      return NextResponse.json({ ok: true });
    }

    // Only process text messages
    const text = message.text || callbackData;
    if (!text) {
      return NextResponse.json({ ok: true });
    }

    // Skip bot commands meant for this bot (if it's a group)
    if (text.startsWith('/') && message.chat.type !== 'private') {
      // In group chats, check if bot was mentioned
      // For now, process all messages in private chats
    }

    const platformUserId = message.from?.id.toString() || message.chat.id.toString();
    const platformChatId = message.chat.id.toString();
    const messageId = message.message_id.toString();

    // Process the message
    const result = await processMessage(
      'TELEGRAM',
      platformUserId,
      platformChatId,
      text,
      messageId
    );

    if (result.success && result.response) {
      // Send response back to Telegram
      await sendTelegramMessage(platformChatId, result.response);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function sendTelegramMessage(chatId: string, text: string) {
  // In production, use the bot token from environment or database
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.warn('TELEGRAM_BOT_TOKEN not configured');
    return;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Telegram sendMessage error:', error);
    }
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
  }
}

// Telegram webhook requires GET for verification
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'Telegram webhook endpoint' });
}
