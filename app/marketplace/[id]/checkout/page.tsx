"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@/lib/utils";
import { Product } from "@/types/marketplace";

const checkoutSchema = z.object({
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  shippingAddress: z.object({
    street: z.string().min(1, "Street is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    country: z.string().min(1, "Country is required"),
    postalCode: z.string().min(1, "Postal code is required"),
  }),
  paymentMethod: z.enum(["credit_card", "bank_transfer", "cash_on_delivery"], {
    required_error: "Please select a payment method",
  }),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function CheckoutPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState("");
  
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      quantity: 1,
      shippingAddress: {
        street: "",
        city: "",
        state: "",
        country: "",
        postalCode: "",
      },
      paymentMethod: "credit_card",
    },
  });

  const quantity = form.watch("quantity");
  const totalPrice = product ? product.price * quantity : 0;

  useEffect(() => {
    async function fetchProduct() {
      try {
        setFetchLoading(true);
        const res = await fetch(`/api/marketplace/products/${params.id}`);
        
        if (!res.ok) {
          throw new Error("Failed to fetch product");
        }
        
        const data = await res.json();
        setProduct(data);
      } catch (err: any) {
        setError(err.message || "Failed to load product");
      } finally {
        setFetchLoading(false);
      }
    }

    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  const onSubmit = async (data: CheckoutFormValues) => {
    try {
      setLoading(true);
      
      const orderData = {
        productId: params.id,
        ...data,
        totalPrice,
      };
      
      const res = await fetch("/api/marketplace/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create order");
      }

      const order = await res.json();
      
      // For payment methods that require redirection
      if (data.paymentMethod === "credit_card") {
        router.push(`/marketplace/orders/${order.id}/payment`);
      } else {
        router.push(`/marketplace/orders/${order.id}/confirmation`);
      }
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
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Order Form */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            {...field}
                            onChange={(e) => {
                              field.onChange(e.target.valueAsNumber || 1);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Shipping Address</h3>
                    
                    <FormField
                      control={form.control}
                      name="shippingAddress.street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main St" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="shippingAddress.city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="City" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="shippingAddress.state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State/Province</FormLabel>
                            <FormControl>
                              <Input placeholder="State" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="shippingAddress.postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input placeholder="12345" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="shippingAddress.country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input placeholder="Country" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Payment Method</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="space-y-2"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="credit_card" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Credit Card
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="bank_transfer" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Bank Transfer
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="cash_on_delivery" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Cash on Delivery
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push(`/marketplace/${params.id}`)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? <Spinner className="mr-2" size="sm" /> : null}
                      Place Order
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        
        {/* Order Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="relative h-20 w-20 flex-shrink-0">
                  {product.images && product.images.length > 0 ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover rounded-md"
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs text-gray-400">No image</span>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-medium">{product.name}</h3>
                  <p className="text-gray-500 text-sm">
                    {product.category?.name || "Uncategorized"}
                  </p>
                  <p className="text-sm">
                    {formatCurrency(product.price)} × {quantity}
                  </p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between py-1">
                  <span>Subtotal</span>
                  <span>{formatCurrency(product.price * quantity)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between py-2 font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(totalPrice)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col bg-gray-50 rounded-b-lg">
              <p className="text-sm text-gray-500 mb-2">
                By placing this order, you agree to our Terms of Service and Privacy Policy.
              </p>
              <p className="text-sm text-gray-500">
                Estimated delivery: 3-5 business days
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
