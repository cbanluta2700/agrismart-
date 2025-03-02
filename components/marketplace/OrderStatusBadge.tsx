import { FC } from "react";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Clock, 
  Truck, 
  Package, 
  AlertCircle,
  XCircle
} from "lucide-react";

interface OrderStatusBadgeProps {
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  className?: string;
}

const OrderStatusBadge: FC<OrderStatusBadgeProps> = ({ status, className = "" }) => {
  const getStatusConfig = () => {
    switch (status) {
      case "pending":
        return {
          label: "Pending",
          icon: Clock,
          variant: "outline",
        };
      case "confirmed":
        return {
          label: "Confirmed",
          icon: CheckCircle,
          variant: "secondary",
        };
      case "shipped":
        return {
          label: "Shipped",
          icon: Truck,
          variant: "default",
        };
      case "delivered":
        return {
          label: "Delivered",
          icon: Package,
          variant: "success",
        };
      case "cancelled":
        return {
          label: "Cancelled",
          icon: XCircle,
          variant: "destructive",
        };
      default:
        return {
          label: "Unknown",
          icon: AlertCircle,
          variant: "outline",
        };
    }
  };

  const { label, icon: Icon, variant } = getStatusConfig();
  
  const getVariantClass = () => {
    switch (variant) {
      case "default":
        return "bg-primary text-primary-foreground hover:bg-primary/80";
      case "secondary":
        return "bg-secondary text-secondary-foreground hover:bg-secondary/80";
      case "outline":
        return "border border-input bg-background hover:bg-accent hover:text-accent-foreground";
      case "destructive":
        return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
      case "success":
        return "bg-green-600 text-white hover:bg-green-700";
      default:
        return "";
    }
  };

  return (
    <Badge className={`flex items-center gap-1 px-2 py-1 ${getVariantClass()} ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </Badge>
  );
};

export default OrderStatusBadge;
