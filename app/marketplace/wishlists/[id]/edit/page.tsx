"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Trash } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type Wishlist = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isPublic: boolean;
};

export default function EditWishlistPage() {
  const router = useRouter();
  const params = useParams();
  const wishlistId = params.id as string;
  const { data: session, status } = useSession();
  const { toast } = useToast();
  
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/marketplace/wishlists");
    }
  }, [status, router]);

  // Fetch wishlist details
  useEffect(() => {
    async function fetchWishlist() {
      if (status !== "authenticated" || !wishlistId) return;
      
      try {
        setLoading(true);
        const res = await fetch(`/api/marketplace/wishlists/${wishlistId}`);
        
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Wishlist not found");
          } else if (res.status === 403) {
            throw new Error("You don't have access to this wishlist");
          } else {
            throw new Error("Failed to fetch wishlist");
          }
        }
        
        const data = await res.json();
        setWishlist(data);
        setName(data.name);
        setDescription(data.description || "");
        setIsPublic(data.isPublic);
        setIsDefault(data.isDefault);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchWishlist();
  }, [wishlistId, status]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Wishlist name is required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setSaving(true);
      
      const res = await fetch(`/api/marketplace/wishlists/${wishlistId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description: description || undefined,
          isPublic,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update wishlist");
      }
      
      toast({
        title: "Wishlist updated",
        description: "Your changes have been saved.",
      });
      
      router.push(`/marketplace/wishlists/${wishlistId}`);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this wishlist? All saved items will be removed and this action cannot be undone.")) {
      return;
    }
    
    try {
      setSaving(true);
      
      const res = await fetch(`/api/marketplace/wishlists/${wishlistId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete wishlist");
      }
      
      toast({
        title: "Wishlist deleted",
        description: "Your wishlist has been deleted.",
      });
      
      router.push("/marketplace/wishlists");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto py-12 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/marketplace/wishlists")}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Wishlists</span>
          </Button>
        </div>
        <Alert variant="destructive" className="mb-6">
          {error}
        </Alert>
      </div>
    );
  }

  if (!wishlist) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center py-10">
          <h3 className="text-lg font-medium mb-2">Wishlist not found</h3>
          <Button onClick={() => router.push("/marketplace/wishlists")}>
            Back to My Wishlists
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/marketplace/wishlists/${wishlistId}`)}
          className="flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Wishlist</span>
        </Button>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Edit Wishlist</h1>
        
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={saving}
          className="flex items-center gap-1"
        >
          <Trash className="h-4 w-4" />
          <span>Delete Wishlist</span>
        </Button>
      </div>
      
      <div className="space-y-6">
        <div className="grid gap-2">
          <Label htmlFor="name">Wishlist Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Wishlist"
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Products I'm interested in"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="public">Public Wishlist</Label>
            <p className="text-sm text-muted-foreground">
              Allow others to view this wishlist with a link
            </p>
          </div>
          <Switch
            id="public"
            checked={isPublic}
            onCheckedChange={setIsPublic}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="default">Default Wishlist</Label>
            <p className="text-sm text-muted-foreground">
              Items will be saved to this wishlist by default
            </p>
          </div>
          <Switch
            id="default"
            checked={isDefault}
            disabled={isDefault}
            onCheckedChange={(checked) => {
              if (checked) {
                // Make API call to set as default
                fetch(`/api/marketplace/wishlists/${wishlistId}/set-default`, {
                  method: "POST",
                }).then(res => {
                  if (res.ok) {
                    setIsDefault(true);
                    toast({
                      title: "Default wishlist set",
                      description: "This is now your default wishlist",
                    });
                  }
                }).catch(() => {
                  toast({
                    title: "Error",
                    description: "Failed to set as default wishlist",
                    variant: "destructive",
                  });
                });
              }
            }}
          />
        </div>
        
        <Separator />
        
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex items-center gap-1"
          >
            {saving ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
            <span>Save Changes</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
