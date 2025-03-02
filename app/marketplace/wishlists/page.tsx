"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { Heart, Share2, Trash, Lock, Globe, Plus, FileEdit } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";

type Wishlist = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    items: number;
  };
};

export default function WishlistsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newWishlistName, setNewWishlistName] = useState("");
  const [newWishlistDescription, setNewWishlistDescription] = useState("");
  const [newWishlistPublic, setNewWishlistPublic] = useState(false);
  const [isCreatingWishlist, setIsCreatingWishlist] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/marketplace/wishlists");
    }
  }, [status, router]);

  // Fetch user's wishlists
  useEffect(() => {
    async function fetchWishlists() {
      if (status !== "authenticated") return;
      
      try {
        setLoading(true);
        const res = await fetch("/api/marketplace/wishlists?includeItems=false");
        
        if (!res.ok) {
          throw new Error("Failed to fetch wishlists");
        }
        
        const data = await res.json();
        setWishlists(data);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchWishlists();
  }, [status]);

  const handleCreateWishlist = async () => {
    if (!newWishlistName.trim()) return;
    
    try {
      setIsCreatingWishlist(true);
      
      const res = await fetch("/api/marketplace/wishlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newWishlistName,
          description: newWishlistDescription || undefined,
          isPublic: newWishlistPublic,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create wishlist");
      }
      
      const newWishlist = await res.json();
      
      setWishlists(prev => [newWishlist, ...prev]);
      setNewWishlistName("");
      setNewWishlistDescription("");
      setNewWishlistPublic(false);
      setShowCreateDialog(false);
      
      toast({
        title: "Wishlist created",
        description: `Your wishlist '${newWishlist.name}' has been created.`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsCreatingWishlist(false);
    }
  };

  const handleDeleteWishlist = async (wishlistId: string, wishlistName: string) => {
    if (!confirm(`Are you sure you want to delete '${wishlistName}'? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const res = await fetch(`/api/marketplace/wishlists/${wishlistId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete wishlist");
      }
      
      setWishlists(prev => prev.filter(wl => wl.id !== wishlistId));
      
      toast({
        title: "Wishlist deleted",
        description: `Your wishlist '${wishlistName}' has been deleted.`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto py-12 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Wishlists</h1>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              <span>Create Wishlist</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a new wishlist</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newWishlistName}
                  onChange={(e) => setNewWishlistName(e.target.value)}
                  placeholder="My Wishlist"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={newWishlistDescription}
                  onChange={(e) => setNewWishlistDescription(e.target.value)}
                  placeholder="Products I'm interested in"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newWishlistPublic}
                  onChange={(e) => setNewWishlistPublic(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="isPublic" className="text-sm">Make this wishlist public (can be shared with others)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateWishlist}
                disabled={!newWishlistName.trim() || isCreatingWishlist}
              >
                {isCreatingWishlist ? <Spinner size="sm" /> : "Create Wishlist"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          {error}
        </Alert>
      )}

      {wishlists.length === 0 ? (
        <div className="text-center py-10 border border-dashed rounded-lg">
          <Heart className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No wishlists yet</h3>
          <p className="text-gray-500 mb-4">Create your first wishlist to save products you're interested in</p>
          <Button onClick={() => setShowCreateDialog(true)}>Create Your First Wishlist</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlists.map((wishlist) => (
            <Card key={wishlist.id} className="h-full flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    {wishlist.name}
                    {wishlist.isDefault && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">Default</span>
                    )}
                  </CardTitle>
                  <div className="flex items-center">
                    {wishlist.isPublic ? (
                      <Globe className="h-4 w-4 text-muted-foreground" title="Public wishlist" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" title="Private wishlist" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                {wishlist.description && (
                  <p className="text-sm text-muted-foreground mb-2">{wishlist.description}</p>
                )}
                <div className="text-sm text-muted-foreground">
                  <p>Items: {wishlist._count?.items || 0}</p>
                  <p>Created: {formatDate(wishlist.createdAt)}</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteWishlist(wishlist.id, wishlist.name)}
                  className="flex items-center gap-1 hover:text-red-500"
                >
                  <Trash className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
                <div className="flex gap-2">
                  {wishlist.isPublic && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/marketplace/wishlists/${wishlist.id}/shared`);
                        toast({
                          title: "Link copied",
                          description: "Wishlist link copied to clipboard",
                        });
                      }}
                      className="flex items-center gap-1"
                    >
                      <Share2 className="h-4 w-4" />
                      <span className="sr-only">Share</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/marketplace/wishlists/${wishlist.id}/edit`)}
                    className="flex items-center gap-1"
                  >
                    <FileEdit className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    onClick={() => router.push(`/marketplace/wishlists/${wishlist.id}`)}
                    size="sm"
                  >
                    View
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
