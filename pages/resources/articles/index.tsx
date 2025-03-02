import React, { useState } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  Layout, 
  PageHeader, 
  Container 
} from '@/components/layout';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ArticleCard } from '@/components/resources/ArticleCard';
import { PrismaClient } from '@prisma/client';
import { useArticles, useContentCategories, usePagination } from '@/lib/resources-hooks';
import { Search } from 'lucide-react';

// Define the props interface
interface ArticlesPageProps {
  initialArticles: any[];
  initialCategories: any[];
  initialPagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function ArticlesPage({ 
  initialArticles, 
  initialCategories,
  initialPagination
}: ArticlesPageProps) {
  const router = useRouter();
  const { categoryId, search, tag, page = '1' } = router.query;
  
  const [searchInput, setSearchInput] = useState(search as string || '');
  
  // Use SWR to fetch articles with server-side data as fallback
  const { articles, pagination, isLoading } = useArticles(
    {
      categoryId: categoryId as string,
      search: search as string,
      tag: tag as string,
      page: parseInt(page as string, 10),
      limit: 12,
      status: 'published',
    },
    {
      fallbackData: {
        articles: initialArticles,
        pagination: initialPagination,
      },
      revalidateOnFocus: false,
    }
  );

  // Use SWR to fetch categories with server-side data as fallback
  const { categories } = useContentCategories(
    { includeChildren: true },
    {
      fallbackData: { categories: initialCategories },
      revalidateOnFocus: false,
    }
  );

  // Pagination utility
  const { 
    pageNumbers, 
    nextPage, 
    prevPage, 
    goToPage, 
    hasNextPage, 
    hasPrevPage 
  } = usePagination(
    pagination?.total || initialPagination.total,
    parseInt(page as string, 10) || 1,
    12
  );

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchInput) {
      router.push({
        pathname: router.pathname,
        query: { ...router.query, search: searchInput, page: 1 },
      });
    } else if (search) {
      // Remove search param if search input is cleared
      const { search, ...restQuery } = router.query;
      router.push({
        pathname: router.pathname,
        query: { ...restQuery, page: 1 },
      });
    }
  };

  // Handle category change
  const handleCategoryChange = (value: string) => {
    if (value === 'all') {
      const { categoryId, ...restQuery } = router.query;
      router.push({
        pathname: router.pathname,
        query: { ...restQuery, page: 1 },
      });
    } else {
      router.push({
        pathname: router.pathname,
        query: { ...router.query, categoryId: value, page: 1 },
      });
    }
  };

  return (
    <Layout>
      <Head>
        <title>Articles | AgriSmart Resources</title>
        <meta 
          name="description" 
          content="Explore our collection of articles, guides, and resources for agricultural knowledge and best practices." 
        />
      </Head>

      <PageHeader
        title="Articles"
        description="Explore our collection of articles for agricultural knowledge and best practices."
      />

      <Container className="py-8">
        <div className="mb-8 grid gap-6 md:grid-cols-[250px_1fr]">
          {/* Filters sidebar */}
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-lg font-medium">Categories</h3>
              <Select 
                onValueChange={handleCategoryChange} 
                defaultValue={categoryId as string || 'all'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags filter would go here */}
          </div>

          {/* Main content */}
          <div className="space-y-6">
            {/* Search form */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                type="search"
                placeholder="Search articles..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" variant="default">
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </form>

            {/* Results summary */}
            <div className="text-sm text-muted-foreground">
              Showing {articles.length} of {pagination?.total || 0} articles
              {search && <span> matching "{search}"</span>}
              {categoryId && (
                <span> in category "{categories.find(c => c.id === categoryId)?.name || ''}"</span>
              )}
              {tag && <span> tagged with "{tag}"</span>}
            </div>

            {/* Articles grid */}
            {isLoading ? (
              <div className="py-12 text-center">Loading articles...</div>
            ) : articles.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                No articles found. Try adjusting your filters.
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={!hasPrevPage}
                >
                  Previous
                </Button>
                {pageNumbers.map((pageNumber, index) => (
                  <React.Fragment key={index}>
                    {pageNumber === '...' ? (
                      <span className="px-2">...</span>
                    ) : (
                      <Button
                        variant={parseInt(page as string, 10) === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(pageNumber as number)}
                      >
                        {pageNumber}
                      </Button>
                    )}
                  </React.Fragment>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={!hasNextPage}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </Container>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const prisma = new PrismaClient();
  const { categoryId, search, tag, page = '1' } = context.query;
  
  // Build filters
  const filters: any = { status: 'published' };
  
  if (categoryId) {
    filters.categoryId = categoryId as string;
  }
  
  if (search) {
    filters.OR = [
      { title: { contains: search as string, mode: 'insensitive' } },
      { summary: { contains: search as string, mode: 'insensitive' } },
      { content: { contains: search as string, mode: 'insensitive' } },
    ];
  }
  
  if (tag) {
    filters.tags = { has: tag as string };
  }

  // Pagination
  const pageNum = parseInt(page as string, 10) || 1;
  const limit = 12;
  const skip = (pageNum - 1) * limit;

  // Get articles count for pagination
  const totalArticles = await prisma.article.count({
    where: filters,
  });

  // Get articles
  const articles = await prisma.article.findMany({
    where: filters,
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      author: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      publishedAt: 'desc',
    },
    skip,
    take: limit,
  });

  // Get categories
  const categories = await prisma.contentCategory.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  // Close Prisma connection
  await prisma.$disconnect();

  return {
    props: {
      initialArticles: JSON.parse(JSON.stringify(articles)),
      initialCategories: JSON.parse(JSON.stringify(categories)),
      initialPagination: {
        total: totalArticles,
        page: pageNum,
        limit,
        totalPages: Math.ceil(totalArticles / limit),
      },
    },
  };
}
