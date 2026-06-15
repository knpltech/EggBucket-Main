import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { authenticateDeliveryExecutive } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import eggLogo from "@/assets/logo-egg-png.png";
import { Preferences } from "@capacitor/preferences";

const DeliveryLogin = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkLogin = async () => {
      const { value: execId } = await Preferences.get({ key: "execId" });
      if (execId) {
        navigate("/delivery/orders", { replace: true });
      }
    };
    checkLogin();
  }, [navigate]);

  const handleLogin = async () => {
    if (!name.trim()) {
      toast({ title: "Please enter your name", variant: "destructive" });
      return;
    }
    if (!password.trim()) {
      toast({ title: "Please enter your password", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      const execId = await authenticateDeliveryExecutive(name.trim(), password);
      // Save to Preferences for native persistence (survives RAM clearing)
      await Preferences.set({ key: "execId", value: execId });
      await Preferences.set({ key: "execName", value: name.trim() });
      
      // Keep localStorage for compatibility
      localStorage.setItem("execId", execId);
      localStorage.setItem("execName", name.trim());
      
      toast({ title: "Login successful!" });
      navigate("/delivery/orders");
    } catch (err: any) {
      toast({ title: err.message || "Invalid credentials", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center p-6 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      <div className="w-full max-w-md">
        <button onClick={() => navigate("/")} className="mb-6 text-slate-500">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="text-center mb-8 flex flex-col items-center">
          <img src={eggLogo} alt="Egg Bucket Logo" className="h-20 w-auto mb-4 object-contain" />
          <h1 className="text-3xl font-bold text-amber-900">Egg Bucket</h1>
          <p className="text-amber-600 mt-1">Delivery Executive</p>
        </div>

        <Card className="w-full border-0 shadow-lg">
          <CardContent className="py-6 px-5 space-y-5">
            <h2 className="text-xl font-bold text-slate-900 text-center">Login</h2>

            <div className="space-y-2">
              <Label className="text-slate-700">Name</Label>
              <Input
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={handleKeyPress}
                className="border-slate-200 h-12"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="border-slate-200 h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-base rounded-xl font-semibold"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              Login
            </Button>

            <p className="text-center text-xs text-slate-400">Contact admin for credentials</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeliveryLogin;
