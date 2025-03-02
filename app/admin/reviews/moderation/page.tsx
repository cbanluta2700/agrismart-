"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { ReviewModerationList } from "@/components/admin/reviews/review-moderation-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

export default function ReviewModerationPage() {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Check if user is authenticated and has admin role
    if (status === "loading") return;
    
    if (!session) {
      redirect("/auth/signin?callbackUrl=/admin/reviews/moderation");
      return;
    }
    
    // Check if user has admin role
    const checkAdminStatus = async () => {
      try {
        const response = await fetch("/api/auth/check-role?role=ADMIN");
        const data = await response.json();
        
        setIsAdmin(data.hasRole);
        setIsLoading(false);
        
        if (!data.hasRole) {
          // Redirect to unauthorized page
          redirect("/unauthorized");
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [session, status]);
  
  // Show loading state
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <p className="text-lg">Loading...</p>
        </div>
      </AdminLayout>
    );
  }
  
  // Show access denied message
  if (!isAdmin) {
    return (
      <AdminLayout>
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700">
            You do not have permission to access this page. This page requires administrator privileges.
          </AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Review Moderation</h1>
          <p className="text-muted-foreground mt-2">
            Manage and moderate user reviews to ensure quality content for the marketplace.
          </p>
        </div>
        
        <Tabs defaultValue="moderation">
          <TabsList className="mb-6">
            <TabsTrigger value="moderation">Moderation Queue</TabsTrigger>
            <TabsTrigger value="stats">Review Statistics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="moderation">
            <Card>
              <CardContent className="pt-6">
                <ReviewModerationList />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <CardTitle>Review Statistics</CardTitle>
                <CardDescription>
                  Overview of review activity and moderation metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">--</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-sm font-medium">Flagged Reviews</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">--</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-sm font-medium">Reviews Moderated Today</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">--</div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-6 text-center text-sm text-muted-foreground">
                  <p>Review statistics dashboard coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
