"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Flag, Star, AlertTriangle } from "lucide-react";

export default function ReviewsManagementPage() {
  const { data: session, status } = useSession();
  
  // Redirect if not authenticated
  if (status === "unauthenticated") {
    redirect("/auth/signin?callbackUrl=/admin/reviews");
  }
  
  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Review Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage and moderate user reviews for the AgriSmart marketplace.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-orange-500" />
                Review Moderation
              </CardTitle>
              <CardDescription>
                Approve, reject, or hide user-submitted reviews
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Manage reported reviews and ensure quality content on the marketplace.
              </p>
              <Link href="/admin/reviews/moderation">
                <Button>Moderate Reviews</Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Product Reviews
              </CardTitle>
              <CardDescription>
                View all product reviews across the marketplace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Filter and search through all reviews submitted by users.
              </p>
              <Button variant="outline">View All Reviews</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Content Filtering
              </CardTitle>
              <CardDescription>
                Manage automated content filtering settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Update the list of blocked keywords and filtering rules.
              </p>
              <Button variant="outline" disabled>Manage Filters (Coming Soon)</Button>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Review Analytics</CardTitle>
            <CardDescription>
              Overview of review statistics and trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-10">
              <p className="text-muted-foreground">
                Review analytics dashboard coming soon
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
