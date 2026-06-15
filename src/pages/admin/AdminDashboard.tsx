import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogOut, Loader2, Save, Package, IndianRupee, Truck, MapPin, Phone, ChevronRight, Plus, Trash2, Eye, EyeOff, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/hooks/useAuth";
import {
  logoutAdmin,
  subscribeToOrders,
  getPrice,
  setPrice,
  subscribeToDeliveryExecutives,
  createDeliveryExecutive,
  deleteDeliveryExecutive,
  type OrderData,
  type DeliveryExecutive,
} from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import eggLogo from "@/assets/logo-egg-png.png";

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<OrderData[]>([]);
  const [executives, setExecutives] = useState<DeliveryExecutive[]>([]);
  const [price, setPriceVal] = useState(180);
  const [savingPrice, setSavingPrice] = useState(false);
  const [newExecName, setNewExecName] = useState("");
  const [newExecPassword, setNewExecPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creatingExec, setCreatingExec] = useState(false);
  

  useEffect(() => {
    if (!authLoading && !user) navigate("/admin");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const unsub = subscribeToOrders(setOrders);
    const unsubExecs = subscribeToDeliveryExecutives(setExecutives);
    getPrice().then(setPriceVal);
    return () => { unsub(); unsubExecs(); };
  }, []);

  const pendingOrders = orders.filter((o) => o.status === "new");
  const activeOrders = orders.filter((o) => o.status === "accepted" || o.status === "out");

  const handleSavePrice = async () => {
    setSavingPrice(true);
    try {
      await setPrice(price);
      toast({ title: "Price updated to ₹" + price });
    } catch {
      toast({ title: "Failed to update price", variant: "destructive" });
    }
    setSavingPrice(false);
  };

  const handleLogout = async () => {
    await logoutAdmin();
    navigate("/admin");
  };

  const handleCreateExecutive = async () => {
    if (!newExecName.trim()) {
      toast({ title: "Please enter executive name", variant: "destructive" });
      return;
    }
    if (!newExecPassword.trim() || newExecPassword.length < 4) {
      toast({ title: "Password must be at least 4 characters", variant: "destructive" });
      return;
    }
    setCreatingExec(true);
    try {
      await createDeliveryExecutive(newExecName.trim(), newExecPassword.trim());
      toast({ title: "Executive created successfully!" });
      setNewExecName("");
      setNewExecPassword("");
    } catch (err: any) {
      toast({ title: err.message || "Failed to create executive", variant: "destructive" });
    }
    setCreatingExec(false);
  };

  const handleDeleteExecutive = async (execId: string, execName: string) => {
    if (confirm(`Are you sure you want to delete "${execName}"?`)) {
      try {
        await deleteDeliveryExecutive(execId);
        toast({ title: "Executive deleted successfully!" });
      } catch {
        toast({ title: "Failed to delete executive", variant: "destructive" });
      }
    }
  };

  const handleDownloadExcel = async () => {
    if (orders.length === 0) {
      toast({ title: "No orders to download", variant: "destructive" });
      return;
    }

    try {
      // 1. Prepare data for Excel
      const dataToExport = orders.map((o) => {
        let dateStr = "N/A";
        let timeStr = "N/A";

        try {
          if (o.createdAt) {
            const d = typeof o.createdAt.toDate === 'function' ? o.createdAt.toDate() : new Date(o.createdAt as any);
            dateStr = d.toLocaleDateString("en-IN");
            timeStr = d.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' });
          }
        } catch (e) {
          console.error("Error formatting date", e);
        }

        return {
          "Order ID": o.id || "N/A",
          "Date": dateStr,
          "Time": timeStr,
          "Customer Name": o.name,
          "Phone Number": o.phone,
          "Quantity (Trays)": o.quantity,
          "Price per Tray (₹)": o.pricePerCrate,
          "Total Amount (₹)": o.totalPrice,
          "Current Status": o.status.toUpperCase(),
          "Flat/House No": o.flatNo,
          "Street/Area": o.street,
          "Assigned Executive": executives.find(ex => ex.id === o.assignedTo)?.name || "Not Assigned"
        };
      });

      // 2. Create Workbook and Worksheet
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);

      // Set column widths
      const wscols = [
        { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 25 }, { wch: 20 }
      ];
      worksheet['!cols'] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "All Deliveries");

      const fileName = `EggBucket_Deliveries_${new Date().toISOString().split('T')[0]}.xlsx`;

      // 3. Platform Specific Export
      if (Capacitor.isNativePlatform()) {
        // MOBILE: Save to Documents and prompt Share
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });

        const result = await Filesystem.writeFile({
          path: fileName,
          data: excelBuffer,
          directory: Directory.Cache,
          recursive: true
        });

        toast({
          title: "Success",
          description: `Excel saved to Documents.`,
        });

        // Prompt to share/open the file immediately
        await Share.share({
          title: 'Egg Bucket Deliveries',
          text: 'Here is the delivery report',
          url: result.uri,
          dialogTitle: 'Open or Share Report',
        });

      } else {
        // WEB: Trigger browser download
        XLSX.writeFile(workbook, fileName);
        toast({
          title: "Success",
          description: "Excel report downloaded."
        });
      }
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: error.message || "An error occurred during download",
        variant: "destructive"
      });
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    return timestamp.toDate().toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50/60">
      {/* Header */}
      <div className="bg-white px-4 py-4 pt-[calc(env(safe-area-inset-top)+1rem)] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <img src={eggLogo} alt="Logo" className="h-7 w-auto object-contain" />
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">New Orders</h1>
            <p className="text-[10px] text-orange-500 leading-none">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5 text-slate-600" />
          </Button>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="py-3 px-3 text-center">
              <p className="text-2xl font-bold text-orange-500">{pendingOrders.length}</p>
              <p className="text-xs text-slate-500">Pending</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="py-3 px-3 text-center">
              <p className="text-2xl font-bold text-slate-700">{activeOrders.length}</p>
              <p className="text-xs text-slate-500">Active</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="py-3 px-3 text-center">
              <p className="text-2xl font-bold text-slate-700">{orders.length}</p>
              <p className="text-xs text-slate-500">Total</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList className="bg-white border shadow-sm w-full">
            <TabsTrigger value="orders" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white flex-1">
              <Package className="mr-1 h-4 w-4" /> Orders
            </TabsTrigger>
            <TabsTrigger value="pricing" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white flex-1">
              <IndianRupee className="mr-1 h-4 w-4" /> Pricing
            </TabsTrigger>
            <TabsTrigger value="executives" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white flex-1">
              <Truck className="mr-1 h-4 w-4" /> Team
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-3">
            <div className="flex items-center justify-between mt-2 mb-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Delivery Status
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadExcel}
                className="h-7 px-2 text-[10px] gap-1 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 shadow-sm"
              >
                <Download className="h-3 w-3" /> Download Report
              </Button>
            </div>

            {pendingOrders.length > 0 && (
              <>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Pending Deliveries ({pendingOrders.length})
                </p>
                {pendingOrders.map((o) => (
                  <OrderCard key={o.id} order={o} formatTime={formatTime} onClick={() => navigate(`/admin/order/${o.id}`)} />
                ))}
              </>
            )}

            {activeOrders.length > 0 && (
              <>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-4">
                  Active Deliveries ({activeOrders.length})
                </p>
                {activeOrders.map((o) => (
                  <OrderCard key={o.id} order={o} formatTime={formatTime} onClick={() => navigate(`/admin/order/${o.id}`)} />
                ))}
              </>
            )}

            {orders.filter((o) => o.status === "delivered").length > 0 && (
              <>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-4">
                  Delivered ({orders.filter((o) => o.status === "delivered").length})
                </p>
                {orders.filter((o) => o.status === "delivered").map((o) => (
                  <OrderCard key={o.id} order={o} formatTime={formatTime} onClick={() => navigate(`/admin/order/${o.id}`)} />
                ))}
              </>
            )}

            {orders.length === 0 && (
              <p className="text-slate-400 text-center py-8">No orders yet</p>
            )}
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-800 text-base">Egg Crate Price</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-slate-600 text-sm">Price per Crate (30 Eggs)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPriceVal(Number(e.target.value))}
                      min={1}
                      className="border-slate-200"
                    />
                    <Button onClick={handleSavePrice} disabled={savingPrice} className="bg-orange-500 hover:bg-orange-600 text-white">
                      {savingPrice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <p className="text-slate-400 text-sm">This price is shown to users on the ordering page.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Executives Tab */}
          <TabsContent value="executives">
            <div className="space-y-4">
              {/* Create New Executive Form */}
              <Card className="border-0 shadow-sm bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-slate-800 text-base flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Create New Executive
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-slate-600 text-sm">Executive Name</Label>
                    <Input
                      placeholder="e.g., Raj Kumar"
                      value={newExecName}
                      onChange={(e) => setNewExecName(e.target.value)}
                      className="border-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-600 text-sm">Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password (min 4 characters)"
                        value={newExecPassword}
                        onChange={(e) => setNewExecPassword(e.target.value)}
                        className="border-slate-200 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    onClick={handleCreateExecutive}
                    disabled={creatingExec}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {creatingExec ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Create Executive
                  </Button>
                </CardContent>
              </Card>

              {/* Executives List */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-slate-800 text-base">All Executives</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {executives.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">No executives created yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-100">
                          <TableHead className="text-slate-500">Name</TableHead>
                          <TableHead className="text-slate-500">Status</TableHead>
                          <TableHead className="text-slate-500 text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {executives.map((ex) => (
                          <TableRow key={ex.id} className="border-slate-100">
                            <TableCell className="text-slate-800 font-medium">{ex.name}</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-700">Online</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <button
                                onClick={() => handleDeleteExecutive(ex.id!, ex.name)}
                                className="text-red-500 hover:text-red-700 inline-flex items-center gap-1 text-sm"
                              >
                                <Trash2 className="h-4 w-4" /> Delete
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Order Card Component
const OrderCard = ({ order, formatTime, onClick }: { order: OrderData; formatTime: (t: any) => string; onClick: () => void }) => {
  const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
    new: { bg: "bg-blue-100", text: "text-blue-700", label: "New" },
    accepted: { bg: "bg-orange-100", text: "text-orange-700", label: "Accepted" },
    out: { bg: "bg-amber-100", text: "text-amber-700", label: "Out" },
    delivered: { bg: "bg-green-100", text: "text-green-700", label: "Delivered" },
  };

  const badge = statusBadge[order.status] || statusBadge.new;

  return (
    <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="py-4 px-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-bold text-slate-900">{order.name}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Phone className="h-3 w-3" /> +91 {order.phone}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${badge.bg} ${badge.text} border-0`}>{badge.label}</Badge>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Package className="h-3 w-3" /> {order.quantity} trays
            </span>
          </div>
        </div>
        <p className="text-sm text-slate-500 flex items-start gap-1 mb-2">
          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-orange-400" />
          <span className="line-clamp-2">{order.flatNo}, {order.street}</span>
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
  );
};

export default AdminDashboard;
