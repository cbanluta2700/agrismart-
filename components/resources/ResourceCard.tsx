import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Calendar, Clock, Star, Bookmark, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { optimizeResourceImage } from '@/lib/resource-optimizations';

interface ResourceCardProps {
  id: string;
  title: string;
  excerpt: string;
  featuredImage?: string;
  author: {
    name: string;
    avatar?: string;
  };
  category: string;
  tags: string[];
  createdAt: Date;
  type: 'article' | 'guide' | 'video';
  readTime?: number;
  premium?: boolean;
  views?: number;
  bookmarks?: number;
}

const ResourceCard = ({
  id,
  title,
  excerpt,
  featuredImage,
  author,
  category,
  tags,
  createdAt,
  type,
  readTime,
  premium = false,
  views,
  bookmarks,
}: ResourceCardProps) => {
  // Determine resource URL based on type
  const resourceUrl = `/resources/${type}s/${id}`;
  
  // Format the date (e.g., "2 days ago")
  const formattedDate = formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  
  // Get type icon and color
  const getTypeIcon = () => {
    switch (type) {
      case 'article':
        return <div className="w-8 h-8 flex items-center justify-center bg-blue-500/10 text-blue-500 rounded-full">📄</div>;
      case 'guide':
        return <div className="w-8 h-8 flex items-center justify-center bg-green-500/10 text-green-500 rounded-full">📚</div>;
      case 'video':
        return <div className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-full">🎬</div>;
      default:
        return <div className="w-8 h-8 flex items-center justify-center bg-slate-500/10 text-slate-500 rounded-full">📄</div>;
    }
  }
  
  // Optimize images with Vercel SDK
  const optimizedFeaturedImage = featuredImage ? optimizeResourceImage(featuredImage, 'thumbnail') : undefined;
  const optimizedAuthorAvatar = author.avatar ? optimizeResourceImage(author.avatar, 'avatar') : undefined;
  
  return (
    <Link href={resourceUrl} className="block h-full">
      <article 
        className={`card-premium group transition-all duration-300 h-full flex flex-col relative overflow-hidden ${
          premium ? 'shadow-md hover:shadow-xl' : 'border-hsl-accent/10'
        } animate-fade-in`}
      >
        {/* Featured Image */}
        {optimizedFeaturedImage ? (
          <div className="relative h-48 w-full overflow-hidden">
            <Image
              src={optimizedFeaturedImage}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              priority={false}
            />
            {premium && (
              <div className="absolute top-3 right-3">
                <Badge className="badge-premium flex items-center gap-1 bg-hsl-accent/80 backdrop-blur-sm text-white shadow-lg">
                  <Star className="h-3 w-3" />
                  Premium
                </Badge>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
            
            {/* Resource Type - On Featured Image */}
            <div className="absolute top-3 left-3">
              <Badge 
                className={`${
                  type === 'article' ? 'bg-blue-500' : 
                  type === 'guide' ? 'bg-green-500' : 
                  'bg-red-500'
                } text-white px-3 py-1 capitalize shadow-md`}
              >
                {type}
              </Badge>
            </div>
            
            {/* Category - On Featured Image */}
            <div className="absolute bottom-3 left-3">
              <Badge className="badge-premium bg-white/80 dark:bg-black/50 backdrop-blur-sm text-slate-800 dark:text-white border-transparent shadow-sm">
                {category}
              </Badge>
            </div>
          </div>
        ) : (
          // No featured image - different layout
          <div className="flex justify-between items-center px-5 pt-5">
            {getTypeIcon()}
            
            <div className="flex items-center gap-2">
              <Badge 
                className={`${
                  type === 'article' ? 'bg-blue-500/10 text-blue-500 border-blue-200' : 
                  type === 'guide' ? 'bg-green-500/10 text-green-500 border-green-200' : 
                  'bg-red-500/10 text-red-500 border-red-200'
                } px-3 capitalize`}
              >
                {type}
              </Badge>
              
              <Badge className="badge-secondary">
                {category}
              </Badge>
              
              {premium && (
                <Badge className="badge-premium flex items-center gap-1 bg-hsl-accent/80 text-white">
                  <Star className="h-3 w-3" />
                  Premium
                </Badge>
              )}
            </div>
          </div>
        )}
        
        <div className="flex flex-col flex-grow p-5">
          {/* Title & Excerpt */}
          <h3 className="text-xl font-bold mb-2 group-hover:text-hsl-accent transition-colors">
            {title}
          </h3>
          <p className="text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">{excerpt}</p>
          
          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.slice(0, 3).map((tag) => (
                <Badge 
                  key={tag} 
                  variant="secondary" 
                  className={`text-xs ${premium ? 'badge-secondary' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
                >
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${premium ? 'badge-secondary' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
                >
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          {/* Stats Row - Views and Bookmarks */}
          <div className="flex items-center gap-4 mb-4 text-xs text-slate-500 dark:text-slate-400">
            {views !== undefined && (
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{views.toLocaleString()} views</span>
              </div>
            )}
            
            {bookmarks !== undefined && (
              <div className="flex items-center gap-1">
                <Bookmark className="h-3 w-3" />
                <span>{bookmarks.toLocaleString()} bookmarks</span>
              </div>
            )}
            
            {readTime && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{readTime} min read</span>
              </div>
            )}
          </div>
          
          {/* Bottom Meta Section with Author */}
          <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {author.avatar ? (
                <div className="relative">
                  <Image
                    src={optimizedAuthorAvatar || ''}
                    alt={author.name}
                    width={28}
                    height={28}
                    className="rounded-full border-2 border-white dark:border-slate-800 shadow-sm"
                  />
                  {premium && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-hsl-accent rounded-full border border-white dark:border-slate-800" />
                  )}
                </div>
              ) : (
                <div className="relative">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-hsl-primary to-hsl-accent text-white flex items-center justify-center text-xs shadow-sm">
                    {author.name.charAt(0)}
                  </div>
                  {premium && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-hsl-accent rounded-full border border-white dark:border-slate-800" />
                  )}
                </div>
              )}
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{author.name}</span>
            </div>
            
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1">
              <Calendar className="h-3 w-3 mr-1" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
        
        {/* Premium Effect - Subtle Gradient Border on Hover */}
        {premium && (
          <div className="absolute inset-0 rounded-lg border-2 border-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
               style={{
                 background: 'linear-gradient(to right, transparent, transparent) padding-box, linear-gradient(to right, #38FF7E, #0D3F1F) border-box'
               }}
          />
        )}
        
        {/* Corner fold effect for premium content */}
        {premium && (
          <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 rotate-45 w-16 h-4 bg-gradient-to-r from-hsl-accent to-hsl-primary shadow-md" />
          </div>
        )}
      </article>
    </Link>
  );
};

export default ResourceCard;
