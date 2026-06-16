import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Minus, Plus, ShoppingCart, Loader2 } from "lucide-react";
import { subscribeToPrice } from "@/lib/firebase";
import eggTrayImg from "@/assets/egg-tray.png";
import eggLogo from "@/assets/logo-egg-png.png";
import bannerImg from "@/assets/banner.jpeg";

const Index = () => {
  const [quantity, setQuantity] = useState(1);
  const [pricePerCrate, setPricePerCrate] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = subscribeToPrice((price) => {
      setPricePerCrate(price);
    });
    return () => unsub();
  }, []);

  const handleOrder = () => {
    navigate("/order", { state: { quantity, pricePerCrate } });
  };

  if (pricePerCrate === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col overflow-hidden h-screen">
      {/* Top Navigation / Header */}
      <div className="bg-white px-6 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] flex items-center gap-3 shadow-[0_2px_10px_rgba(0,0,0,0.08)] z-10 sticky top-0 shrink-0">
        <img src={eggLogo} alt="Egg Bucket Logo" className="h-8 w-auto object-contain" />
        <h1 className="text-xl font-black text-amber-900 tracking-tight uppercase">Egg Bucket</h1>
      </div>

      {/* Banner Section */}
      <div className="w-full px-4 pt-4 shrink-0">
        <div className="w-full max-w-md mx-auto rounded-xl overflow-hidden shadow-[0_0_20px_rgba(248,121,10,0.3)] border-2 border-orange-500/20 animate-gentle-bounce group">
          <div className="relative">
            <img src={bannerImg} alt="Special Banner" className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 to-transparent pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center p-4 justify-center overflow-hidden">
        <div className="w-full max-w-md flex flex-col items-center">
          <Card className="w-full border-amber-200 shadow-2xl overflow-hidden bg-white">
            <div className="relative bg-gradient-to-b from-orange-50/50 to-white">
              <img
                src={eggTrayImg}
                alt="Tray of 30 fresh eggs"
                width={512}
                height={512}
                className="w-full h-56 object-contain p-2 transform hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute top-3 right-3 bg-orange-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-wider animate-pulse">
                30 Eggs (Tray)
              </span>
            </div>

            <CardHeader className="pb-1 py-2">
              <CardTitle className="flex items-center justify-between">
                <span className="text-base font-bold">Egg Tray (30 Eggs)</span>
                <span className="text-lg font-extrabold text-orange-600">₹{pricePerCrate}</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="pb-2">
              <div className="flex items-center justify-center gap-4 bg-orange-50 rounded-xl p-3 border border-orange-100">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="h-10 w-10 rounded-full border-orange-200 bg-white hover:bg-orange-50 text-orange-600 shadow-sm"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-2xl font-black text-amber-900 min-w-[3ch] text-center">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="h-10 w-10 rounded-full border-orange-200 bg-white hover:bg-orange-50 text-orange-600 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-center text-sm text-amber-700 mt-2">
                Total Amount: <span className="font-black text-orange-600 text-base">₹{quantity * pricePerCrate}</span>
              </p>
            </CardContent>

            <CardFooter className="pt-1 pb-4">
              <Button
                onClick={handleOrder}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-lg font-bold shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]"
              >
                <ShoppingCart className="mr-3 h-5 w-5" />
                Order Now
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;