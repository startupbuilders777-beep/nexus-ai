/**
 * Tests for Message Router Module
 * 
 * Note: These tests mock the Prisma client to avoid database dependencies.
 */

// Mock Prisma
const mockPrisma = {
  userAgent: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  messageLog: {
    create: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

import { 
  findUserAgent, 
  registerUserAgent,
  processMessage,
  detectIntent 
} from '@/lib/message-router/router';

describe('Message Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findUserAgent', () => {
    it('should find existing user agent', async () => {
      const mockUserAgent = {
        id: 'agent-123',
        userId: 'user-123',
        platform: 'TELEGRAM' as const,
        platformUserId: '123456789',
        isActive: true,
        agentName: 'TestBot',
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      mockPrisma.userAgent.findUnique.mockResolvedValue(mockUserAgent);

      const result = await findUserAgent('TELEGRAM', '123456789');

      expect(result).toEqual(mockUserAgent);
      expect(mockPrisma.userAgent.findUnique).toHaveBeenCalledWith({
        where: {
          platform_platformUserId: {
            platform: 'TELEGRAM',
            platformUserId: '123456789',
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
    });

    it('should return null for non-existent user agent', async () => {
      mockPrisma.userAgent.findUnique.mockResolvedValue(null);

      const result = await findUserAgent('TELEGRAM', '999999999');

      expect(result).toBeNull();
    });

    it('should return inactive agent (caller handles inactive check)', async () => {
      // Note: findUserAgent returns the agent; caller should check isActive
      const mockUserAgent = {
        id: 'agent-123',
        isActive: false,
        userId: 'user-123',
      };

      mockPrisma.userAgent.findUnique.mockResolvedValue(mockUserAgent);

      const result = await findUserAgent('TELEGRAM', '123456789');

      // findUserAgent returns the agent; inactive check is done by caller
      expect(result).toEqual(mockUserAgent);
    });
  });

  describe('registerUserAgent', () => {
    it('should create new user agent', async () => {
      const mockUserAgent = {
        id: 'agent-new',
        userId: 'user-123',
        platform: 'DISCORD',
        platformUserId: '987654321',
        isActive: true,
        agentName: 'DiscordBot',
      };

      mockPrisma.userAgent.findUnique.mockResolvedValue(null);
      mockPrisma.userAgent.create.mockResolvedValue(mockUserAgent);

      const result = await registerUserAgent(
        'user-123',
        'DISCORD',
        '987654321',
        undefined,
        { agentName: 'DiscordBot' }
      );

      expect(result).toEqual(mockUserAgent);
      expect(mockPrisma.userAgent.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          platform: 'DISCORD',
          platformUserId: '987654321',
          platformChatId: undefined,
          agentName: 'DiscordBot',
        },
      });
    });

    it('should update existing user agent', async () => {
      const existingAgent = {
        id: 'agent-123',
        userId: 'user-123',
        platform: 'TELEGRAM',
        platformUserId: '123456789',
        isActive: true,
      };

      const updatedAgent = {
        ...existingAgent,
        agentName: 'UpdatedBot',
      };

      mockPrisma.userAgent.findUnique.mockResolvedValue(existingAgent);
      mockPrisma.userAgent.update.mockResolvedValue(updatedAgent);

      const result = await registerUserAgent(
        'user-123',
        'TELEGRAM',
        '123456789',
        undefined,
        { agentName: 'UpdatedBot' }
      );

      expect(result).toEqual(updatedAgent);
      expect(mockPrisma.userAgent.update).toHaveBeenCalledWith({
        where: { id: 'agent-123' },
        data: {
          platformChatId: undefined,
          agentName: 'UpdatedBot',
          systemPrompt: undefined,
          botToken: undefined,
          isActive: true,
        },
      });
    });
  });

  describe('processMessage', () => {
    it('should fail for non-registered user', async () => {
      mockPrisma.userAgent.findUnique.mockResolvedValue(null);

      const result = await processMessage(
        'TELEGRAM',
        '999999999',
        '999999999',
        'Hello'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No active agent');
    });
  });
});
