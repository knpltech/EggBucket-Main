import { useState, useEffect, useMemo } from "react";
import { 
  loginAdmin, 
  logoutAdmin, 
  onAuthChange, 
  subscribeToOrders, 
  subscribeToDeliveryExecutives, 
  getPrice, 
  setPrice, 
  assignOrder,
  updateOrderStatus,
  createDeliveryExecutive,
  deleteDeliveryExecutive
} from "./lib/firebase";
import type { OrderData, DeliveryExecutive } from "./lib/firebase";
import AdminAnalytics from "./components/AdminAnalytics";
import CustomerPredictions from "./components/CustomerPredictions";
import DeliveryMetrics from "./components/DeliveryMetrics";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Sparkles, 
  Truck, 
  DollarSign, 
  LogOut, 
  Loader2, 
  Search, 
  Check, 
  Plus, 
  Trash2,
  Lock,
  Phone,
  MapPin,
  Clock,
  Egg
} from "lucide-react";

type Tab = "dashboard" | "orders" | "customers" | "delivery" | "pricing";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Dashboard Data states
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [executives, setExecutives] = useState<DeliveryExecutive[]>([]);
  const [price, setPriceVal] = useState(180);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  // Orders Tab filters & details
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [assigningExecId, setAssigningExecId] = useState<Record<string, string>>({});

  // Team Create states
  const [newExecName, setNewExecName] = useState("");
  const [newExecPassword, setNewExecPassword] = useState("");
  const [creatingExec, setCreatingExec] = useState(false);

  // Monitor Auth State
  useEffect(() => {
    const unsub = onAuthChange((u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // Monitor Database Real-time feeds when authenticated
  useEffect(() => {
    if (!user) return;
    const unsubOrders = subscribeToOrders(setOrders);
    const unsubExecs = subscribeToDeliveryExecutives(setExecutives);
    getPrice().then(setPriceVal);
    
    return () => {
      unsubOrders();
      unsubExecs();
    };
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLoginError("Please enter both email and password.");
      return;
    }
    setLoginSubmitting(true);
    setLoginError("");
    try {
      await loginAdmin(email, password);
    } catch (err: any) {
      setLoginError("Invalid email or password. Please try again.");
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setUser(null);
  };

  const handleSavePrice = async () => {
    try {
      await setPrice(price);
      alert("Egg Crate Price updated to ₹" + price + "!");
    } catch {
      alert("Failed to update price.");
    }
  };

  const handleCreateExec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExecName.trim()) {
      alert("Please enter a name.");
      return;
    }
    if (newExecPassword.length < 4) {
      alert("Password must be at least 4 characters.");
      return;
    }
    setCreatingExec(true);
    try {
      await createDeliveryExecutive(newExecName.trim(), newExecPassword.trim());
      setNewExecName("");
      setNewExecPassword("");
      alert("Delivery executive created successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to create executive.");
    } finally {
      setCreatingExec(false);
    }
  };

  const handleDeleteExec = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name}?`)) {
      try {
        await deleteDeliveryExecutive(id);
        alert("Executive removed.");
      } catch {
        alert("Failed to delete executive.");
      }
    }
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchStatus = orderFilter === "all" || o.status === orderFilter;
      const matchSearch = o.name.toLowerCase().includes(orderSearch.toLowerCase()) || 
                          o.phone.includes(orderSearch) ||
                          (o.id && o.id.toLowerCase().includes(orderSearch.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [orders, orderFilter, orderSearch]);

  const selectedOrder = useMemo(() => {
    return orders.find(o => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Not Authenticated -> Show Login screen
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-slate-950 via-slate-900 to-orange-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-orange-500/20">
              <Egg className="h-9 w-9 text-white animate-pulse" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight pt-2">Egg Bucket</h1>
            <p className="text-slate-400 text-sm font-medium">Administrative Web Portal</p>
          </div>

          {loginError && (
            <div className="bg-red-500/15 border border-red-500/30 text-red-200 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <Lock className="h-4 w-4 text-red-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@eggbucket.com"
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={loginSubmitting}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {loginSubmitting ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Access Dashboard"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-55 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div className="p-6 space-y-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8.5 h-8.5 bg-orange-500 rounded-lg flex items-center justify-center">
              <Egg className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white leading-none">Egg Bucket</h2>
              <span className="text-[10px] text-orange-500 font-extrabold tracking-widest uppercase">Admin Portal</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === "dashboard"
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/15"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <LayoutDashboard className="h-4.5 w-4.5" /> Dashboard
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === "orders"
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/15"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <span className="flex items-center gap-3">
                <ShoppingBag className="h-4.5 w-4.5" /> Orders
              </span>
              {orders.filter(o => o.status === "new").length > 0 && (
                <span className="bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {orders.filter(o => o.status === "new").length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("customers")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === "customers"
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/15"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Sparkles className="h-4.5 w-4.5" /> Predictions
            </button>

            <button
              onClick={() => setActiveTab("delivery")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === "delivery"
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/15"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Truck className="h-4.5 w-4.5" /> Team & Salaries
            </button>

            <button
              onClick={() => setActiveTab("pricing")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === "pricing"
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/15"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <DollarSign className="h-4.5 w-4.5" /> Pricing Config
            </button>
          </nav>
        </div>

        {/* User Info / LogOut */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <div className="px-2">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Logged in as</p>
            <p className="text-sm font-bold text-slate-300 truncate">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-950/20 hover:text-red-400 text-slate-400 rounded-xl text-xs font-bold transition-all"
          >
            <LogOut className="h-4 w-4" /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="flex flex-col space-y-1">
              <h1 className="text-2xl font-black text-slate-900">Analytics Overview</h1>
              <p className="text-slate-500 text-sm">Review real-time sales performance and active operations.</p>
            </div>
            <AdminAnalytics orders={orders} executives={executives} />
          </div>
        )}

        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-1">
                <h1 className="text-2xl font-black text-slate-900">Orders Management</h1>
                <p className="text-slate-500 text-sm">Browse, assign, and update active orders.</p>
              </div>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
                <input
                  type="text"
                  placeholder="Search by name, phone, ID..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/25 transition-all text-sm shadow-sm"
                />
              </div>
            </div>

            {/* Layout split: Left table list, Right Order details preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left Side: Interactive Table */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Filters Row */}
                <div className="flex border-b border-slate-100 p-2 gap-1 overflow-x-auto">
                  {["all", "new", "accepted", "out", "delivered"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setOrderFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize shrink-0 ${
                        orderFilter === status
                          ? "bg-orange-50 text-orange-600 font-extrabold"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      {status === "new" ? "New" : status === "out" ? "Out for Delivery" : status} ({
                        status === "all" ? orders.length : orders.filter(o => o.status === status).length
                      })
                    </button>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-500 font-semibold text-xs border-b border-slate-100 uppercase tracking-wider">
                        <th className="py-4 px-6">Customer</th>
                        <th className="py-4 px-6">Items</th>
                        <th className="py-4 px-6">Price</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400">
                            No orders found.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((o: OrderData) => (
                          <tr
                            key={o.id}
                            onClick={() => setSelectedOrderId(o.id || null)}
                            className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${
                              selectedOrderId === o.id ? "bg-orange-50/30" : ""
                            }`}
                          >
                            <td className="py-4 px-6">
                              <div>
                                <p className="font-bold text-slate-950">{o.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">+91 {o.phone}</p>
                              </div>
                            </td>
                            <td className="py-4 px-6 font-semibold">
                              {o.quantity} trays
                            </td>
                            <td className="py-4 px-6 font-bold text-slate-900">
                              ₹{o.totalPrice}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                                o.status === "new" ? "bg-blue-50 text-blue-700" :
                                o.status === "accepted" ? "bg-orange-55 text-orange-700" :
                                o.status === "out" ? "bg-amber-50 text-amber-700" :
                                "bg-green-50 text-green-700"
                              }`}>
                                {o.status === "new" ? "New" : o.status === "out" ? "Out for Delivery" : o.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                              {o.status === "new" && (
                                <button
                                  onClick={async () => {
                                    if (o.id) {
                                      await updateOrderStatus(o.id, "accepted");
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold shadow-sm"
                                >
                                  Accept Order
                                </button>
                              )}

                              {o.status === "accepted" && (
                                <div className="flex items-center justify-end gap-2">
                                  <select
                                    value={assigningExecId[o.id || ""] || ""}
                                    onChange={(e) => setAssigningExecId(prev => ({ ...prev, [o.id || ""]: e.target.value }))}
                                    className="px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none bg-slate-50 focus:bg-white"
                                  >
                                    <option value="">Select Agent...</option>
                                    {executives.map(ex => (
                                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={async () => {
                                      const execId = assigningExecId[o.id || ""];
                                      if (!execId) {
                                        alert("Please select an agent first.");
                                        return;
                                      }
                                      if (o.id) {
                                        await assignOrder(o.id, execId);
                                        alert("Assigned successfully!");
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm"
                                  >
                                    Assign
                                  </button>
                                </div>
                              )}

                              {o.status === "out" && (
                                <button
                                  onClick={async () => {
                                    if (o.id) {
                                      await updateOrderStatus(o.id, "delivered");
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold shadow-sm"
                                >
                                  Mark Delivered
                                </button>
                              )}

                              {o.status === "delivered" && (
                                <span className="text-xs text-green-600 font-semibold flex items-center justify-end gap-1">
                                  <Check className="h-4 w-4" /> Delivered
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Side: Detailed Details Panel */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                <h4 className="text-lg font-bold text-slate-900">Order Detailed Spec</h4>
                {selectedOrder ? (
                  <div className="space-y-4 divide-y divide-slate-100">
                    <div className="pb-3 space-y-1">
                      <p className="text-xs text-slate-500 font-semibold">CUSTOMER IDENTITY</p>
                      <h5 className="text-base font-bold text-slate-900">{selectedOrder.name}</h5>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-slate-400" /> +91 {selectedOrder.phone}
                      </span>
                    </div>

                    <div className="py-3 space-y-1">
                      <p className="text-xs text-slate-500 font-semibold">ITEMS ORDERED</p>
                      <p className="text-sm font-bold text-slate-800">{selectedOrder.quantity} trays (30 Eggs each)</p>
                      <p className="text-xs text-slate-500">Price per crate: ₹{selectedOrder.pricePerCrate}</p>
                      {selectedOrder.includeTray && (
                        <p className="text-xs font-bold text-orange-600 mt-1">
                          ★ Plastic Tray Add-on (₹{selectedOrder.trayPrice || 49})
                        </p>
                      )}
                      <p className="text-sm font-black text-slate-900 mt-2">Total Paid: ₹{selectedOrder.totalPrice}</p>
                    </div>

                    <div className="py-3 space-y-1">
                      <p className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" /> LOCATION & DIRECTIONS
                      </p>
                      <p className="text-sm font-bold text-slate-800">{selectedOrder.flatNo}</p>
                      <p className="text-xs text-slate-500">{selectedOrder.street}</p>
                      {selectedOrder.latitude && selectedOrder.longitude && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${selectedOrder.latitude},${selectedOrder.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-bold border border-orange-200 hover:bg-orange-50/50 px-2 py-1 rounded-md"
                        >
                          Navigate in Google Maps
                        </a>
                      )}
                    </div>

                    <div className="py-3 space-y-1">
                      <p className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" /> TIMESTAMPS
                      </p>
                      <p className="text-xs text-slate-700 font-medium">
                        Placed on: {selectedOrder.createdAt?.toDate ? selectedOrder.createdAt.toDate().toLocaleString("en-IN") : new Date(selectedOrder.createdAt).toLocaleString("en-IN")}
                      </p>
                      {selectedOrder.assignedTo && (
                        <p className="text-xs text-slate-700 font-medium mt-1">
                          Assigned Agent ID: <span className="font-bold">{executives.find(ex => ex.id === selectedOrder.assignedTo)?.name || selectedOrder.assignedTo}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm text-center py-12">
                    Select an order from the list to view its complete summary details here.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "customers" && (
          <div className="space-y-6">
            <div className="flex flex-col space-y-1">
              <h1 className="text-2xl font-black text-slate-900">Demand Predictions</h1>
              <p className="text-slate-500 text-sm">Analyze consumption intervals and forecast restocking.</p>
            </div>
            <CustomerPredictions orders={orders} />
          </div>
        )}

        {activeTab === "delivery" && (
          <div className="space-y-6">
            <div className="flex flex-col space-y-1">
              <h1 className="text-2xl font-black text-slate-900">Team Performance & Salaries</h1>
              <p className="text-slate-500 text-sm">Monitor agent statuses, adjust payouts, and reconcile collections.</p>
            </div>

            {/* Tab layout with delivery metric view */}
            <DeliveryMetrics orders={orders} executives={executives} />

            {/* Section: Create Delivery Executive */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-orange-500" /> Add Delivery Agent
                </h4>
                <form onSubmit={handleCreateExec} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">Agent Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={newExecName}
                      onChange={(e) => setNewExecName(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/25 transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">Password (credentials)</label>
                    <input
                      type="password"
                      placeholder="Create at least 4 chars..."
                      value={newExecPassword}
                      onChange={(e) => setNewExecPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/25 transition-all text-sm font-medium"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={creatingExec}
                    className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    {creatingExec ? "Creating..." : "Register Executive"}
                  </button>
                </form>
              </div>

              {/* Registered Executives Registry */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-lg font-bold text-slate-900">Registry list</h4>
                <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto pr-1">
                  {executives.length === 0 ? (
                    <p className="text-slate-400 text-sm py-4 text-center">No registered agents.</p>
                  ) : (
                    executives.map(ex => (
                      <div key={ex.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{ex.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium">Status: <span className="font-bold">{ex.status}</span></p>
                        </div>
                        <button
                          onClick={() => handleDeleteExec(ex.id!, ex.name)}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "pricing" && (
          <div className="space-y-6">
            <div className="flex flex-col space-y-1">
              <h1 className="text-2xl font-black text-slate-900">Pricing Settings</h1>
              <p className="text-slate-500 text-sm">Configure default base prices visible to customers.</p>
            </div>

            <div className="max-w-md bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h4 className="text-lg font-bold text-slate-900">Crate Price Settings</h4>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 block">Default Price per Crate (30 Eggs)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPriceVal(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/25 transition-all text-sm font-semibold"
                    />
                  </div>
                  <button
                    onClick={handleSavePrice}
                    className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm shadow-sm transition-all"
                  >
                    Save Price
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                This pricing acts as the base unit rate for ordering crates, reflecting on the ordering page.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
