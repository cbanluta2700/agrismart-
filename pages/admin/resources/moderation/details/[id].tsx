import React, { useState } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { unstable_getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ModeratedContentStatus } from '@/components/resources/ModeratedContentStatus';
import { ContentTypeIndicator } from '@/components/resources/ContentTypeIndicator';
import { 
  ChevronLeft, Clock, Eye, Check, X, User, Shield, CalendarIcon
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ResourceContentType, ResourceStatus } from '@/types/resources';
import { useResourceModeration } from '@/hooks/useResourceModeration';

interface ModerationLogEntry {
  id: string;
  action: string;
  status: string;
  reason: string | null;
  createdAt: string;
  moderator: {
    id: string;
    name: string;
  };
}

interface ResourceDetails {
  id: string;
  title: string;
  slug?: string;
  description: string;
  content: string;
  contentType: ResourceContentType;
  status: ResourceStatus;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  viewCount: number;
  category: string;
  tags: string[];
  thumbnailUrl?: string;
  moderationLog?: ModerationLogEntry[];
}

interface ContentModerationDetailsProps {
  resource: ResourceDetails;
}

const ContentModerationDetails: NextPage<ContentModerationDetailsProps> = ({ resource }) => {
  const router = useRouter();
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const { 
    approveResource, 
    rejectResource, 
    deleteResource, 
    isLoading: isSubmitting, 
    error 
  } = useResourceModeration({
    onSuccess: (action) => {
      setActionDialogOpen(false);
      router.push(`/admin/resources/moderation?action=${action}`);
    },
  });

  const openActionDialog = (action: 'approve' | 'reject') => {
    setActionType(action);
    setRejectionReason('');
    setActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!actionType) return;
    
    if (actionType === 'approve') {
      await approveResource(resource.id, resource.contentType);
    } else if (actionType === 'reject') {
      await rejectResource(resource.id, resource.contentType, rejectionReason);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this resource? This action cannot be undone.")) {
      await deleteResource(resource.id, resource.contentType);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminLayout>
      <Head>
        <title>Content Moderation Details | AgriSmart Admin</title>
      </Head>

      <div className="container mx-auto py-8">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/admin/resources/moderation')}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to moderation
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main content area */}
          <div className="md:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">{resource.title}</CardTitle>
                    <CardDescription>
                      {resource.description}
                    </CardDescription>
                  </div>
                  <ContentTypeIndicator type={resource.contentType} />
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="content">
                  <TabsList className="mb-4">
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                  <TabsContent value="content">
                    <div className="p-4 border rounded-md bg-gray-50 overflow-auto max-h-96">
                      <pre className="whitespace-pre-wrap">{resource.content}</pre>
                    </div>
                  </TabsContent>
                  <TabsContent value="preview">
                    <div className="p-4 border rounded-md overflow-auto max-h-96">
                      <div dangerouslySetInnerHTML={{ __html: resource.content }} />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-6">
                <div className="flex space-x-4">
                  <Button 
                    asChild
                    variant="outline"
                  >
                    <Link 
                      href={`/resources/${resource.contentType}s/${resource.slug || resource.id}`}
                      target="_blank"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Link>
                  </Button>
                  <Button 
                    asChild
                    variant="outline"
                  >
                    <Link href={`/admin/resources/edit/${resource.contentType}/${resource.id}`}>
                      Edit
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                </div>
                {resource.status === 'PENDING' && (
                  <div className="flex space-x-2">
                    <Button 
                      variant="destructive" 
                      onClick={() => openActionDialog('reject')}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button 
                      onClick={() => openActionDialog('approve')}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                  </div>
                )}
              </CardFooter>
            </Card>

            {/* Moderation history */}
            <Card>
              <CardHeader>
                <CardTitle>Moderation History</CardTitle>
              </CardHeader>
              <CardContent>
                {resource.moderationLog && resource.moderationLog.length > 0 ? (
                  <div className="space-y-4">
                    {resource.moderationLog.map((log) => (
                      <div key={log.id} className="p-4 border rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="font-medium">
                              {log.action === 'approve' ? 'Approved' : 'Rejected'} by {log.moderator.name}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatDate(log.createdAt)}
                          </div>
                        </div>
                        {log.reason && (
                          <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded">
                            <strong>Reason:</strong> {log.reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    No moderation history found
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Current Status</p>
                    <ModeratedContentStatus status={resource.status} size="lg" />
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Author</p>
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{resource.authorName}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 mb-1">Created</p>
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{formatDate(resource.createdAt)}</span>
                    </div>
                  </div>

                  {resource.publishedAt && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Published</p>
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{formatDate(resource.publishedAt)}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-gray-500 mb-1">Last Updated</p>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{formatDate(resource.updatedAt)}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 mb-1">Views</p>
                    <div className="flex items-center">
                      <Eye className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{resource.viewCount}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Category</p>
                    <div className="text-sm bg-gray-100 px-2 py-1 rounded inline-block">
                      {resource.category}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 mb-1">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {resource.tags && resource.tags.length > 0 ? (
                        resource.tags.map((tag) => (
                          <div key={tag} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {tag}
                          </div>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">No tags</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Approve/Reject Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Content' : 'Reject Content'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? `Are you sure you want to approve "${resource.title}"?`
                : `Please provide a reason for rejecting "${resource.title}".`}
            </DialogDescription>
          </DialogHeader>
          
          {actionType === 'reject' && (
            <div className="py-4">
              <Textarea
                placeholder="Reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              variant={actionType === 'approve' ? 'default' : 'destructive'} 
              onClick={handleAction}
              disabled={(actionType === 'reject' && !rejectionReason.trim()) || isSubmitting}
            >
              {isSubmitting ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && (
        <div className="fixed bottom-0 left-0 right-0 bg-red-500 text-white p-4 text-center">
          {error.message}
        </div>
      )}
    </AdminLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await unstable_getServerSession(context.req, context.res, authOptions);
  
  // Check if user is authenticated and has admin privileges
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user?.role as string)) {
    return {
      redirect: {
        destination: '/api/auth/signin',
        permanent: false,
      },
    };
  }

  const { id } = context.params as { id: string };
  
  try {
    // First, get the resource type
    const resourceType = await prisma.resource.findUnique({
      where: { id },
      select: { contentType: true }
    });

    if (!resourceType) {
      return { notFound: true };
    }

    let resourceData: any = null;
    
    // Get the resource data based on content type
    switch (resourceType.contentType) {
      case 'article': {
        resourceData = await prisma.article.findUnique({
          where: { id },
          include: {
            author: { select: { id: true, name: true } },
            moderationLog: {
              orderBy: { createdAt: 'desc' },
              include: { moderator: { select: { id: true, name: true } } }
            }
          }
        });
        break;
      }
      case 'guide': {
        resourceData = await prisma.guide.findUnique({
          where: { id },
          include: {
            author: { select: { id: true, name: true } },
            moderationLog: {
              orderBy: { createdAt: 'desc' },
              include: { moderator: { select: { id: true, name: true } } }
            }
          }
        });
        break;
      }
      case 'video': {
        resourceData = await prisma.video.findUnique({
          where: { id },
          include: {
            author: { select: { id: true, name: true } },
            moderationLog: {
              orderBy: { createdAt: 'desc' },
              include: { moderator: { select: { id: true, name: true } } }
            }
          }
        });
        break;
      }
      case 'glossary': {
        resourceData = await prisma.glossaryTerm.findUnique({
          where: { id },
          include: {
            author: { select: { id: true, name: true } },
            moderationLog: {
              orderBy: { createdAt: 'desc' },
              include: { moderator: { select: { id: true, name: true } } }
            }
          }
        });
        break;
      }
    }

    if (!resourceData) {
      return { notFound: true };
    }

    // Transform the data to include author name and format dates
    const resource: ResourceDetails = {
      ...resourceData,
      authorName: resourceData.author.name,
      contentType: resourceType.contentType,
      createdAt: resourceData.createdAt.toISOString(),
      updatedAt: resourceData.updatedAt.toISOString(),
      publishedAt: resourceData.publishedAt ? resourceData.publishedAt.toISOString() : undefined,
      // Transform moderation log if it exists
      moderationLog: resourceData.moderationLog ? 
        resourceData.moderationLog.map((log: any) => ({
          ...log,
          createdAt: log.createdAt.toISOString(),
          moderator: {
            id: log.moderator.id,
            name: log.moderator.name
          }
        })) : []
    };

    return {
      props: {
        resource,
      },
    };
  } catch (error) {
    console.error('Error fetching resource:', error);
    return { notFound: true };
  }
};

export default ContentModerationDetails;
