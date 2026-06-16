import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, MapPin, Phone, User } from "lucide-react";
import { db, type OrderData } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId } = (location.state as any) || {};

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    const fetchOrder = async () => {
      try {
        const snap = await getDoc(doc(db, "orders", orderId));
        if (snap.exists()) {
          setOrder({ id: snap.id, ...snap.data() } as OrderData);
        }
      } catch (err) {
        console.error("Error fetching order details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/60 to-slate-50 flex flex-col items-center justify-center p-4">
      <Card className="border-orange-200 shadow-xl max-w-md w-full overflow-hidden bg-white rounded-3xl">
        <CardContent className="pt-8 pb-6 px-5 space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 border border-green-100 shadow-sm animate-gentle-scale">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Order Placed!</h1>
            <p className="text-xs font-semibold text-slate-400 font-mono">ORDER ID: {orderId || "N/A"}</p>
          </div>

          {/* Business-critical Delivery expectation banner */}
          <div className="bg-orange-50/80 border border-orange-200/60 rounded-2xl p-4 text-center space-y-1 shadow-inner">
            <p className="text-[10px] text-orange-600 font-black uppercase tracking-widest leading-none">Expected Delivery</p>
            <p className="text-lg font-black text-amber-950 font-heading">Within 1–24 Hours</p>
            <p className="text-[11px] text-orange-700/80 font-medium">Thank you for choosing Egg Bucket.</p>
          </div>

          {/* Invoice Summary */}
          {order && (
            <div className="space-y-4 border border-slate-100 bg-slate-50/30 p-4 rounded-2xl">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Order Summary</h4>
              
              {/* Customer Info */}
              <div className="space-y-1.5 text-xs text-slate-600 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <User className="h-3.5 w-3.5 text-slate-400" /> {order.name}
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> +91 {order.phone}
                </div>
                <div className="flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{order.flatNo}, {order.street}</span>
                </div>
              </div>

              {/* Items Summary */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-medium text-slate-600">
                  <span>{order.quantity} × Egg Crate (30 Eggs)</span>
                  <span className="font-bold text-slate-800">₹{order.quantity * order.pricePerCrate}</span>
                </div>

                {order.includeTray && (order.trayQuantity ?? 0) > 0 && (
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>{order.trayQuantity} × Empty Plastic Tray</span>
                    <span className="font-bold text-slate-800">₹{(order.trayQuantity ?? 0) * (order.trayPrice || 49)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-500 text-[11px] pt-1">
                  <span>Delivery Charges</span>
                  <span className="text-green-600 font-bold">FREE</span>
                </div>

                <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200/50 pt-2">
                  <span>Total Amount</span>
                  <span className="text-orange-600 text-base">₹{order.totalPrice}</span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 text-center">
            <Button
              onClick={() => navigate("/")}
              className="w-full bg-primary hover:bg-orange-600 text-white font-bold h-11 rounded-xl shadow-md shadow-orange-500/10 transition-all active:scale-[0.98]"
            >
              Order More
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderSuccess;
