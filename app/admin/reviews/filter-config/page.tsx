"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { X, Plus, Save, AlertTriangle } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";

interface FilterConfig {
  enabled: boolean;
  blockedKeywords: string[];
  autoRejectThreshold: number;
}

export default function FilterConfigPage() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    enabled: true,
    blockedKeywords: [],
    autoRejectThreshold: 3
  });
  const [newKeyword, setNewKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // Fetch current filter configuration
  const fetchFilterConfig = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get("/api/marketplace/reviews/filter/config");
      setFilterConfig(response.data);
    } catch (err: any) {
      console.error("Error fetching filter config:", err);
      setError(err.response?.data?.message || "Failed to load filter configuration");
      toast.error("Failed to load filter configuration");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save filter configuration
  const saveFilterConfig = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      await axios.post("/api/marketplace/reviews/filter/config", filterConfig);
      toast.success("Filter configuration saved successfully");
    } catch (err: any) {
      console.error("Error saving filter config:", err);
      setError(err.response?.data?.message || "Failed to save filter configuration");
      toast.error("Failed to save filter configuration");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Add a new keyword
  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    
    // Check if keyword already exists
    if (filterConfig.blockedKeywords.includes(newKeyword.trim().toLowerCase())) {
      toast.error("This keyword is already in the list");
      return;
    }
    
    setFilterConfig({
      ...filterConfig,
      blockedKeywords: [
        ...filterConfig.blockedKeywords,
        newKeyword.trim().toLowerCase()
      ]
    });
    
    setNewKeyword("");
  };
  
  // Remove a keyword
  const removeKeyword = (keyword: string) => {
    setFilterConfig({
      ...filterConfig,
      blockedKeywords: filterConfig.blockedKeywords.filter(k => k !== keyword)
    });
  };
  
  // Set auto-reject threshold
  const setThreshold = (value: string) => {
    const threshold = parseInt(value, 10);
    if (isNaN(threshold) || threshold < 1) return;
    
    setFilterConfig({
      ...filterConfig,
      autoRejectThreshold: threshold
    });
  };
  
  // Handle keyboard input for adding keywords
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    }
  };
  
  // Initialize by fetching filter config
  useEffect(() => {
    if (status === "authenticated") {
      fetchFilterConfig();
    }
  }, [status]);
  
  // Redirect if not authenticated
  if (status === "unauthenticated") {
    redirect("/auth/signin?callbackUrl=/admin/reviews/filter-config");
  }
  
  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Review Content Filtering</h1>
          <p className="text-muted-foreground mt-2">
            Configure automated content filtering for user reviews
          </p>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-[40vh]">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Content Filter Settings</CardTitle>
                <CardDescription>
                  Configure automatic filtering of potentially inappropriate review content
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Enable Content Filtering</h3>
                    <p className="text-sm text-muted-foreground">
                      When enabled, reviews containing blocked keywords will be flagged for moderation
                    </p>
                  </div>
                  <Switch
                    checked={filterConfig.enabled}
                    onCheckedChange={(checked) => 
                      setFilterConfig({ ...filterConfig, enabled: checked })
                    }
                  />
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Auto-Reject Threshold</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Reviews containing more than this number of blocked keywords will be automatically rejected
                  </p>
                  <div className="w-24">
                    <Input
                      type="number"
                      min="1"
                      value={filterConfig.autoRejectThreshold}
                      onChange={(e) => setThreshold(e.target.value)}
                      disabled={!filterConfig.enabled}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Blocked Keywords</CardTitle>
                <CardDescription>
                  Reviews containing these words or phrases will be flagged for moderation
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="flex gap-2 mb-6">
                  <div className="flex-1">
                    <Label htmlFor="newKeyword" className="sr-only">
                      Add new keyword
                    </Label>
                    <Input
                      id="newKeyword"
                      placeholder="Enter a new keyword or phrase to block"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!filterConfig.enabled || isSaving}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={addKeyword}
                    disabled={!newKeyword.trim() || !filterConfig.enabled || isSaving}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                
                {filterConfig.blockedKeywords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No blocked keywords added yet</p>
                    <p className="text-sm mt-1">
                      Add keywords that should be flagged in user reviews
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {filterConfig.blockedKeywords.map((keyword) => (
                      <Badge
                        key={keyword}
                        variant="secondary"
                        className="px-2 py-1 flex items-center gap-1"
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() => removeKeyword(keyword)}
                          className="ml-1 text-muted-foreground hover:text-foreground"
                          disabled={isSaving}
                        >
                          <X className="h-3 w-3" />
                          <span className="sr-only">Remove {keyword}</span>
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex justify-end">
                <Button
                  type="button"
                  onClick={saveFilterConfig}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Configuration
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
