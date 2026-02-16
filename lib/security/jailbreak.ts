/**
 * Jailbreak Detection Module
 * 
 * Detects prompt injection attempts using pattern matching and heuristics.
 * 
 * Acceptance Criteria:
 * - Pattern detection
 * - Heuristics
 * - ML model (optional - placeholder for future)
 */

export interface DetectionResult {
  isJailbreak: boolean;
  confidence: number;
  detectedPatterns: string[];
  heuristics: HeuristicResult[];
  recommendation: 'allow' | 'block' | 'review';
}

export interface HeuristicResult {
  name: string;
  score: number;
  triggered: boolean;
  description: string;
}

// Common jailbreak patterns (DAN, AIM, etc.)
const JAILBREAK_PATTERNS = [
  // DAN (Do Anything Now) variants
  /DAN[\s_]?(mode|prompt)/i,
  /do\sanything\snow/i,
  /jailbreak/i,
  
  // Role playing to bypass restrictions
  /role\s*play\s*(as|like)/i,
  /pretend\s*(to|you\sare)/i,
  /act\s*(as|like)\s*(a\s)?(malicious|unethical|system)/i,
  /system\s*admin\s*with\s*no\s*restrictions/i,
  
  // Override instructions
  /ignore\s*(all\s)?(previous|above|prior)\s*(instructions?|rules?)/i,
  /disregard\s*(all\s)?(safety|guidelines?)/i,
  /override\s*(your\s)?(safety|guidelines?)/i,
  /bypass\s*(your\s)?(restrictions?|filters?|guidelines?)/i,
  
  // Harmful content requests
  /how\s*(to|can\si)\s*(build|make|create)\s*(a\s)?(bomb|weapon|poison)/i,
  /give\s*(me\s)?(instructions?\s+)?(to\s+)?(harm|kill|attack)/i,
  
  // Manipulation
  /you\sare\snow\s/i,
  /new\s(instructions?|system\s*prompt)/i,
  /forget\s*(everything|all)\s*(you\sknow|your\srules)/i,
  
  // Coding bypass attempts
  /```\s*(system|instructions?|prompt)/i,
  /encode[d]?\s*(instructions?|prompt)/i,
  /base64/i,
  
  // Jailbreak websites/communities
  /jailbreakme/i,
  /promptinject/i,
];

// Heuristics that indicate potential jailbreak attempts
const HEURISTICS = [
  {
    name: 'excessive_punctuation',
    check: (text: string) => {
      const exclamationCount = (text.match(/!/g) || []).length;
      const questionCount = (text.match(/\?/g) || []).length;
      return exclamationCount > 5 || questionCount > 8;
    },
    score: 0.3,
    description: 'Excessive punctuation may indicate manipulation attempt'
  },
  {
    name: 'capitals_emphasis',
    check: (text: string) => {
      const words = text.split(/\s+/);
      const capitalWords = words.filter(w => w.length > 3 && w === w.toUpperCase());
      return capitalWords.length > 3;
    },
    score: 0.2,
    description: 'Excessive capitalization may indicate urgency/manipulation'
  },
  {
    name: 'system_prompt_reference',
    check: (text: string) => {
      return /system\s*prompt|base\s*prompt|original\s*prompt/i.test(text);
    },
    score: 0.4,
    description: 'References to system prompts may indicate injection attempt'
  },
  {
    name: 'token_boundary',
    check: (text: string) => {
      return /\[\s*\]|\[\[|\]\]|\{\{|\}\}/.test(text);
    },
    score: 0.3,
    description: 'Unusual token boundaries may indicate prompt engineering'
  },
  {
    name: 'command_injection',
    check: (text: string) => {
      return /^\/(?:system|admin|debug|eval|exec)/i.test(text);
    },
    score: 0.5,
    description: 'Command-like prefixes may indicate injection attempt'
  },
  {
    name: 'persona_switch',
    check: (text: string) => {
      return /you\s+(are\s+)?(now|no\slonger|just|a\s)/i.test(text);
    },
    score: 0.4,
    description: 'Persona switching language may indicate jailbreak attempt'
  },
  {
    name: 'response_format_manipulation',
    check: (text: string) => {
      return /respond\s+(in|with|as|like)/i.test(text);
    },
    score: 0.25,
    description: 'Response format instructions may indicate manipulation'
  },
  {
    name: 'length_anomaly',
    check: (text: string) => {
      return text.length > 2000;
    },
    score: 0.15,
    description: 'Unusually long input may be attempt to confuse model'
  },
];

/**
 * Analyze text for jailbreak attempts
 */
export function detectJailbreak(text: string): DetectionResult {
  const detectedPatterns: string[] = [];
  let patternScore = 0;
  
  // Check patterns
  for (const pattern of JAILBREAK_PATTERNS) {
    if (pattern.test(text)) {
      detectedPatterns.push(pattern.source);
      patternScore += 0.5;
    }
  }
  
  // Run heuristics
  const heuristics: HeuristicResult[] = [];
  let heuristicScore = 0;
  let triggeredCount = 0;
  
  for (const heuristic of HEURISTICS) {
    const triggered = heuristic.check(text);
    if (triggered) {
      triggeredCount++;
      heuristicScore += heuristic.score;
    }
    heuristics.push({
      name: heuristic.name,
      score: heuristic.score,
      triggered,
      description: heuristic.description,
    });
  }
  
  // Calculate overall confidence
  const confidence = Math.min(patternScore + heuristicScore, 1.0);
  
  // Determine recommendation
  let recommendation: 'allow' | 'block' | 'review';
  if (confidence >= 0.7 || detectedPatterns.length >= 2) {
    recommendation = 'block';
  } else if (confidence >= 0.4 || triggeredCount >= 3) {
    recommendation = 'review';
  } else {
    recommendation = 'allow';
  }
  
  return {
    isJailbreak: confidence >= 0.5,
    confidence,
    detectedPatterns,
    heuristics,
    recommendation,
  };
}

/**
 * Simple wrapper for API usage
 */
export async function checkJailbreak(text: string): Promise<DetectionResult> {
  // For now, synchronous - can be made async for ML models later
  return detectJailbreak(text);
}
