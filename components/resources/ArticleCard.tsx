import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistance } from 'date-fns';
import { Badge, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { optimizeImage } from '@/lib/vercel-sdk';
import { Clock, BookOpen } from 'lucide-react';

interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    slug: string;
    summary: string;
    featuredImage?: string;
    publishedAt: Date;
    readTime: number;
    tags?: string[];
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
  showCategory?: boolean;
  className?: string;
}

export function ArticleCard({ article, showCategory = true, className = '' }: ArticleCardProps) {
  const {
    title,
    slug,
    summary,
    featuredImage,
    publishedAt,
    readTime,
    tags,
    author,
    category,
  } = article;

  // Use Vercel SDK's image optimization if a featured image exists
  const optimizedImage = featuredImage ? optimizeImage(featuredImage, { width: 800, height: 400, quality: 85 }) : null;

  return (
    <Card className={`overflow-hidden transition-all duration-200 hover:shadow-md ${className}`}>
      {optimizedImage && (
        <div className="relative h-48 w-full overflow-hidden">
          <Link href={`/resources/articles/${slug}`} passHref>
            <div className="cursor-pointer">
              <Image 
                src={optimizedImage}
                alt={title}
                fill
                className="object-cover transition-transform duration-300 hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          </Link>
        </div>
      )}
      
      <CardHeader className="space-y-1 p-4 pb-2">
        {showCategory && category && (
          <Link href={`/resources/categories/${category.slug}`} passHref>
            <Badge variant="outline" className="mb-1 cursor-pointer hover:bg-secondary">
              {category.name}
            </Badge>
          </Link>
        )}
        
        <Link href={`/resources/articles/${slug}`} passHref>
          <CardTitle className="cursor-pointer text-xl hover:text-primary line-clamp-2">
            {title}
          </CardTitle>
        </Link>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{readTime} min read</span>
          
          {publishedAt && (
            <>
              <span>•</span>
              <span>{formatDistance(new Date(publishedAt), new Date(), { addSuffix: true })}</span>
            </>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <CardDescription className="line-clamp-3">{summary}</CardDescription>
      </CardContent>
      
      <CardFooter className="border-t p-4 flex items-center justify-between">
        {author ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={author.avatar} />
              <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{author.name}</span>
          </div>
        ) : (
          <div />
        )}
        
        {tags && tags.length > 0 && (
          <div className="flex gap-1">
            {tags.slice(0, 2).map((tag) => (
              <Link key={tag} href={`/resources/articles?tag=${tag}`} passHref>
                <Badge variant="secondary" className="cursor-pointer text-xs">
                  {tag}
                </Badge>
              </Link>
            ))}
            {tags.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
