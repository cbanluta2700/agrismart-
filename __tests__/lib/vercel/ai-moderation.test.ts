import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { moderateContent, validateContent, generateModeratedContent } from '@/lib/vercel/ai-moderation';

// Mock OpenAI's moderation API response
const mockOpenAIModerateResponse = {
  id: 'modr-123',
  model: 'text-moderation-latest',
  results: [
    {
      flagged: false,
      categories: {
        sexual: false,
        hate: false,
        harassment: false,
        'self-harm': false,
        'sexual/minors': false,
        'hate/threatening': false,
        'violence/graphic': false,
        'self-harm/intent': false,
        'self-harm/instructions': false,
        'harassment/threatening': false,
        violence: false,
      },
      category_scores: {
        sexual: 0.01,
        hate: 0.01,
        harassment: 0.01,
        'self-harm': 0.01,
        'sexual/minors': 0.01,
        'hate/threatening': 0.01,
        'violence/graphic': 0.01,
        'self-harm/intent': 0.01,
        'self-harm/instructions': 0.01,
        'harassment/threatening': 0.01,
        violence: 0.01,
      },
    },
  ],
};

// Mock OpenAI's flagged moderation API response
const mockOpenAIFlaggedResponse = {
  id: 'modr-456',
  model: 'text-moderation-latest',
  results: [
    {
      flagged: true,
      categories: {
        sexual: false,
        hate: true,
        harassment: true,
        'self-harm': false,
        'sexual/minors': false,
        'hate/threatening': true,
        'violence/graphic': false,
        'self-harm/intent': false,
        'self-harm/instructions': false,
        'harassment/threatening': true,
        violence: false,
      },
      category_scores: {
        sexual: 0.01,
        hate: 0.91,
        harassment: 0.85,
        'self-harm': 0.01,
        'sexual/minors': 0.01,
        'hate/threatening': 0.89,
        'violence/graphic': 0.01,
        'self-harm/intent': 0.01,
        'self-harm/instructions': 0.01,
        'harassment/threatening': 0.84,
        violence: 0.02,
      },
    },
  ],
};

// Mock fetch for OpenAI API
global.fetch = vi.fn();

// Mock the tracking function
vi.mock('@/lib/vercel/moderation-analytics', () => ({
  trackModerationDecision: vi.fn().mockResolvedValue(true),
}));

describe('AI Moderation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('moderateContent', () => {
    it('should approve safe content', async () => {
      // Mock the fetch response for the OpenAI API
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOpenAIModerateResponse,
      });

      const result = await moderateContent({
        content: 'This is safe content',
        contentId: '123',
        contentType: 'comment',
      });

      expect(result).toEqual({
        contentId: '123',
        flagged: false,
        categories: {
          sexual: false,
          hate: false,
          harassment: false,
          'self-harm': false,
          'sexual/minors': false,
          'hate/threatening': false,
          'violence/graphic': false,
          'self-harm/intent': false,
          'self-harm/instructions': false,
          'harassment/threatening': false,
          violence: false,
        },
        categoryScores: {
          sexual: 0.01,
          hate: 0.01,
          harassment: 0.01,
          'self-harm': 0.01,
          'sexual/minors': 0.01,
          'hate/threatening': 0.01,
          'violence/graphic': 0.01,
          'self-harm/intent': 0.01,
          'self-harm/instructions': 0.01,
          'harassment/threatening': 0.01,
          violence: 0.01,
        },
      });
    });

    it('should flag unsafe content', async () => {
      // Mock the fetch response for the OpenAI API
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOpenAIFlaggedResponse,
      });

      const result = await moderateContent({
        content: 'This is unsafe content',
        contentId: '456',
        contentType: 'comment',
      });

      expect(result).toEqual({
        contentId: '456',
        flagged: true,
        categories: {
          sexual: false,
          hate: true,
          harassment: true,
          'self-harm': false,
          'sexual/minors': false,
          'hate/threatening': true,
          'violence/graphic': false,
          'self-harm/intent': false,
          'self-harm/instructions': false,
          'harassment/threatening': true,
          violence: false,
        },
        categoryScores: {
          sexual: 0.01,
          hate: 0.91,
          harassment: 0.85,
          'self-harm': 0.01,
          'sexual/minors': 0.01,
          'hate/threatening': 0.89,
          'violence/graphic': 0.01,
          'self-harm/intent': 0.01,
          'self-harm/instructions': 0.01,
          'harassment/threatening': 0.84,
          violence: 0.02,
        },
      });
    });

    it('should handle API errors', async () => {
      // Mock the fetch to throw an error
      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      // Set AI_FALLBACK_TO_BASIC to true for this test
      process.env.AI_FALLBACK_TO_BASIC = 'true';

      // Test should not throw, but fallback to basic moderation
      const result = await moderateContent({
        content: 'This content will be checked by basic moderation',
        contentId: '789',
        contentType: 'comment',
      });

      // Should have a result even with API error due to fallback
      expect(result).toBeDefined();
      expect(result).toHaveProperty('contentId', '789');
      expect(result).toHaveProperty('flagged');

      // Reset env var
      delete process.env.AI_FALLBACK_TO_BASIC;
    });

    it('should respect custom sensitivity levels', async () => {
      // Mock the fetch response with content that's just below default threshold
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'modr-789',
          model: 'text-moderation-latest',
          results: [
            {
              flagged: false, // OpenAI says not flagged
              categories: {
                hate: false,
              },
              category_scores: {
                hate: 0.65, // High but below default threshold
              },
            },
          ],
        }),
      });

      // Using a lower sensitivity should flag this content
      const result = await moderateContent({
        content: 'Content with borderline hate speech',
        contentId: 'border-123',
        contentType: 'comment',
        sensitivityLevel: 0.6, // Lower threshold = more sensitive
      });

      // Should be flagged due to custom threshold
      expect(result.flagged).toBe(true);
    });

    it('should handle empty content', async () => {
      const result = await moderateContent({
        content: '',
        contentId: 'empty-123',
        contentType: 'comment',
      });

      // Empty content should not be flagged
      expect(result.flagged).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('validateContent', () => {
    it('should validate user input before saving', async () => {
      // Mock the fetch response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOpenAIModerateResponse,
      });

      const isValid = await validateContent({
        content: 'This is valid content',
        contentType: 'comment',
      });

      expect(isValid).toBe(true);
    });

    it('should reject harmful content', async () => {
      // Mock the fetch response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOpenAIFlaggedResponse,
      });

      const isValid = await validateContent({
        content: 'This is harmful content',
        contentType: 'post',
      });

      expect(isValid).toBe(false);
    });
  });

  describe('generateModeratedContent', () => {
    it('should generate and moderate content', async () => {
      // Mock implementation for the inner function
      const mockGenerateFunction = vi.fn().mockResolvedValue({
        content: 'Generated content',
      });

      // Mock the moderation check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOpenAIModerateResponse,
      });

      const result = await generateModeratedContent(
        { prompt: 'Generate something', contentType: 'response' },
        mockGenerateFunction
      );

      expect(result).toEqual({
        content: 'Generated content',
        moderationResult: {
          contentId: expect.any(String),
          flagged: false,
          categories: expect.any(Object),
          categoryScores: expect.any(Object),
        },
      });

      // Verify the generation function was called
      expect(mockGenerateFunction).toHaveBeenCalledTimes(1);
    });

    it('should handle moderation failures when generating content', async () => {
      // Mock implementation for the inner function
      const mockGenerateFunction = vi.fn().mockResolvedValue({
        content: 'Generated harmful content',
      });

      // Mock the moderation check to flag content
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOpenAIFlaggedResponse,
      });

      try {
        await generateModeratedContent(
          { prompt: 'Generate something harmful', contentType: 'response' },
          mockGenerateFunction
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('Generated content was flagged');
      }
    });
  });
});
