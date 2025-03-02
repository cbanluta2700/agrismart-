import React from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { PrismaClient } from '@prisma/client';
import { formatDistance, format } from 'date-fns';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import remarkGfm from 'remark-gfm';
import rehypePrism from 'rehype-prism-plus';
import rehypeSlug from 'rehype-slug';
import { 
  Layout, 
  PageHeader, 
  Container 
} from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArticleCard } from '@/components/resources/ArticleCard';
import { optimizeImage } from '@/lib/vercel-sdk';
import { Clock, Share2, BookmarkPlus, ArrowLeft } from 'lucide-react';

// Define the props interface
interface ArticlePageProps {
  article: {
    id: string;
    title: string;
    slug: string;
    summary: string;
    content: string;
    contentHtml: MDXRemoteSerializeResult;
    featuredImage?: string;
    publishedAt: string;
    updatedAt: string;
    readTime: number;
    tags: string[];
    viewCount: number;
    author?: {
      id: string;
      name: string;
      avatar?: string;
    };
    category?: {
      id: string;
      name: string;
      slug: string;
    };
  };
  relatedArticles: any[];
}

export default function ArticlePage({ article, relatedArticles }: ArticlePageProps) {
  const {
    title,
    summary,
    contentHtml,
    featuredImage,
    publishedAt,
    updatedAt,
    readTime,
    tags,
    author,
    category,
  } = article;

  // Optimize image with Vercel SDK
  const optimizedImage = featuredImage 
    ? optimizeImage(featuredImage, { width: 1200, height: 630, quality: 90 }) 
    : null;

  return (
    <Layout>
      <Head>
        <title>{title} | AgriSmart Resources</title>
        <meta name="description" content={summary} />
        {optimizedImage && <meta property="og:image" content={optimizedImage} />}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={summary} />
        <meta property="og:type" content="article" />
      </Head>

      <Container className="py-8">
        <div className="mb-6">
          <Link href="/resources/articles" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Articles
          </Link>
        </div>

        <article className="mx-auto max-w-3xl">
          {/* Article header */}
          <header className="mb-8">
            {category && (
              <Link href={`/resources/categories/${category.slug}`} passHref>
                <Badge variant="outline" className="mb-3 hover:bg-secondary">
                  {category.name}
                </Badge>
              </Link>
            )}
            
            <h1 className="mb-4 text-4xl font-bold tracking-tight">{title}</h1>
            
            <p className="mb-6 text-xl text-muted-foreground">
              {summary}
            </p>
            
            <div className="flex items-center justify-between border-b border-t py-4">
              {/* Author and date */}
              <div className="flex items-center gap-3">
                {author && (
                  <>
                    <Avatar>
                      <AvatarImage src={author.avatar} />
                      <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{author.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(publishedAt), 'MMMM d, yyyy')}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Reading time */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{readTime} min read</span>
              </div>
            </div>
          </header>

          {/* Featured image */}
          {optimizedImage && (
            <div className="mb-8 overflow-hidden rounded-lg">
              <Image 
                src={optimizedImage}
                alt={title}
                width={1200}
                height={630}
                className="w-full"
                priority
              />
            </div>
          )}

          {/* Article content */}
          <div className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-primary">
            <MDXRemote {...contentHtml} />
          </div>

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="mt-8 border-t pt-6">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Tags:</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Link key={tag} href={`/resources/articles?tag=${tag}`} passHref>
                    <Badge variant="secondary" className="cursor-pointer">
                      {tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Share and bookmark */}
          <div className="mt-8 flex justify-end gap-3">
            <button className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
              <BookmarkPlus className="mr-1 h-4 w-4" />
              Bookmark
            </button>
            <button className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
              <Share2 className="mr-1 h-4 w-4" />
              Share
            </button>
          </div>
        </article>

        {/* Related articles */}
        {relatedArticles.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-6 text-2xl font-bold">Related Articles</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </div>
        )}
      </Container>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prisma = new PrismaClient();
  
  // Get all published articles
  const articles = await prisma.article.findMany({
    where: { status: 'published' },
    select: { slug: true },
  });
  
  // Close Prisma connection
  await prisma.$disconnect();
  
  // Generate paths
  const paths = articles.map((article) => ({
    params: { slug: article.slug },
  }));
  
  return {
    paths,
    fallback: 'blocking', // Show a loading state while generating static pages
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const prisma = new PrismaClient();
  const slug = params?.slug as string;
  
  // Get the article
  const article = await prisma.article.findUnique({
    where: { slug },
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
  });
  
  // Return 404 if article not found or not published
  if (!article || article.status !== 'published') {
    return {
      notFound: true,
    };
  }
  
  // Serialize MDX content
  const contentHtml = await serialize(article.content, {
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug, rehypePrism],
    },
  });
  
  // Find related articles
  const relatedArticles = await prisma.article.findMany({
    where: {
      OR: [
        { categoryId: article.categoryId },
        { tags: { hasSome: article.tags } },
      ],
      AND: [
        { status: 'published' },
        { id: { not: article.id } }, // Exclude current article
      ],
    },
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
    take: 3,
  });
  
  // Close Prisma connection
  await prisma.$disconnect();
  
  // Parse dates for serialization
  const serializedArticle = {
    ...article,
    publishedAt: article.publishedAt?.toISOString() || null,
    updatedAt: article.updatedAt?.toISOString() || null,
    contentHtml,
  };
  
  return {
    props: {
      article: serializedArticle,
      relatedArticles: JSON.parse(JSON.stringify(relatedArticles)),
    },
    // Revalidate after 1 hour
    revalidate: 3600,
  };
}
