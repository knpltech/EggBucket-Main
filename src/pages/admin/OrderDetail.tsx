import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Clock,
  Package,
  Navigation,
  Loader2,
} from "lucide-react";
import {
  subscribeToOrders,
  acceptOrder,
  assignOrder,
  markOutForDelivery,
  markDelivered,
  getDeliveryExecutives,
  type OrderData,
  type DeliveryExecutive,
} from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";

const stepLabels = ["New", "Assigned", "Out", "Delivered"];

const statusToStep: Record<string, number> = {
  new: 1,
  accepted: 2,
  out: 3,
  delivered: 4,
};

const OrderDetail = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [executives, setExecutives] = useState<DeliveryExecutive[]>([]);
  const [showExecList, setShowExecList] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToOrders((orders) => {
      const found = orders.find((o) => o.id === orderId);
      setOrder(found || null);
      setLoading(false);
    });
    getDeliveryExecutives().then(setExecutives);
    return unsub;
  }, [orderId]);

  const currentStep = order ? statusToStep[order.status] || 1 : 1;

  const handleAccept = async () => {
    if (!orderId) return;
    try {
      await acceptOrder(orderId);
      setShowExecList(true);
      toast({ title: "Order accepted" });
    } catch {
      toast({ title: "Failed to accept", variant: "destructive" });
    }
  };

  const handleAssign = async (execId: string) => {
    if (!orderId) return;
    try {
      await assignOrder(orderId, execId);
      setShowExecList(false);
      toast({ title: "Delivery executive assigned" });
    } catch {
      toast({ title: "Failed to assign", variant: "destructive" });
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    const d = timestamp.toDate();
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) + ", " + d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <p className="text-slate-500">Order not found</p>
      </div>
    );
  }

  const assignedExec = executives.find((e) => e.id === order.assignedTo);

  return (
    <div className="min-h-screen bg-amber-50/60">
      {/* Header */}
      <div className="bg-white px-4 py-4 pt-[calc(env(safe-area-inset-top)+1rem)] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/dashboard")} className="p-1">
            <ArrowLeft className="h-5 w-5 text-slate-700" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Order Details</h1>
            <p className="text-xs text-slate-500">{formatDate(order.createdAt)}</p>
          </div>
        </div>
        {order.status === "new" && (
          <Badge className="bg-orange-100 text-orange-700 border-orange-200">New Order</Badge>
        )}
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Stepper */}
        <Card className="border-0 shadow-sm">
          <CardContent className="py-5 px-4">
            <div className="flex items-center justify-between">
              {stepLabels.map((label, idx) => {
                const step = idx + 1;
                const isActive = step <= currentStep;
                const isCurrent = step === currentStep;
                return (
                  <div key={label} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                          isActive
                            ? "bg-orange-500 text-white"
                            : "bg-slate-200 text-slate-500"
                        } ${isCurrent ? "ring-2 ring-orange-300" : ""}`}
                      >
                        {step}
                      </div>
                      <span className={`text-[10px] mt-1 ${isActive ? "text-orange-600 font-semibold" : "text-slate-400"}`}>
                        {label}
                      </span>
                    </div>
                    {idx < stepLabels.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 mt-[-12px] ${step < currentStep ? "bg-orange-500" : "bg-slate-200"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Assign Exec List */}
        {showExecList && order.status === "accepted" && !order.assignedTo && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-4 px-4 space-y-3">
              <h3 className="font-semibold text-slate-800">Select Delivery Executive</h3>
              {executives.length === 0 ? (
                <p className="text-slate-400 text-sm">No executives available</p>
              ) : (
                executives.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => handleAssign(ex.id!)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{ex.name}</p>
                      <p className="text-xs text-slate-500">{ex.phone}</p>
                    </div>
                    <Badge className={ex.status === "available" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}>
                      {ex.status}
                    </Badge>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Customer Info */}
        <Card className="border-0 shadow-sm">
          <CardContent className="py-4 px-4 space-y-0 divide-y divide-slate-100">
            <div className="flex items-center justify-between pb-3">
              <div>
                <p className="text-xs text-slate-500">Customer</p>
                <p className="font-bold text-slate-900 text-lg">{order.name}</p>
              </div>
              <a href={`tel:${order.phone}`} className="w-10 h-10 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                <Phone className="h-4 w-4 text-green-600" />
              </a>
            </div>

            <div className="flex items-start gap-3 py-3">
              <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center mt-0.5">
                <Phone className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p className="font-semibold text-slate-800">+91 {order.phone}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 py-3">
              <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center mt-0.5">
                <Package className="h-4 w-4 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500">Items Ordered</p>
                <p className="font-semibold text-slate-800">{order.quantity} trays (30 Eggs) • ₹{order.quantity * order.pricePerCrate}</p>
                {order.includeTray && (
                  <p className="text-xs font-bold text-orange-600 mt-1">
                    ✨ Includes Add-on: Empty Plastic Egg Tray (₹{order.trayPrice || 49})
                  </p>
                )}
                <p className="text-xs font-bold text-slate-700 mt-1">
                  Total Paid: ₹{order.totalPrice}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 py-3">
              <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center mt-0.5">
                <MapPin className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Flat / House</p>
                <p className="font-bold text-slate-800">{order.flatNo}</p>
                <p className="text-sm text-slate-500">{order.street}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 py-3">
              <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center mt-0.5">
                <Clock className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Ordered at</p>
                <p className="font-semibold text-slate-800">{formatDate(order.createdAt)}</p>
              </div>
            </div>

            {assignedExec && (
              <div className="flex items-start gap-3 py-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center mt-0.5">
                  <Package className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Assigned To</p>
                  <p className="font-semibold text-slate-800">{assignedExec.name}</p>
                  <p className="text-xs text-slate-500">{assignedExec.phone}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Google Maps */}
        {!!order.latitude && !!order.longitude && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="py-4 px-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Navigation className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">Open in Google Maps</p>
                  <p className="text-xs text-slate-500">Navigate to delivery location</p>
                </div>
                <ArrowLeft className="h-4 w-4 text-slate-400 rotate-180" />
              </CardContent>
            </Card>
          </a>
        )}

        {/* Action Buttons */}
        <div className="pt-2 pb-6">
          {order.status === "new" && (
            <Button onClick={handleAccept} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-base rounded-xl font-semibold">
              Accept & Start Delivery
            </Button>
          )}
          {order.status === "accepted" && !order.assignedTo && !showExecList && (
            <Button onClick={() => setShowExecList(true)} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-base rounded-xl font-semibold">
              Assign Delivery Executive
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
