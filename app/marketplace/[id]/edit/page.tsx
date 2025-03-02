"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ImageUploader from "@/components/marketplace/ImageUploader";
import LocationPicker from "@/components/marketplace/LocationPicker";
import { Spinner } from "@/components/ui/spinner";
import { Product } from "@/types/marketplace";

const productSchema = z.object({
  name: z.string().min(3, "Title must be at least 3 characters").max(100, "Title cannot exceed 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.coerce.number().positive("Price must be greater than zero"),
  categoryId: z.string().min(1, "Category is required"),
  condition: z.enum(["new", "used"], {
    required_error: "Please select a condition",
  }),
  images: z.array(z.string().url()).min(1, "At least one image is required"),
  location: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number()]),
    address: z.string().min(1, "Address is required"),
  }),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    // Default values will be set once product data is loaded
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      categoryId: "",
      condition: "new",
      images: [],
      location: {
        type: "Point",
        coordinates: [0, 0],
        address: "",
      },
    },
  });

  useEffect(() => {
    async function fetchData() {
      try {
        setFetchLoading(true);
        
        // Fetch product and categories in parallel
        const [productRes, categoriesRes] = await Promise.all([
          fetch(`/api/marketplace/products/${params.id}`),
          fetch('/api/marketplace/categories')
        ]);
        
        if (!productRes.ok) {
          throw new Error("Failed to fetch product");
        }
        
        if (!categoriesRes.ok) {
          throw new Error("Failed to fetch categories");
        }
        
        const productData = await productRes.json();
        const categoriesData = await categoriesRes.json();
        
        setProduct(productData);
        setCategories(categoriesData);
        
        // Set form values with product data
        form.reset({
          name: productData.name,
          description: productData.description,
          price: productData.price,
          categoryId: productData.categoryId,
          condition: productData.condition,
          images: productData.images || [],
          location: productData.location || {
            type: "Point",
            coordinates: [0, 0],
            address: "",
          },
        });
      } catch (err: any) {
        setError(err.message || "Failed to load product data");
      } finally {
        setFetchLoading(false);
      }
    }

    if (params.id) {
      fetchData();
    }
  }, [params.id, form]);

  const onSubmit = async (data: ProductFormValues) => {
    try {
      setLoading(true);
      
      const res = await fetch(`/api/marketplace/products/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update product");
      }

      const updatedProduct = await res.json();
      router.push(`/marketplace/${updatedProduct.id}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      window.scrollTo(0, 0);
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="container mx-auto py-6 px-4 flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Product not found"}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/marketplace")} className="mt-4">
          Return to Marketplace
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Edit Product: {product.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product title" {...field} />
                    </FormControl>
                    <FormDescription>
                      Choose a clear, descriptive title for your product.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e.target.valueAsNumber);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Condition</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="new" />
                          </FormControl>
                          <FormLabel className="cursor-pointer">New</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="used" />
                          </FormControl>
                          <FormLabel className="cursor-pointer">Used</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your product..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Include details like features, condition, age, and reason for selling.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Images</FormLabel>
                    <FormControl>
                      <ImageUploader
                        value={field.value}
                        onChange={field.onChange}
                        onUploading={setUploading}
                      />
                    </FormControl>
                    <FormDescription>
                      Upload at least one image. First image will be the main display image.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <LocationPicker
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Select the location where the product is available
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/marketplace/${params.id}`)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || uploading}
                >
                  {loading ? <Spinner className="mr-2" size="sm" /> : null}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
