// Resource content types
export type ResourceContentType = 'article' | 'guide' | 'video' | 'glossary';

// Resource status
export type ResourceStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';

// Base resource interface
export interface ResourceBase {
  id: string;
  title: string;
  slug?: string;
  description: string;
  content: string;
  authorId: string;
  authorName: string;
  category: string;
  tags: string[];
  thumbnailUrl?: string;
  status: ResourceStatus;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// Article resource
export interface ArticleResource extends ResourceBase {
  readingTime: number;
  contentType: 'article';
}

// Guide resource
export interface GuideResource extends ResourceBase {
  steps: Array<{
    title: string;
    content: string;
    imageUrl?: string;
  }>;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  contentType: 'guide';
}

// Video resource
export interface VideoResource extends ResourceBase {
  videoUrl: string;
  duration: number;
  transcript?: string;
  contentType: 'video';
}

// Glossary resource
export interface GlossaryResource extends ResourceBase {
  term: string;
  shortDefinition: string;
  relatedTerms?: string[];
  contentType: 'glossary';
}

// Union type for all resource types
export type Resource = ArticleResource | GuideResource | VideoResource | GlossaryResource;

// Search response types
export interface ResourceSearchResult {
  id: string;
  title: string;
  slug?: string;
  contentType: ResourceContentType;
  excerpt?: string;
  category?: string;
  tags?: string[];
  authorId?: string;
  authorName?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  // Highlighted fields from search
  highlighted: {
    field: string;
    text: string;
  }[];
}

export interface ResourceSearchResponse {
  results: ResourceSearchResult[];
  totalResults: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets?: {
    categories: Array<{ name: string; count: number }>;
    tags: Array<{ name: string; count: number }>;
    authors: Array<{ id: string; name: string; count: number }>;
  };
  contentTypeCounts?: {
    article: number;
    guide: number;
    video: number;
    glossary: number;
  };
}

// Moderation types
export interface ResourceModerationItem {
  id: string;
  title: string;
  slug?: string;
  contentType: ResourceContentType;
  authorId: string;
  authorName: string;
  status: ResourceStatus;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
  moderatedBy?: string;
  moderatedAt?: string;
}

export interface ResourceModerationAction {
  action: 'approve' | 'reject';
  contentType: ResourceContentType;
  reason?: string;
}

// Analytics types
export interface ResourceAnalytics {
  id: string;
  title: string;
  slug?: string;
  contentType: ResourceContentType;
  category: string;
  authorName: string;
  viewCount: number;
  averageTimeOnPage: number;
  publishedAt?: string;
  lastViewed?: string;
}

export interface ResourceAnalyticsResponse {
  totalViews: number;
  totalResources: number;
  resourcesByType: {
    article: number;
    guide: number;
    video: number;
    glossary: number;
  };
  topResources: ResourceAnalytics[];
  viewsByDate: Array<{
    date: string;
    count: number;
  }>;
  viewsByCategory: Array<{
    category: string;
    count: number;
  }>;
}
