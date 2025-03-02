"use client";

import { FC, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  value: string[];
  onChange: (value: string[]) => void;
  maxImages?: number;
}

const ImageUpload: FC<ImageUploadProps> = ({
  value = [],
  onChange,
  maxImages = 5,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  
  // Mock upload function - in a real app, this would upload to a proper storage service
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (!files || files.length === 0) return;
    
    // Check if adding these files would exceed max images
    if (value.length + files.length > maxImages) {
      toast.error(`You can upload a maximum of ${maxImages} images`);
      return;
    }
    
    setIsUploading(true);
    
    try {
      const newImages: string[] = [];
      
      // Process each file - in a real app, this would upload to a cloud storage
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check file type
        if (!file.type.startsWith("image/")) {
          toast.error(`File '${file.name}' is not an image`);
          continue;
        }
        
        // Check file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`File '${file.name}' exceeds 5MB size limit`);
          continue;
        }
        
        // Create a local URL for the file (simulating upload)
        const imageUrl = URL.createObjectURL(file);
        newImages.push(imageUrl);
      }
      
      // Add new images to existing ones
      onChange([...value, ...newImages]);
      
      // Reset the input
      e.target.value = "";
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Failed to upload images");
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleRemoveImage = (indexToRemove: number) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };
  
  const handleAddByUrl = () => {
    // Simple prompt for image URL
    const url = prompt("Enter image URL");
    
    if (!url) return;
    
    if (value.length >= maxImages) {
      toast.error(`You can upload a maximum of ${maxImages} images`);
      return;
    }
    
    try {
      new URL(url); // Validate URL format
      onChange([...value, url]);
    } catch (error) {
      toast.error("Please enter a valid URL");
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {value.map((imageUrl, index) => (
          <div 
            key={`${imageUrl}_${index}`} 
            className="relative aspect-square rounded-md overflow-hidden border"
          >
            <Image
              src={imageUrl}
              alt={`Product image ${index + 1}`}
              fill
              className="object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 rounded-full"
              onClick={() => handleRemoveImage(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        {value.length < maxImages && (
          <div className="border border-dashed rounded-md flex items-center justify-center aspect-square">
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="image-upload"
              disabled={isUploading}
            />
            <label
              htmlFor="image-upload"
              className="cursor-pointer flex flex-col items-center justify-center h-full w-full"
            >
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              ) : (
                <>
                  <ImagePlus className="h-6 w-6 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-2">
                    Upload image
                  </span>
                </>
              )}
            </label>
          </div>
        )}
      </div>
      
      <div className="flex justify-between">
        <p className="text-xs text-gray-500">
          {value.length} of {maxImages} images
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddByUrl}
          disabled={value.length >= maxImages || isUploading}
        >
          Add by URL
        </Button>
      </div>
    </div>
  );
};

export default ImageUpload;
