"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { StarRating } from "./star-rating";
import { useSession } from "next-auth/react";
import ImageUploader from "@/components/ui/image-uploader";
import { useMarketplaceReviews } from "@/hooks/use-marketplace-reviews";
import { Loader2, X } from "lucide-react";
import Image from "next/image";

// Define the form schema with zod
const reviewFormSchema = z.object({
  rating: z.number().min(1).max(5),
  title: z.string().min(3, { message: "Title must be at least 3 characters" }).max(100),
  content: z.string().min(10, { message: "Review must be at least 10 characters" }).max(1000),
  images: z.array(z.string()).optional(),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

interface ReviewFormProps {
  productId?: string;
  orderId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReviewForm({ productId, orderId, onSuccess, onCancel }: ReviewFormProps) {
  const { data: session } = useSession();
  const { submitReview } = useMarketplaceReviews();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize form with react-hook-form
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: 0,
      title: "",
      content: "",
      images: [],
    },
  });

  // Submit handler
  const onSubmit = async (data: ReviewFormValues) => {
    if (!session?.user) {
      toast.error("You must be logged in to submit a review");
      return;
    }

    if (data.rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    try {
      setIsSubmitting(true);
      // Include image URLs
      data.images = images;

      const payload = {
        ...data,
        productId,
        orderId,
      };

      await submitReview(payload);
      toast.success("Review submitted successfully!");
      form.reset();
      setImages([]);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (uploadedImages: string[]) => {
    setImages(uploadedImages);
    form.setValue("images", uploadedImages);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length) return;

    // In a real application, you would upload the files to a storage service
    // For now, we'll just pretend to upload them
    setIsUploading(true);

    try {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles([...selectedFiles, ...newFiles]);

      // Simulate uploading to get URLs
      // In a real app, you would use an upload service and get back URLs
      const newImageUrls = await Promise.all(
        newFiles.map((file) => {
          return new Promise<string>((resolve) => {
            // Create object URL for preview
            const reader = new FileReader();
            reader.onload = () => {
              // In reality, this would be the URL from your storage service
              resolve(reader.result as string);
            };
            reader.readAsDataURL(file);
          });
        })
      );

      setUploadedImages([...uploadedImages, ...newImageUrls]);
      form.setValue("images", [...uploadedImages, ...newImageUrls]);
    } catch (error) {
      toast.error("Error uploading images. Please try again.");
      console.error("Error uploading images:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);

    const newImages = [...uploadedImages];
    newImages.splice(index, 1);
    setUploadedImages(newImages);
    form.setValue("images", newImages);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rating</FormLabel>
              <FormControl>
                <StarRating
                  rating={field.value}
                  onRatingChange={(value) => field.onChange(value)}
                  size="lg"
                  interactive
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Review Title</FormLabel>
              <FormControl>
                <Input placeholder="Summarize your experience" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Review</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Share your experience with this product..."
                  className="min-h-32 resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Your review helps other farmers make better decisions.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel>Add Photos (Optional)</FormLabel>
          <div className="mt-2">
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </div>

          {uploadedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {uploadedImages.map((image, index) => (
                <div key={index} className="relative h-20 w-20">
                  <Image
                    src={image}
                    alt={`Review image ${index + 1}`}
                    fill
                    className="object-cover rounded-md"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {isUploading && (
            <div className="flex items-center mt-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading images...
            </div>
          )}
        </div>

        <div className="flex gap-4 justify-end">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
