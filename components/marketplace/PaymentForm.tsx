"use client";

import { FC } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CreditCard, Landmark, Truck } from "lucide-react";

// Validation schema for payment information
const paymentFormSchema = z.object({
  paymentMethod: z.enum(["credit_card", "bank_transfer", "cash_on_delivery"], {
    required_error: "Please select a payment method",
  }),
  cardNumber: z.string().optional().refine((val) => {
    if (!val) return true;
    return /^\d{16}$/.test(val);
  }, "Card number must be 16 digits"),
  cardHolder: z.string().optional().refine((val) => {
    if (!val) return true;
    return val.length > 0;
  }, "Cardholder name is required"),
  expiryDate: z.string().optional().refine((val) => {
    if (!val) return true;
    return /^(0[1-9]|1[0-2])\/\d{2}$/.test(val);
  }, "Expiry date must be in MM/YY format"),
  cvv: z.string().optional().refine((val) => {
    if (!val) return true;
    return /^\d{3,4}$/.test(val);
  }, "CVV must be 3 or 4 digits"),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  onSubmit: (values: PaymentFormValues) => void;
  loading: boolean;
}

const PaymentForm: FC<PaymentFormProps> = ({ onSubmit, loading }) => {
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      paymentMethod: "credit_card",
      cardNumber: "",
      cardHolder: "",
      expiryDate: "",
      cvv: "",
    },
  });

  // Selected payment method
  const paymentMethod = form.watch("paymentMethod");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Method</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_card">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span>Credit Card</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="bank_transfer">
                      <div className="flex items-center gap-2">
                        <Landmark className="h-4 w-4" />
                        <span>Bank Transfer</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="cash_on_delivery">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        <span>Cash on Delivery</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {paymentMethod === "credit_card" && (
          <>
            <FormField
              control={form.control}
              name="cardNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="1234 5678 9012 3456"
                      {...field}
                      maxLength={16}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cardHolder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cardholder Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Doe"
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="MM/YY"
                        {...field}
                        maxLength={5}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cvv"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CVV</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123"
                        {...field}
                        maxLength={4}
                        disabled={loading}
                        type="password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        )}

        {paymentMethod === "bank_transfer" && (
          <div className="rounded-md bg-gray-50 p-4">
            <p className="text-sm font-medium">Bank Transfer Instructions</p>
            <p className="text-sm text-gray-500 mt-2">
              Please transfer the total amount to the following account:
            </p>
            <div className="mt-2 space-y-1">
              <p className="text-sm">
                <span className="font-medium">Bank:</span> AgriSmart Bank
              </p>
              <p className="text-sm">
                <span className="font-medium">Account Number:</span> 1234567890
              </p>
              <p className="text-sm">
                <span className="font-medium">Account Name:</span> AgriSmart Inc.
              </p>
              <p className="text-sm">
                <span className="font-medium">Reference:</span> Your order ID (will be provided after checkout)
              </p>
            </div>
          </div>
        )}

        {paymentMethod === "cash_on_delivery" && (
          <div className="rounded-md bg-gray-50 p-4">
            <p className="text-sm font-medium">Cash on Delivery</p>
            <p className="text-sm text-gray-500 mt-2">
              Pay with cash upon delivery of your order. Please have the exact amount ready.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Note: Additional fees may apply for cash on delivery orders.
            </p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Processing..." : "Complete Payment"}
        </Button>
      </form>
    </Form>
  );
};

export default PaymentForm;
