import React from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { useRouter } from 'next/router';
import { prisma } from '@/lib/prisma';
import { Layout } from '@/components/layouts/Layout';
import ReputationProfile from '@/components/users/reputation/ReputationProfile';
import EndorsementForm from '@/components/users/reputation/EndorsementForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface UserReputationPageProps {
  user: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  isOwnProfile: boolean;
}

export default function UserReputationPage({ user, isOwnProfile }: UserReputationPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  // Handle endorsement completion
  const handleEndorsementComplete = () => {
    toast({
      title: 'Endorsement Added',
      description: 'Your endorsement has been added successfully.'
    });
    
    // Refresh the reputation profile to show the new endorsement
    router.replace(router.asPath);
  };
  
  if (!user) {
    return (
      <Layout>
        <Alert>
          <AlertDescription>User not found</AlertDescription>
        </Alert>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container py-6 space-y-6 max-w-5xl">
        {/* Header with navigation */}
        <div className="flex items-center gap-2">
          <Link href={`/users/${user.id}`} className="hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold">
            {isOwnProfile ? 'Your Reputation' : `${user.name || 'User'}'s Reputation`}
          </h1>
        </div>
        
        <Separator />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main reputation profile */}
          <div className="md:col-span-2">
            <ReputationProfile userId={user.id} />
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Only show endorsement form if not own profile */}
            {!isOwnProfile && (
              <EndorsementForm 
                userId={user.id} 
                onEndorsementComplete={handleEndorsementComplete}
              />
            )}
            
            {/* Reputation Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>About Reputation</CardTitle>
                <CardDescription>
                  How our reputation system works
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h3 className="font-medium">Reputation Points</h3>
                  <p className="text-muted-foreground">
                    Earn points by contributing to the community through posts, comments, helping others, and more.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium">Trust Levels</h3>
                  <p className="text-muted-foreground">
                    As you earn points, you'll progress through trust levels, unlocking new privileges.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium">Badges</h3>
                  <p className="text-muted-foreground">
                    Earn badges by completing specific achievements and milestones.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium">Endorsements</h3>
                  <p className="text-muted-foreground">
                    Get recognized for your expertise when other users endorse your skills.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { userId } = context.params as { userId: string };
  const session = await getServerSession(context.req, context.res, authOptions);
  
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      image: true
    }
  });
  
  if (!user) {
    return {
      props: {
        user: null,
        isOwnProfile: false
      }
    };
  }
  
  const isOwnProfile = session?.user?.id === userId;
  
  return {
    props: {
      user,
      isOwnProfile
    }
  };
};
