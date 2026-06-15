import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId } = (location.state as any) || {};

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="border-amber-200 shadow-lg max-w-sm w-full text-center">
        <CardContent className="pt-8 pb-6 space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-amber-900">Order Placed!</h1>
          <p className="text-amber-700">
            Your eggs are on the way 🥚
          </p>
          {orderId && (
            <p className="text-xs text-amber-500 font-mono">
              Order ID: {orderId}
            </p>
          )}
          <Button
            onClick={() => navigate("/")}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Order More
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderSuccess;
