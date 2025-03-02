import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET, POST } from '@/app/api/moderation/ai-check/route';
import { moderateContent } from '@/lib/vercel/ai-moderation';

// Mock dependencies
vi.mock('@/lib/vercel/ai-moderation', () => ({
  moderateContent: vi.fn(),
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getAuthOptions: vi.fn(),
}));

describe('AI Moderation API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET handler', () => {
    it('should return API status', async () => {
      const response = await GET();
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toEqual({
        status: expect.any(String),
        provider: expect.any(String),
        features: expect.any(Object),
      });
    });
  });

  describe('POST handler', () => {
    it('should check content for moderation', async () => {
      // Mock the moderation result
      const mockModerationResult = {
        contentId: 'test-123',
        flagged: false,
        categories: { hate: false, harassment: false },
        categoryScores: { hate: 0.01, harassment: 0.01 },
      };
      
      (moderateContent as any).mockResolvedValueOnce(mockModerationResult);
      
      // Mock the request with content to check
      const request = new Request('http://localhost/api/moderation/ai-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: 'Test content',
          contentType: 'comment',
        }),
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toEqual(mockModerationResult);
      expect(moderateContent).toHaveBeenCalledWith({
        content: 'Test content',
        contentType: 'comment',
        contentId: expect.any(String),
      });
    });
    
    it('should return 400 for invalid requests', async () => {
      // Mock request with missing content
      const request = new Request('http://localhost/api/moderation/ai-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required 'content' field
          contentType: 'comment',
        }),
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data).toHaveProperty('error');
      expect(moderateContent).not.toHaveBeenCalled();
    });
    
    it('should handle moderation failures', async () => {
      // Mock the moderation function to throw an error
      (moderateContent as any).mockRejectedValueOnce(new Error('Moderation failed'));
      
      // Valid request
      const request = new Request('http://localhost/api/moderation/ai-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: 'Test content',
          contentType: 'comment',
        }),
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(500);
      const data = await response.json();
      
      expect(data).toHaveProperty('error');
    });
  });
});
