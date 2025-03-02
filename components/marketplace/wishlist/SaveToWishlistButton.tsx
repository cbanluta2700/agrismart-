'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSession } from 'next-auth/react';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';

type Wishlist = {
  id: string;
  name: string;
  isDefault: boolean;
};

type WishlistInfo = {
  wishlistId: string;
  wishlistName: string;
  isDefault: boolean;
  itemId: string;
};

interface SaveToWishlistButtonProps {
  productId: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  productName?: string;
}

export default function SaveToWishlistButton({
  productId,
  variant = 'outline',
  size = 'icon',
  className = '',
  productName,
}: SaveToWishlistButtonProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newWishlistName, setNewWishlistName] = useState('');
  const [createNewMode, setCreateNewMode] = useState(false);
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [savedWishlists, setSavedWishlists] = useState<WishlistInfo[]>([]);
  const [isInWishlists, setIsInWishlists] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch user's wishlists
  useEffect(() => {
    const fetchWishlists = async () => {
      if (!session?.user) return;
      
      try {
        setLoading(true);
        
        // Check if product is in any wishlists
        const checkResponse = await fetch(`/api/marketplace/wishlists/check-product?productId=${productId}`);
        const checkData = await checkResponse.json();
        
        setIsInWishlists(checkData.inWishlists);
        setSavedWishlists(checkData.wishlists || []);
        
        // Get user's wishlists
        const wishlistsResponse = await fetch('/api/marketplace/wishlists');
        if (wishlistsResponse.ok) {
          const data = await wishlistsResponse.json();
          setWishlists(data.map((wl: any) => ({
            id: wl.id,
            name: wl.name,
            isDefault: wl.isDefault,
          })));
        }
      } catch (error) {
        console.error('Error fetching wishlists:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchWishlists();
    }
  }, [open, session, productId]);

  // Focus input when creating new wishlist
  useEffect(() => {
    if (createNewMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [createNewMode]);

  const handleCreateWishlist = async () => {
    if (!newWishlistName.trim()) return;
    
    try {
      setLoading(true);
      
      // Create the new wishlist
      const response = await fetch('/api/marketplace/wishlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newWishlistName.trim(),
          isPublic: false,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create wishlist');
      }
      
      const newWishlist = await response.json();
      
      // Add the product to the new wishlist
      await addToWishlist(newWishlist.id);
      
      // Reset state
      setNewWishlistName('');
      setCreateNewMode(false);
      
      toast({
        title: 'Wishlist created!',
        description: `${productName || 'Product'} added to ${newWishlistName}`,
      });
      
      // Close the popover
      setOpen(false);
      
      // Refresh the page to show the updated wishlist status
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create wishlist',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addToWishlist = async (wishlistId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/marketplace/wishlists/${wishlistId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add to wishlist');
      }
      
      // Update the UI to show the product is now saved
      setIsInWishlists(true);
      
      // Find the wishlist name
      const wishlistName = wishlists.find(wl => wl.id === wishlistId)?.name || 'Wishlist';
      
      toast({
        title: 'Added to wishlist!',
        description: `${productName || 'Product'} added to ${wishlistName}`,
      });
      
      // Close the popover
      setOpen(false);
      
      // Refresh the page to show the updated wishlist status
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add to wishlist',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (wishlistId: string, itemId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/marketplace/wishlists/${wishlistId}/items/${itemId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove from wishlist');
      }
      
      // Remove this wishlist from the saved list
      const newSaved = savedWishlists.filter(wl => wl.wishlistId !== wishlistId);
      setSavedWishlists(newSaved);
      
      // If no more wishlists, update the heart status
      if (newSaved.length === 0) {
        setIsInWishlists(false);
      }
      
      // Find the wishlist name
      const wishlistName = wishlists.find(wl => wl.id === wishlistId)?.name || 'Wishlist';
      
      toast({
        title: 'Removed from wishlist',
        description: `${productName || 'Product'} removed from ${wishlistName}`,
      });
      
      // If all items are removed, close the popover
      if (newSaved.length === 0) {
        setOpen(false);
      }
      
      // Refresh the page to show the updated wishlist status
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove from wishlist',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Redirect to login if trying to use wishlist while not logged in
  const handleNotLoggedIn = () => {
    router.push('/auth/login?callbackUrl=' + encodeURIComponent(window.location.pathname));
    toast({
      title: 'Login required',
      description: 'Please login to save items to your wishlist',
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`${className} ${isInWishlists ? 'text-red-500 hover:text-red-600' : ''}`}
          onClick={(e) => {
            if (!session?.user) {
              e.preventDefault();
              handleNotLoggedIn();
            }
          }}
          disabled={loading}
        >
          <Heart className={`h-5 w-5 ${isInWishlists ? 'fill-red-500' : ''}`} />
        </Button>
      </PopoverTrigger>
      
      {session?.user && (
        <PopoverContent className="w-80 p-0">
          <div className="p-4 pb-2">
            <h3 className="font-medium">Save to Wishlist</h3>
            <p className="text-sm text-muted-foreground">
              {productName ? `Save ${productName} to a wishlist` : 'Save this item to a wishlist'}
            </p>
          </div>
          
          <Separator />
          
          {loading ? (
            <div className="flex justify-center items-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <>
              {/* Create new wishlist form */}
              {createNewMode ? (
                <div className="p-4">
                  <Label htmlFor="new-wishlist">New Wishlist Name</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="new-wishlist"
                      ref={inputRef}
                      value={newWishlistName}
                      onChange={(e) => setNewWishlistName(e.target.value)}
                      placeholder="Enter wishlist name"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateWishlist();
                        if (e.key === 'Escape') setCreateNewMode(false);
                      }}
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCreateNewMode(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleCreateWishlist}
                      disabled={!newWishlistName.trim()}
                    >
                      Create & Add
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* List of existing wishlists */}
                  <div className="max-h-[200px] overflow-y-auto">
                    {wishlists.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        You don't have any wishlists yet.
                      </div>
                    ) : (
                      <div className="p-2">
                        {wishlists.map((wishlist) => {
                          const isSaved = savedWishlists.some(wl => wl.wishlistId === wishlist.id);
                          const savedInfo = savedWishlists.find(wl => wl.wishlistId === wishlist.id);
                          
                          return (
                            <div 
                              key={wishlist.id} 
                              className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
                              onClick={() => {
                                if (isSaved) {
                                  removeFromWishlist(wishlist.id, savedInfo!.itemId);
                                } else {
                                  addToWishlist(wishlist.id);
                                }
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Heart className={`h-4 w-4 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
                                <span>{wishlist.name}</span>
                                {wishlist.isDefault && (
                                  <span className="text-xs text-muted-foreground">(Default)</span>
                                )}
                              </div>
                              {isSaved && (
                                <span className="text-xs text-green-600">Saved</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  {/* Create new wishlist button */}
                  <div 
                    className="p-3 flex items-center gap-2 text-sm hover:bg-muted cursor-pointer"
                    onClick={() => setCreateNewMode(true)}
                  >
                    <span className="text-xl">+</span>
                    <span>Create a new wishlist</span>
                  </div>
                </>
              )}
            </>
          )}
        </PopoverContent>
      )}
    </Popover>
  );
}
