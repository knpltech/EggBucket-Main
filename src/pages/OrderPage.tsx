import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MapPin, Loader2 } from "lucide-react";
import { createOrder } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import eggTrayBlackImg from "@/assets/egg-tray-black.jpg";

const OrderPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { quantity = 1, pricePerCrate = 180 } = (location.state as any) || {};

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [flatNo, setFlatNo] = useState("");
  const [street, setStreet] = useState("");
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [includeTray, setIncludeTray] = useState(false);
  const trayPrice = 49;

  const totalPrice = quantity * pricePerCrate + (includeTray ? trayPrice : 0);

  const fetchLocation = () => {
  if (!navigator.geolocation) {
    toast({ title: "Geolocation not supported", variant: "destructive" });
    return;
  }

  setFetchingLocation(true);

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      console.log("Location:", lat, lng); // DEBUG

      setLatitude(lat);
      setLongitude(lng);

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
        );
        const data = await res.json();

        console.log("Address:", data); // DEBUG

        const addr = data.address || {};
        setFlatNo(addr.house_number || "");
        setStreet(
          [addr.road, addr.neighbourhood, addr.suburb].filter(Boolean).join(", ")
        );
      } catch (err) {
        console.log("Geocode error:", err);
      }

      setFetchingLocation(false);
    },
    (error) => {
      console.log("Location error:", error);

      toast({
        title: "Location Error",
        description: error.message,
        variant: "destructive",
      });

      setFetchingLocation(false);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
};

  useEffect(() => {
    fetchLocation();
  }, []);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      toast({ title: "Please fill name and phone number", variant: "destructive" });
      return;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      toast({ title: "Enter a valid 10-digit phone number", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const orderId = await createOrder({
        name: name.trim(),
        phone: phone.trim(),
        latitude,
        longitude,
        flatNo: flatNo.trim(),
        street: street.trim(),
        quantity,
        pricePerCrate,
        totalPrice,
        includeTray,
        trayPrice: includeTray ? trayPrice : 0,
      });
      toast({ title: "Order placed successfully!", description: `Order ID: ${orderId}` });
      navigate("/order-success", { state: { orderId } });
    } catch (err: any) {
      toast({ title: "Failed to place order", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-md mx-auto px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-2 text-amber-700 h-8 p-0"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <Card className="border-amber-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-amber-900">Complete Your Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="10-digit phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              />
            </div>

            {/* Location */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>Location</Label>
                <Button
                  variant="link"
                  size="sm"
                  onClick={fetchLocation}
                  disabled={fetchingLocation}
                  className="text-amber-700 p-0 h-auto"
                >
                  {fetchingLocation ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <MapPin className="mr-1 h-3 w-3" />
                  )}
                  {fetchingLocation ? "Fetching..." : "Refresh Location"}
                </Button>
              </div>
              <Input
                placeholder="Flat / House No"
                value={flatNo}
                onChange={(e) => setFlatNo(e.target.value)}
                maxLength={50}
              />
              <Input
                placeholder="Street / Area"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                maxLength={200}
                className="mt-2"
              />
            </div>

            {/* Add-ons (Optional) */}
            <div className="space-y-2">
              <Label className="text-amber-900 font-bold text-sm">Add-ons (Optional)</Label>
              <div className="flex items-center justify-between p-3 border border-amber-200 rounded-xl bg-white shadow-sm">
                <div className="flex items-center gap-3">
                  <img
                    src={eggTrayBlackImg}
                    alt="Empty Plastic Egg Tray"
                    className="w-14 h-14 object-contain rounded-md border border-slate-100 bg-slate-50 p-1"
                  />
                  <div>
                    <p className="font-bold text-sm text-slate-800">Empty Plastic Egg Tray</p>
                    <p className="text-[11px] text-slate-500">For carrying eggs safely</p>
                    <p className="font-extrabold text-sm text-orange-600 mt-0.5">₹49</p>
                  </div>
                </div>
                <Button
                  variant={includeTray ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIncludeTray(!includeTray)}
                  className={`h-8 px-3 rounded-lg text-xs font-semibold ${
                    includeTray
                      ? "bg-green-600 hover:bg-green-700 text-white border-0"
                      : "border-orange-200 text-orange-600 hover:bg-orange-55 animate-gentle-scale"
                  }`}
                >
                  {includeTray ? "✓ Added" : "+ Add"}
                </Button>
              </div>
            </div>

            {/* Free Delivery Banner */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 flex items-center justify-center gap-1.5 shadow-sm text-green-700 font-medium text-xs">
              <span>🎉</span>
              <span>FREE Delivery applied! You saved ₹25</span>
            </div>

            {/* Price Summary */}
            <div className="bg-amber-50 rounded-lg p-4 space-y-2 border border-amber-100">
              <div className="flex justify-between text-sm">
                <span className="text-amber-700">
                  {quantity} × Trays (30 Eggs)
                </span>
                <span className="text-amber-900 font-semibold">
                  {quantity} × ₹{pricePerCrate}
                </span>
              </div>
              {includeTray && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-800">
                    1 × Empty Plastic Egg Tray
                  </span>
                  <span className="text-amber-900 font-semibold">
                    ₹{trayPrice}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-amber-200/50 pt-2">
                <span className="text-amber-700">
                  Delivery Charges
                </span>
                <span className="font-semibold text-xs">
                  <span className="line-through text-slate-400 mr-1.5">₹25</span>
                  <span className="text-green-600 font-bold">₹0</span>
                </span>
              </div>
              <div className="border-t border-amber-200 pt-2 flex justify-between">
                <span className="font-bold text-amber-900">Total</span>
                <span className="font-bold text-amber-900 text-lg">₹{totalPrice}</span>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-lg shadow-lg shadow-orange-500/20"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : null}
              {submitting ? "Placing Order..." : "Place Order"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderPage;
