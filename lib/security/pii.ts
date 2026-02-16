/**
 * PII Detection Module
 * 
 * Detects and redacts Personally Identifiable Information from text.
 * 
 * Acceptance Criteria:
 * - Regex patterns
 * - NLP detection
 * - Redaction
 */

export interface PIIResult {
  hasPII: boolean;
  detections: PIIDetection[];
  redactedText: string;
  confidence: number;
}

export interface PIIDetection {
  type: PIIType;
  value: string;
  start: number;
  end: number;
  confidence: number;
}

export type PIIType = 
  | 'EMAIL'
  | 'PHONE'
  | 'SSN'
  | 'CREDIT_CARD'
  | 'IP_ADDRESS'
  | 'DATE_OF_BIRTH'
  | 'ADDRESS'
  | 'NAME'
  | 'BANK_ACCOUNT'
  | 'DRIVERS_LICENSE'
  | 'PASSPORT';

export interface RedactionOptions {
  replaceWith?: string;
  maskPartial?: boolean;
  types?: PIIType[];
}

// Regex patterns for PII detection
const PII_PATTERNS: { type: PIIType; pattern: RegExp; confidence: number }[] = [
  // Email
  {
    type: 'EMAIL',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    confidence: 0.95,
  },
  // Phone (US and international) - require at least one separator to avoid false positives with credit cards
  {
    type: 'PHONE',
    pattern: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]+[0-9]{3}[-.\s]+[0-9]{4}/g,
    confidence: 0.9,
  },
  // SSN (US)
  {
    type: 'SSN',
    pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
    confidence: 0.85,
  },
  // Credit Card
  {
    type: 'CREDIT_CARD',
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    confidence: 0.9,
  },
  // IP Address
  {
    type: 'IP_ADDRESS',
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    confidence: 0.95,
  },
  // Date of Birth patterns
  {
    type: 'DATE_OF_BIRTH',
    pattern: /\b(?:0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12][0-9]|3[01])[\/\-](?:19|20)?\d{2}\b/g,
    confidence: 0.7,
  },
  // Bank Account (basic)
  {
    type: 'BANK_ACCOUNT',
    pattern: /\b\d{8,17}\b/g, // Basic account number pattern
    confidence: 0.5,
  },
  // Drivers License (various state formats)
  {
    type: 'DRIVERS_LICENSE',
    pattern: /\b[A-Z]{1,2}\d{5,8}\b/g,
    confidence: 0.6,
  },
  // Passport (US format)
  {
    type: 'PASSPORT',
    pattern: /\b[A-Z]{1,2}\d{6,9}\b/g,
    confidence: 0.6,
  },
];

/**
 * Detect PII in text
 */
export function detectPII(text: string): PIIResult {
  const detections: PIIDetection[] = [];
  
  for (const { type, pattern, confidence } of PII_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      // Filter out likely false positives
      if (shouldFilter(type, match[0])) continue;
      
      detections.push({
        type,
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
        confidence,
      });
    }
  }
  
  // Sort by position
  detections.sort((a, b) => a.start - b.start);
  
  // Remove overlapping detections (keep highest confidence)
  const filteredDetections = removeOverlaps(detections);
  
  // Generate redacted text
  const redactedText = redactText(text, filteredDetections);
  
  return {
    hasPII: filteredDetections.length > 0,
    detections: filteredDetections,
    redactedText,
    confidence: filteredDetections.length > 0 
      ? filteredDetections.reduce((sum, d) => sum + d.confidence, 0) / filteredDetections.length
      : 0,
  };
}

/**
 * Redact PII from text
 */
export function redactPII(text: string, options: RedactionOptions = {}): string {
  const { replaceWith = '[REDACTED]', maskPartial = false, types } = options;
  
  const result = detectPII(text);
  
  if (types && types.length > 0) {
    // Only redact specific types
    const filtered = result.detections.filter(d => types.includes(d.type));
    return redactText(text, filtered, replaceWith, maskPartial);
  }
  
  return result.redactedText;
}

/**
 * Check if detection should be filtered (false positive)
 */
function shouldFilter(type: PIIType, value: string): boolean {
  // Filter SSN-like patterns that might be phone numbers
  if (type === 'SSN') {
    // Common phone numbers that look like SSN
    if (/^[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{4}$/.test(value)) {
      // Could be SSN, but check if it looks like a year-based number
      const firstThree = parseInt(value.slice(0, 3));
      if (firstThree < 200) return false; // Likely SSN
      return true; // Probably not SSN
    }
  }
  
  // Filter credit card check sums (Luhn algorithm)
  if (type === 'CREDIT_CARD') {
    const digits = value.replace(/\D/g, '');
    if (!luhnCheck(digits)) return true;
  }
  
  return false;
}

/**
 * Luhn algorithm for credit card validation
 */
function luhnCheck(cardNumber: string): boolean {
  let sum = 0;
  let isEven = false;
  
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Remove overlapping detections
 */
function removeOverlaps(detections: PIIDetection[]): PIIDetection[] {
  if (detections.length === 0) return [];
  
  const result: PIIDetection[] = [];
  let lastEnd = -1;
  
  for (const detection of detections) {
    if (detection.start >= lastEnd) {
      result.push(detection);
      lastEnd = detection.end;
    } else {
      // Overlapping - keep the one with higher confidence
      const existing = result[result.length - 1];
      if (detection.confidence > existing.confidence) {
        result[result.length - 1] = detection;
        lastEnd = detection.end;
      }
    }
  }
  
  return result;
}

/**
 * Redact text with given detections
 */
function redactText(
  text: string, 
  detections: PIIDetection[], 
  replaceWith = '[REDACTED]',
  maskPartial = false
): string {
  if (detections.length === 0) return text;
  
  let result = '';
  let lastIndex = 0;
  
  for (const detection of detections) {
    // Add text before the detection
    result += text.slice(lastIndex, detection.start);
    
    // Add the redaction
    if (maskPartial) {
      result += maskPartialValue(detection.value, detection.type);
    } else {
      result += replaceWith;
    }
    
    lastIndex = detection.end;
  }
  
  // Add remaining text
  result += text.slice(lastIndex);
  
  return result;
}

/**
 * Partially mask a value (show last 4 chars)
 */
function maskPartialValue(value: string, type: PIIType): string {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length >= 4) {
    const visible = digits.slice(-4);
    return `***${visible}`;
  }
  
  return '[REDACTED]';
}
