import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import FlaggedContentList from '@/components/moderation/FlaggedContentList';
import ContentQualityReview from '@/components/moderation/ContentQualityReview';
import { ResourceType } from '@prisma/client';

export default function FlaggedContentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [flaggedResources, setFlaggedResources] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  
  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin/moderation/flagged-content');
    }
  }, [status, router]);
  
  // Fetch flagged resources
  const fetchFlaggedResources = async (tab: string = 'all') => {
    try {
      setLoading(true);
      
      // Determine resource types based on active tab
      let types: ResourceType[] | undefined;
      switch (tab) {
        case 'articles':
          types = ['ARTICLE'];
          break;
        case 'guides':
          types = ['GUIDE'];
          break;
        case 'videos':
          types = ['VIDEO'];
          break;
        case 'glossary':
          types = ['GLOSSARY'];
          break;
        default:
          types = undefined;
      }
      
      // Build query params
      const params = new URLSearchParams();
      params.append('limit', pagination.limit.toString());
      params.append('offset', pagination.offset.toString());
      if (types) {
        params.append('types', types.join(','));
      }
      
      // Fetch resources
      const response = await axios.get(`/api/admin/resources/moderation/flagged-content?${params.toString()}`);
      
      setFlaggedResources(response.data.resources);
      setPagination(response.data.pagination);
      
      // Select first resource if available and none is selected
      if (response.data.resources.length > 0 && !selectedResource) {
        setSelectedResource(response.data.resources[0]);
      }
    } catch (error) {
      console.error('Error fetching flagged resources:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPagination({
      ...pagination,
      offset: 0,
    });
    setSelectedResource(null);
    fetchFlaggedResources(tab);
  };
  
  // Handle pagination
  const handleLoadMore = () => {
    if (pagination.hasMore) {
      setPagination({
        ...pagination,
        offset: pagination.offset + pagination.limit,
      });
    }
  };
  
  // Handle resource selection
  const handleSelectResource = (resource: any) => {
    setSelectedResource(resource);
  };
  
  // Handle moderator feedback submission
  const handleFeedbackSubmit = async (feedback: any) => {
    try {
      if (!selectedResource) return;
      
      const response = await axios.post('/api/admin/resources/moderation/flagged-content', {
        resourceId: selectedResource.id,
        feedback,
      });
      
      if (response.data.success) {
        // Remove the processed resource from the list
        setFlaggedResources(flaggedResources.filter(r => r.id !== selectedResource.id));
        
        // Select next resource if available
        if (flaggedResources.length > 1) {
          const currentIndex = flaggedResources.findIndex(r => r.id === selectedResource.id);
          const nextIndex = currentIndex + 1 < flaggedResources.length ? currentIndex + 1 : 0;
          setSelectedResource(flaggedResources[nextIndex]);
        } else {
          setSelectedResource(null);
          // Fetch more resources if available
          if (pagination.hasMore) {
            fetchFlaggedResources(activeTab);
          }
        }
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };
  
  // Fetch resources on initial load
  useEffect(() => {
    if (status === 'authenticated') {
      fetchFlaggedResources(activeTab);
    }
  }, [status, pagination.offset]);
  
  // Handle loading state
  if (status === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">AI-Assisted Content Moderation</h1>
        
        <Tabs defaultValue="all" onValueChange={handleTabChange}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="articles">Articles</TabsTrigger>
            <TabsTrigger value="guides">Guides</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="glossary">Glossary</TabsTrigger>
          </TabsList>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4">Flagged Content ({pagination.total})</h2>
                
                <FlaggedContentList
                  resources={flaggedResources}
                  selectedId={selectedResource?.id}
                  onSelect={handleSelectResource}
                  onLoadMore={handleLoadMore}
                  hasMore={pagination.hasMore}
                />
              </div>
            </div>
            
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-4">
                {selectedResource ? (
                  <ContentQualityReview
                    resource={selectedResource}
                    onFeedbackSubmit={handleFeedbackSubmit}
                  />
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-gray-500">Select a flagged resource to review</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
