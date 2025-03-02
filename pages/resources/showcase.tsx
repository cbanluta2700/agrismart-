import React, { useState } from 'react';
import Head from 'next/head';
import { Search, Filter, RefreshCw, TrendingUp, Award } from 'lucide-react';
import ResourceCard from '@/components/resources/ResourceCard';
import { Badge } from '@/components/ui/badge';
import CustomPagination from '@/components/ui/custom-pagination';
import { useOptimizedResourceSearch } from '@/hooks/useOptimizedResourceSearch';
import { optimizeResourceImage } from '@/lib/resource-optimizations';

// Sample data for the showcase
const resourceTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'article', label: 'Articles' },
  { value: 'guide', label: 'Guides' },
  { value: 'video', label: 'Videos' },
];

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'crop-management', label: 'Crop Management' },
  { value: 'livestock', label: 'Livestock' },
  { value: 'technology', label: 'Technology' },
  { value: 'sustainability', label: 'Sustainability' },
  { value: 'business', label: 'Business' },
];

// Statistics data
const stats = [
  { 
    label: 'Resources',
    value: '1,200+',
    icon: <RefreshCw className="h-5 w-5 text-green-500" />,
    description: 'Regularly updated content'
  },
  { 
    label: 'Premium Resources',
    value: '350+',
    icon: <Award className="h-5 w-5 text-amber-500" />,
    description: 'Expert-verified content'
  },
  { 
    label: 'Monthly Views',
    value: '86K+',
    icon: <TrendingUp className="h-5 w-5 text-blue-500" />,
    description: 'From farmers worldwide'
  },
];

export default function ResourceShowcase() {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');
  const [page, setPage] = useState(1);
  
  // Use our optimized search hook
  const { data, isLoading } = useOptimizedResourceSearch({
    query: searchQuery,
    type: activeType !== 'all' ? activeType : undefined,
    category: activeCategory !== 'all' ? activeCategory : undefined,
    page: page,
    limit: 9,
  });
  
  // Extract results and pagination info
  const resources = data?.results || [];
  const totalItems = data?.totalItems || 0;
  const totalPages = data?.totalPages || 1;
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
      <Head>
        <title>Resource Showcase | AgriSmart</title>
        <meta name="description" content="Explore our library of agricultural resources including articles, guides, and videos." />
      </Head>
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-hsl-primary/90 to-hsl-accent/90 dark:from-hsl-primary/70 dark:to-hsl-accent/70 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            AgriSmart Resource Library
          </h1>
          <p className="text-white/90 max-w-2xl mb-8">
            Explore our premium collection of articles, guides, and videos designed to help you enhance your agricultural knowledge and productivity.
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-transparent rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-hsl-accent focus:border-transparent shadow-lg"
              placeholder="Search for articles, guides, videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow duration-300 border border-slate-100 dark:border-slate-700"
            >
              <div className="flex items-start">
                <div className="mr-4 bg-slate-100 dark:bg-slate-700 p-3 rounded-full">
                  {stat.icon}
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      
        {/* Filters */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <Filter className="mr-2 h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-medium text-slate-900 dark:text-white">Filters</h2>
          </div>
          
          <div className="space-y-4">
            {/* Resource Types */}
            <div>
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Resource Type</h3>
              <div className="flex flex-wrap gap-2">
                {resourceTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setActiveType(type.value)}
                    className={`${
                      activeType === type.value
                        ? 'bg-hsl-accent text-white shadow-md'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    } px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Categories */}
            <div>
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Category</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => setActiveCategory(category.value)}
                    className={`${
                      activeCategory === category.value
                        ? 'bg-hsl-primary text-white shadow-md'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    } px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Resource Cards */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Featured Resources</h2>
            {totalItems > 0 && (
              <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1">
                {totalItems} results
              </Badge>
            )}
          </div>
          
          {isLoading ? (
            // Loading skeleton
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-lg shadow animate-pulse h-96">
                  <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-t-lg"></div>
                  <div className="p-5 space-y-4">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                    <div className="flex gap-2">
                      <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
                      <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : resources.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.map((resource: any) => (
                  <ResourceCard
                    key={resource.id}
                    id={resource.id}
                    title={resource.title}
                    excerpt={resource.excerpt}
                    featuredImage={resource.featuredImage}
                    author={resource.author}
                    category={resource.category}
                    tags={resource.tags}
                    createdAt={new Date(resource.createdAt)}
                    type={resource.type}
                    readTime={resource.readTime}
                    premium={resource.premium}
                    views={resource.views}
                    bookmarks={resource.bookmarks}
                  />
                ))}
              </div>
            
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <CustomPagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    premium={true}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg shadow">
              <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No resources found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
