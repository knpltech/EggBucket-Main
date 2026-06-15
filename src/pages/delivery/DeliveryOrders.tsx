import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  LogOut,
  Loader2,
  Phone,
  MapPin,
  Package,
  Navigation,
  Clock,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import {
  subscribeToExecOrders,
  updateOrderStatus,
  removeDeliveryExecutive,
  type OrderData,
} from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import eggLogo from "@/assets/logo-egg-png.png";
import { Preferences } from "@capacitor/preferences";

const stepLabels = ["New", "Assigned", "Out", "Delivered"];

const statusToStep: Record<string, number> = {
  new: 1,
  accepted: 2,
  out: 3,
  delivered: 4,
};

const DeliveryOrders = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedOrder = searchParams.get("orderId");

  const setSelectedOrder = (orderId: string | null) => {
    if (orderId) {
      setSearchParams({ orderId });
    } else {
      setSearchParams({});
    }
  };

  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);

  const [execId, setExecId] = useState<string | null>(null);
  const [execName, setExecName] = useState<string | null>(null);

  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const initialFitRef = useRef(false);
  const hasFitWithLocationRef = useRef(false);
  const prevActiveOrdersStrRef = useRef("");

  // Geolocation watcher hook
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.error("Error watching geolocation:", error);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setCurrentLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            });
          },
          (err) => console.error("Error getting geolocation:", err)
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Map drawing hook
  useEffect(() => {
    if (!mapContainerRef.current) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([12.9716, 77.5946], 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear previous markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const newMarkers: L.Marker[] = [];

    // 1. Add agent location
    if (currentLocation) {
      const agentIcon = L.divIcon({
        className: "custom-agent-marker",
        html: `
          <div class="relative flex h-5 w-5 items-center justify-center">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-4.5 w-4.5 bg-blue-600 border-2 border-white shadow-md"></span>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const agentMarker = L.marker([currentLocation.lat, currentLocation.lng], { icon: agentIcon })
        .addTo(map)
        .bindPopup("<b>Your Location</b>");
      newMarkers.push(agentMarker);
    }

    // 2. Add active order pins
    const activeOrders = orders.filter((o) => o.status !== "delivered");
    activeOrders.forEach((order) => {
      if (order.latitude && order.longitude) {
        const orderIcon = L.divIcon({
          className: "custom-order-marker",
          html: `
            <div class="relative flex h-8 w-8 items-center justify-center bg-orange-500 border-2 border-white text-white font-black text-xs rounded-full shadow-lg transform transition-transform hover:scale-110">
              ${order.quantity}
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const orderMarker = L.marker([order.latitude, order.longitude], { icon: orderIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-1 text-slate-800" style="font-family: sans-serif;">
              <p class="font-bold text-sm mb-0.5">${order.name}</p>
              <p class="text-[11px] text-slate-500 mb-1 leading-normal">${order.flatNo}, ${order.street}</p>
              <div class="flex items-center justify-between gap-2 border-t pt-1 mt-1">
                <span class="text-[11px] font-black text-orange-600">${order.quantity} Trays</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 capitalize font-medium">${order.status}</span>
              </div>
            </div>
          `);
        newMarkers.push(orderMarker);
      }
    });

    markersRef.current = newMarkers;

    const activeOrdersStr = orders
      .filter((o) => o.status !== "delivered")
      .map((o) => o.id)
      .sort()
      .join(",");

    const activeOrdersChanged = activeOrdersStr !== prevActiveOrdersStrRef.current;
    const hasLocation = !!currentLocation;

    const shouldFit = (!initialFitRef.current && newMarkers.length > 0) || 
                      (!hasFitWithLocationRef.current && hasLocation && newMarkers.length > 0) ||
                      activeOrdersChanged;

    if (shouldFit && newMarkers.length > 0) {
      const group = L.featureGroup(newMarkers);
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.fitBounds(group.getBounds().pad(0.15));
        }
      }, 50);
      initialFitRef.current = true;
      if (hasLocation) {
        hasFitWithLocationRef.current = true;
      }
      prevActiveOrdersStrRef.current = activeOrdersStr;
    }
  }, [currentLocation, orders, selectedOrder]);

  useEffect(() => {
    const loadCredentials = async () => {
      const { value: pId } = await Preferences.get({ key: "execId" });
      const { value: pName } = await Preferences.get({ key: "execName" });
      
      const id = pId || localStorage.getItem("execId");
      const name = pName || localStorage.getItem("execName");
      
      if (!id) {
        navigate("/delivery");
        return;
      }
      
      setExecId(id);
      setExecName(name);
    };
    loadCredentials();
  }, [navigate]);

  useEffect(() => {
    if (!execId) return;
    const unsub = subscribeToExecOrders(execId, (orders) => {
      setOrders(orders);
      setLoading(false);
    });
    return unsub;
  }, [execId]);

  const handleLogout = async () => {
    if (execId) {
      try {
        await removeDeliveryExecutive(execId);
      } catch {}
    }
    await Preferences.remove({ key: "execId" });
    await Preferences.remove({ key: "execName" });
    localStorage.removeItem("execId");
    localStorage.removeItem("execName");
    navigate("/delivery");
  };

  const handleMarkOut = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, "out");
      toast({ title: "Marked as out for delivery" });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, "delivered");
      toast({ title: "Marked as delivered ✓" });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleRecenter = () => {
    if (!mapRef.current || markersRef.current.length === 0) return;
    const group = L.featureGroup(markersRef.current);
    mapRef.current.fitBounds(group.getBounds().pad(0.15));
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    const d = timestamp.toDate();
    return (
      d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
      ", " +
      d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
    );
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    return timestamp.toDate().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const activeOrders = orders.filter((o) => o.status !== "delivered");
  const deliveredOrders = orders.filter((o) => o.status === "delivered");

  const viewingOrder = selectedOrder ? orders.find((o) => o.id === selectedOrder) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  // Detail view for a selected order
  if (viewingOrder) {
    const currentStep = statusToStep[viewingOrder.status] || 1;
    const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
      new: { bg: "bg-blue-100", text: "text-blue-700", label: "New" },
      accepted: { bg: "bg-orange-100", text: "text-orange-700", label: "Assigned" },
      out: { bg: "bg-amber-100", text: "text-amber-700", label: "Out for Delivery" },
      delivered: { bg: "bg-green-100", text: "text-green-700", label: "Delivered" },
    };
    const badge = statusBadge[viewingOrder.status] || statusBadge.new;

    return (
      <div className="min-h-screen bg-amber-50/60">
        {/* Header */}
        <div className="bg-white px-4 py-4 pt-[calc(env(safe-area-inset-top)+1rem)] flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowLeft className="h-5 w-5 text-slate-700" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Order Details</h1>
              <p className="text-xs text-slate-500">{formatDate(viewingOrder.createdAt)}</p>
            </div>
          </div>
          <Badge className={`${badge.bg} ${badge.text} border-0`}>{badge.label}</Badge>
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
                            isActive ? "bg-orange-500 text-white" : "bg-slate-200 text-slate-500"
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

          {/* Customer Info */}
          <Card className="border-0 shadow-sm">
            <CardContent className="py-4 px-4 space-y-0 divide-y divide-slate-100">
              <div className="flex items-center justify-between pb-3">
                <div>
                  <p className="text-xs text-slate-500">Customer</p>
                  <p className="font-bold text-slate-900 text-lg">{viewingOrder.name}</p>
                </div>
                <a href={`tel:${viewingOrder.phone}`} className="w-10 h-10 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-green-600" />
                </a>
              </div>

              <div className="flex items-start gap-3 py-3">
                <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center mt-0.5">
                  <Phone className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="font-semibold text-slate-800">+91 {viewingOrder.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 py-3">
                <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center mt-0.5">
                  <Package className="h-4 w-4 text-orange-500" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500">Items Ordered</p>
                  <p className="font-semibold text-slate-800">{viewingOrder.quantity} trays (30 Eggs)</p>
                  {viewingOrder.includeTray && (
                    <p className="text-xs font-bold text-orange-600 mt-1">
                      ✨ Includes Add-on: Empty Plastic Egg Tray (₹{viewingOrder.trayPrice || 49})
                    </p>
                  )}
                  <p className="text-xs font-bold text-slate-700 mt-1">
                    Total to Collect: ₹{viewingOrder.totalPrice}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 py-3">
                <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center mt-0.5">
                  <MapPin className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Flat / House</p>
                  <p className="font-bold text-slate-800">{viewingOrder.flatNo}</p>
                  <p className="text-sm text-slate-500">{viewingOrder.street}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 py-3">
                <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center mt-0.5">
                  <Clock className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Ordered at</p>
                  <p className="font-semibold text-slate-800">{formatDate(viewingOrder.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Google Maps */}
          {!!viewingOrder.latitude && !!viewingOrder.longitude && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${viewingOrder.latitude},${viewingOrder.longitude}`}
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
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </CardContent>
              </Card>
            </a>
          )}

          {/* Action Buttons */}
          <div className="pt-2 pb-6">
            {viewingOrder.status === "accepted" && (
              <Button
                onClick={() => handleMarkOut(viewingOrder.id!)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-base rounded-xl font-semibold"
              >
                Start Delivery (Out for Delivery)
              </Button>
            )}
            {viewingOrder.status === "out" && (
              <Button
                onClick={() => handleMarkDelivered(viewingOrder.id!)}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-base rounded-xl font-semibold"
              >
                ✓ Mark as Delivered
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-amber-50/60">
      {/* Header */}
      <div className="bg-white px-4 py-4 pt-[calc(env(safe-area-inset-top)+1rem)] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <img src={eggLogo} alt="Logo" className="h-7 w-auto object-contain" />
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">New Orders</h1>
            <p className="text-[10px] text-slate-500 leading-none">{execName}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-5 w-5 text-slate-600" />
        </Button>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="py-3 px-3 text-center">
              <p className="text-2xl font-bold text-orange-500">{activeOrders.length}</p>
              <p className="text-xs text-slate-500">Active</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="py-3 px-3 text-center">
              <p className="text-2xl font-bold text-green-600">{deliveredOrders.length}</p>
              <p className="text-xs text-slate-500">Delivered</p>
            </CardContent>
          </Card>
        </div>

        {/* Route Map Preview */}
        <Card className="border-0 shadow-sm overflow-hidden z-0">
          <CardContent className="p-0">
            <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Route Map Preview
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {currentLocation ? "Showing current location and active orders" : "Retrieving GPS location..."}
                </p>
              </div>
              {(orders.length > 0 || !!currentLocation) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRecenter}
                  className="h-7 px-2 text-xs flex items-center gap-1 text-slate-600 hover:text-orange-600 border-slate-200"
                >
                  <Navigation className="h-3 w-3 rotate-45 text-orange-500" />
                  Recenter
                </Button>
              )}
            </div>
            <div 
              ref={mapContainerRef} 
              className="h-60 w-full bg-slate-100 relative z-0" 
            />
          </CardContent>
        </Card>

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Pending Deliveries ({activeOrders.length})
            </p>
            {activeOrders.map((order) => (
              <Card
                key={order.id}
                className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedOrder(order.id!)}
              >
                <CardContent className="py-4 px-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-slate-900">{order.name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> +91 {order.phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-orange-600">{order.quantity} trays</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 flex items-start gap-1 mb-2">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-orange-400" />
                    <span className="line-clamp-1">{order.flatNo}, {order.street}</span>
                  </p>
                  <div className="flex items-center justify-between">
                    <Button variant="link" className="text-orange-500 p-0 h-auto text-sm font-semibold">
                      View Details
                    </Button>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      {formatTime(order.createdAt)} <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {activeOrders.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-8 text-center">
              <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400">No pending deliveries</p>
            </CardContent>
          </Card>
        )}

        {/* History */}
        {deliveredOrders.length > 0 && (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-6">
              Delivery History ({deliveredOrders.length})
            </p>
            {deliveredOrders.map((order) => (
              <Card
                key={order.id}
                className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedOrder(order.id!)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{order.name}</p>
                      <p className="text-xs text-slate-500">{order.quantity} trays • {formatDate(order.createdAt)}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-0">Delivered</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default DeliveryOrders;
