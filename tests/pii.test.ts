import { detectPII, redactPII } from '@/lib/security/pii';

describe('PII Detection', () => {
  describe('Email Detection', () => {
    it('should detect email addresses', () => {
      const result = detectPII('Contact me at john.doe@example.com please.');
      expect(result.hasPII).toBe(true);
      expect(result.detections.some(d => d.type === 'EMAIL')).toBe(true);
    });

    it('should detect multiple emails', () => {
      const result = detectPII('Email john@test.com or jane@company.org');
      const emails = result.detections.filter(d => d.type === 'EMAIL');
      expect(emails.length).toBe(2);
    });
  });

  describe('Phone Detection', () => {
    it('should detect US phone numbers', () => {
      const result = detectPII('Call me at (555) 123-4567');
      expect(result.hasPII).toBe(true);
      expect(result.detections.some(d => d.type === 'PHONE')).toBe(true);
    });

    it('should detect international phone numbers', () => {
      const result = detectPII('Call +1-555-123-4567');
      expect(result.hasPII).toBe(true);
    });
  });

  describe('SSN Detection', () => {
    it('should detect SSN', () => {
      const result = detectPII('My SSN is 123-45-6789');
      expect(result.hasPII).toBe(true);
      expect(result.detections.some(d => d.type === 'SSN')).toBe(true);
    });
  });

  describe('Credit Card Detection', () => {
    it('should detect Visa cards', () => {
      const result = detectPII('Card: 4111111111111111');
      expect(result.hasPII).toBe(true);
      expect(result.detections.some(d => d.type === 'CREDIT_CARD')).toBe(true);
    });

    it('should reject invalid credit card numbers', () => {
      const result = detectPII('Card: 1234567890123456');
      // Invalid Luhn check should be filtered
      const creditCards = result.detections.filter(d => d.type === 'CREDIT_CARD');
      expect(creditCards.length).toBe(0);
    });
  });

  describe('IP Address Detection', () => {
    it('should detect IPv4 addresses', () => {
      const result = detectPII('Server at 192.168.1.1');
      expect(result.hasPII).toBe(true);
      expect(result.detections.some(d => d.type === 'IP_ADDRESS')).toBe(true);
    });
  });

  describe('Redaction', () => {
    it('should redact PII from text', () => {
      const result = redactPII('Email john@test.com for details.');
      expect(result).toBe('Email [REDACTED] for details.');
    });

    it('should redact multiple PII', () => {
      const result = redactPII('Call (555) 123-4567 or email test@site.com');
      expect(result).toBe('Call [REDACTED] or email [REDACTED]');
    });

    it('should support partial masking for emails', () => {
      const result = redactPII('Email john@test.com for help', { maskPartial: true });
      // Partial redaction for email shows first char and domain
      expect(result).not.toContain('john@');
    });
  });

  describe('Normal Text', () => {
    it('should handle text without PII', () => {
      const result = detectPII('Hello, how are you today?');
      expect(result.hasPII).toBe(false);
      expect(result.detections.length).toBe(0);
    });

    it('should not detect common words as PII', () => {
      const result = detectPII('The meeting is at the office.');
      expect(result.hasPII).toBe(false);
    });
  });

  describe('Confidence', () => {
    it('should calculate confidence score', () => {
      const result = detectPII('Email john@test.com');
      expect(result.confidence).toBeGreaterThan(0.9);
    });
  });
});
