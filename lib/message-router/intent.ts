/**
 * Intent Detection Module
 * 
 * Provides basic keyword-based intent detection for incoming messages
 * from Telegram and Discord platforms.
 */

export type Intent = 
  | 'greeting'
  | 'help'
  | 'question'
  | 'task'
  | 'conversation'
  | 'unknown';

export interface IntentResult {
  intent: Intent;
  confidence: number;
  entities: Record<string, string>;
}

// Common keywords for each intent
const INTENT_KEYWORDS: Record<Intent, string[]> = {
  greeting: ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good evening', 'good afternoon', 'what\'s up', 'sup'],
  help: ['help', 'help me', 'how do i', 'how can i', 'what can you do', 'commands', 'guide', 'instructions'],
  question: ['what', 'why', 'how', 'when', 'where', 'who', 'which', '?', 'explain'],
  task: ['create', 'make', 'do', 'send', 'get', 'find', 'search', 'build', 'write', 'generate', 'calculate'],
  conversation: [],
  unknown: [],
};

export function detectIntent(message: string): IntentResult {
  const normalizedMessage = message.toLowerCase().trim();
  const words = normalizedMessage.split(/\s+/);
  
  // Calculate scores for each intent
  const scores: Record<Intent, number> = {
    greeting: 0,
    help: 0,
    question: 0,
    task: 0,
    conversation: 0,
    unknown: 0,
  };

  // Check for keyword matches
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (intent === 'unknown' || intent === 'conversation') continue;
    
    for (const keyword of keywords) {
      if (normalizedMessage.includes(keyword)) {
        scores[intent as Intent] += 1;
      }
    }
  }

  // Check if it's a greeting (strong signal at start of message)
  const firstWord = words[0];
  if (firstWord && INTENT_KEYWORDS.greeting.includes(firstWord)) {
    scores.greeting += 2;
  }

  // Check for question marks (question intent)
  if (normalizedMessage.includes('?')) {
    scores.question += 1;
  }

  // Check for command-like patterns (task intent)
  if (normalizedMessage.startsWith('/') || normalizedMessage.startsWith('!')) {
    scores.task += 2;
  }

  // Find the highest scoring intent
  let maxScore = 0;
  let detectedIntent: Intent = 'unknown';

  for (const [intent, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedIntent = intent as Intent;
    }
  }

  // Calculate confidence (normalize to 0-1)
  const totalWords = Math.max(words.length, 1);
  const confidence = Math.min(maxScore / Math.max(totalWords * 0.5, 1), 1);

  // Extract entities based on patterns
  const entities = extractEntities(normalizedMessage);

  return {
    intent: detectedIntent,
    confidence: confidence > 0.1 ? confidence : 0.5, // Minimum confidence
    entities,
  };
}

function extractEntities(message: string): Record<string, string> {
  const entities: Record<string, string> = {};

  // Extract URLs
  const urlMatch = message.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    entities.url = urlMatch[0];
  }

  // Extract email addresses
  const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    entities.email = emailMatch[0];
  }

  // Extract numbers (potential quantities or IDs)
  const numberMatch = message.match(/\d+/);
  if (numberMatch) {
    entities.number = numberMatch[0];
  }

  return entities;
}

// Get a response suggestion based on detected intent
export function getIntentResponse(intent: Intent): string {
  const responses: Record<Intent, string> = {
    greeting: "Hello! I'm your AI assistant. How can I help you today?",
    help: "I can help you with various tasks. Just tell me what you need - I can answer questions, help with writing, calculations, and more!",
    question: "That's an interesting question. Let me think about that...",
    task: "I'll help you with that. Let me process your request...",
    conversation: "I'm here to chat! What's on your mind?",
    unknown: "I'm not quite sure what you're asking. Could you rephrase that?",
  };

  return responses[intent];
}
