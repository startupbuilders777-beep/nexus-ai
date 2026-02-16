/**
 * Message Router Module
 * 
 * Exports all message router functionality.
 */

export { detectIntent, getIntentResponse } from './intent';
export type { Intent, IntentResult } from './intent';

export { 
  findUserAgent, 
  registerUserAgent,
  processMessage,
  generateAgentResponse,
  routeMessage,
} from './router';
export type { 
  MessagingPlatform, 
  RoutedMessage, 
  MessageResponse 
} from './router';
