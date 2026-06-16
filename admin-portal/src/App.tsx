import { useState, useEffect, useMemo } from "react";
import { 
  loginAdmin, 
  logoutAdmin, 
  onAuthChange, 
  subscribeToOrders, 
  subscribeToDeliveryExecutives, 
  setPrice, 
  subscribeToPrice,
  assignOrder,
  updateOrderStatus,
  createDeliveryExecutive,
  deleteDeliveryExecutive,
  deleteOrder
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
  Calendar,
  ChevronDown,
  ArrowUpDown,
  Download
} from "lucide-react";
import * as XLSX from "xlsx";
import eggLogo from "./assets/logo-egg-png.png";

type Tab = "dashboard" | "orders" | "customers" | "delivery" | "pricing";

const filterOrdersByDateRange = (orders: OrderData[], range: string, customStart?: string, customEnd?: string) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return orders.filter(o => {
    if (!o.createdAt) return false;
    
    const orderDate = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    const startOfOrderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
    
    switch (range) {
      case "today":
        return startOfOrderDay.getTime() === startOfToday.getTime();
        
      case "yesterday": {
        const yesterday = new Date(startOfToday);
        yesterday.setDate(yesterday.getDate() - 1);
        return startOfOrderDay.getTime() === yesterday.getTime();
      }
        
      case "last7days": {
        const sevenDaysAgo = new Date(startOfToday);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return orderDate >= sevenDaysAgo;
      }
        
      case "last30days": {
        const thirtyDaysAgo = new Date(startOfToday);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return orderDate >= thirtyDaysAgo;
      }
        
      case "thismonth": {
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return orderDate >= firstDayOfMonth;
      }
        
      case "lastmonth": {
        const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return orderDate >= firstDayOfLastMonth && orderDate <= lastDayOfLastMonth;
      }
        
      case "custom": {
        if (!customStart) return true;
        const start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
        
        let end = new Date();
        if (customEnd) {
          end = new Date(customEnd);
          end.setHours(23, 59, 59, 999);
        } else {
          end.setHours(23, 59, 59, 999);
        }
        return orderDate >= start && orderDate <= end;
      }
        
      default:
        return true;
    }
  });
};

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

  // Global Date Filter
  const [globalDateRange, setGlobalDateRange] = useState<string>("last7days");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Orders Tab filters, search, sorting & pagination
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [sortField, setSortField] = useState<"createdAt" | "quantity" | "totalPrice">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
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
    const unsubPrice = subscribeToPrice(setPriceVal);
    
    return () => {
      unsubOrders();
      unsubExecs();
      unsubPrice();
    };
  }, [user]);

  // Reset pagination when search or status filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [orderFilter, orderSearch, globalDateRange]);

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

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteOrder(orderId);
      setSelectedOrderId(null);
      alert("Order deleted successfully.");
    } catch (err: any) {
      alert("Failed to delete order: " + (err.message || err));
    }
  };

  // Filter orders globally by Date Range
  const globallyFilteredOrders = useMemo(() => {
    return filterOrdersByDateRange(orders, globalDateRange, customStartDate, customEndDate);
  }, [orders, globalDateRange, customStartDate, customEndDate]);

  // Orders Tab: filtered by search query and tab status
  const ordersTabFiltered = useMemo(() => {
    return globallyFilteredOrders.filter(o => {
      const matchStatus = orderFilter === "all" || o.status === orderFilter;
      const query = orderSearch.toLowerCase().trim();
      const matchSearch = !query || 
                          o.name.toLowerCase().includes(query) ||
                          o.phone.includes(query) ||
                          (o.id && o.id.toLowerCase().includes(query));
      return matchStatus && matchSearch;
    });
  }, [globallyFilteredOrders, orderFilter, orderSearch]);

  // Orders Tab: sorted by user parameters
  const ordersTabSorted = useMemo(() => {
    return [...ordersTabFiltered].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === "createdAt") {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        valA = dateA.getTime();
        valB = dateB.getTime();
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [ordersTabFiltered, sortField, sortOrder]);

  // Orders Tab: paginated for clean layout
  const ordersTabPaginated = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return ordersTabSorted.slice(startIdx, startIdx + itemsPerPage);
  }, [ordersTabSorted, currentPage]);

  const totalPages = Math.ceil(ordersTabSorted.length / itemsPerPage);

  const selectedOrder = useMemo(() => {
    return orders.find(o => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (ordersTabSorted.length === 0) {
      alert("No orders available to export.");
      return;
    }
    const headers = ["Order ID", "Customer Name", "Phone", "Quantity (Trays)", "Price Per Tray (₹)", "Plastic Trays (Qty)", "Total Price (₹)", "Status", "Address", "Date Placed"];
    const rows = ordersTabSorted.map(o => {
      const date = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      return [
        o.id || "",
        o.name,
        o.phone,
        o.quantity,
        o.pricePerCrate,
        o.includeTray ? (o.trayQuantity || 1) : 0,
        o.totalPrice,
        o.status,
        `"${o.flatNo}, ${o.street}"`,
        date.toLocaleString("en-IN")
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `EggBucket_Orders_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Excel Handler
  const handleExportExcel = () => {
    if (ordersTabSorted.length === 0) {
      alert("No data to export.");
      return;
    }
    const data = ordersTabSorted.map(o => {
      const date = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      const agent = executives.find(ex => ex.id === o.assignedTo)?.name || "Not Assigned";
      return {
        "Order ID": o.id || "",
        "Date & Time": date.toLocaleString("en-IN"),
        "Customer Name": o.name,
        "Phone Number": o.phone,
        "Quantity (Trays)": o.quantity,
        "Price Per Tray (₹)": o.pricePerCrate,
        "Plastic Trays (Qty)": o.includeTray ? (o.trayQuantity || 1) : 0,
        "Total Price (₹)": o.totalPrice,
        "Status": o.status.toUpperCase(),
        "Address": `${o.flatNo}, ${o.street}`,
        "Assigned Agent": agent
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders Registry");
    XLSX.writeFile(workbook, `EggBucket_Orders_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not Authenticated -> Show Login screen
  if (!user) {
    return (
      <div className="min-h-screen bg-bg-main flex flex-col lg:flex-row">
        {/* LEFT SIDE: Hero Section */}
        <div className="lg:w-7/12 bg-gradient-to-br from-orange-400 via-orange-50 to-amber-500 p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden text-white min-h-[45vh] lg:min-h-screen" style={{ backgroundImage: "linear-gradient(135deg, #FF9F43 0%, #FF7A00 100%)" }}>
          {/* Decorative Background Elements */}
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
            {/* Floating glowing circles */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/20 rounded-full filter blur-3xl animate-pulse-slow"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-300/20 rounded-full filter blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }}></div>
          </div>

          {/* Logo / Header */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/10">
              <img src={eggLogo} alt="Egg Bucket Logo" className="h-6 w-auto object-contain" />
            </div>
            <div>
              <h2 className="text-xl font-black font-heading tracking-wide leading-none text-white">Egg Bucket</h2>
              <span className="text-[10px] text-orange-100 font-extrabold tracking-widest uppercase mt-0.5 block">Admin Portal</span>
            </div>
          </div>

          {/* Hero Content */}
          <div className="relative z-10 my-auto py-12 lg:py-0 max-w-2xl space-y-6">
            <h1 className="text-3xl lg:text-5xl font-black font-heading leading-tight tracking-tight text-white">
              Smart Distribution Intelligence for Egg Businesses
            </h1>
            <p className="text-base lg:text-lg text-white/95 font-medium leading-relaxed">
              Monitor orders, deliveries, inventory, payments, and workforce performance from a single powerful dashboard.
            </p>
            
            {/* Feature Bullets */}
            <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Real-time Order Tracking",
                "Delivery Agent Analytics",
                "Revenue & Growth Insights",
                "Inventory Monitoring",
                "Team Performance Reports"
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3 text-sm font-semibold bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-sm">
                  <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer inside Left side */}
          <div className="relative z-10 text-xs text-orange-100/80 font-semibold">
            © {new Date().getFullYear()} Egg Bucket Inc. All rights reserved.
          </div>
        </div>

        {/* RIGHT SIDE: Login Card */}
        <div className="lg:w-5/12 bg-bg-main flex flex-col justify-center p-8 lg:p-16 min-h-[55vh] lg:min-h-screen">
          <div className="w-full max-w-md mx-auto space-y-8">
            <div className="space-y-2 text-left">
              <h2 className="text-3xl font-black font-heading text-slate-800 tracking-tight">Welcome Back</h2>
              <p className="text-slate-500 font-medium text-sm">Enter your credentials to access the administration panel.</p>
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs flex items-center gap-2 font-semibold animate-in fade-in slide-in-from-top-1">
                <Lock className="h-4 w-4 text-red-500 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@eggbucket.com"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-semibold shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-semibold shadow-sm"
                />
              </div>
              
              <button
                type="submit"
                disabled={loginSubmitting}
                className="w-full py-3.5 bg-primary hover:bg-orange-600 text-white rounded-2xl text-sm font-extrabold shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loginSubmitting ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    Verifying Credentials...
                  </>
                ) : (
                  "Access Admin Panel"
                )}
              </button>
            </form>

            <div className="pt-6 border-t border-slate-200 text-center">
              <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase">
                Trusted by Egg Distributors Across India
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200/60 flex flex-col justify-between shrink-0 sticky top-0 h-screen z-20">
        <div className="p-6 space-y-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
              <img src={eggLogo} alt="Egg Bucket Logo" className="h-5.5 w-auto object-contain" />
            </div>
            <div>
              <h2 className="text-base font-black font-heading text-slate-800 leading-none">Egg Bucket</h2>
              <span className="text-[9px] text-primary font-black tracking-widest uppercase mt-0.5 block">Admin Portal</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1.5">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "orders", label: "Orders", icon: ShoppingBag, badge: orders.filter(o => o.status === "new").length },
              { id: "customers", label: "Predictions", icon: Sparkles },
              { id: "delivery", label: "Team & Salaries", icon: Truck },
              { id: "pricing", label: "Pricing Config", icon: DollarSign }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as Tab)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4.5 w-4.5" />
                    {item.label}
                  </span>
                  {item.badge && item.badge > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                      isActive ? "bg-white text-primary" : "bg-primary/15 text-primary"
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info / LogOut */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4">
          <div className="px-2">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Logged in as</p>
            <p className="text-xs font-bold text-slate-700 truncate mt-0.5">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-red-50 hover:text-red-600 text-slate-500 rounded-xl text-xs font-bold border border-slate-200/60 shadow-sm transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" /> Log Out
          </button>
        </div>
      </aside>

      {/* Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Header */}
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 z-10">
          <div>
            <h1 className="text-xl font-black font-heading text-slate-800 capitalize leading-tight">
              {activeTab === "dashboard" ? "Analytics Dashboard" : 
               activeTab === "orders" ? "Orders Registry" : 
               activeTab === "customers" ? "Demand Predictor" : 
               activeTab === "delivery" ? "Team & Payroll" : 
               "Pricing Parameters"}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {activeTab === "dashboard" ? "Monitor real-time sales, collections, and workforce performance." : 
               activeTab === "orders" ? "Manage customer shipments, dispatch logs, and delivery assignments." : 
               activeTab === "customers" ? "Forecast restocking schedules based on consumption intervals." : 
               activeTab === "delivery" ? "Review agent completion rates, incentives, and payroll payouts." : 
               "Configure standard unit rates for crates and add-on packaging."}
            </p>
          </div>

          {/* Date Filter Widget */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {globalDateRange === "custom" && (
              <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-200">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="text-xs text-slate-400 font-bold">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            <div className="relative">
              <select
                value={globalDateRange}
                onChange={(e) => setGlobalDateRange(e.target.value)}
                className="pl-8 pr-6 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7days">Last 7 Days</option>
                <option value="last30days">Last 30 Days</option>
                <option value="thismonth">This Month</option>
                <option value="lastmonth">Last Month</option>
                <option value="custom">Custom Range</option>
              </select>
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </header>

        {/* Main Panel Content Area */}
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === "dashboard" && (
            <AdminAnalytics 
              orders={orders} 
              executives={executives} 
              dateRange={globalDateRange} 
              customStartDate={customStartDate} 
              customEndDate={customEndDate} 
            />
          )}

          {activeTab === "orders" && (
            <div className="space-y-6">
              {/* Quick Analytics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Orders Received", value: globallyFilteredOrders.length, color: "text-slate-800 bg-white" },
                  { label: "Orders Delivered", value: globallyFilteredOrders.filter(o => o.status === "delivered").length, color: "text-green-600 bg-white" },
                  { label: "Orders Pending", value: globallyFilteredOrders.filter(o => o.status === "new" || o.status === "accepted" || o.status === "out").length, color: "text-amber-500 bg-white" },
                  { label: "Cancelled Orders", value: globallyFilteredOrders.filter(o => (o.status as string) === "cancelled").length || 0, color: "text-red-500 bg-white" }
                ].map((card) => (
                  <div key={card.label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">{card.label}</p>
                    <p className={`text-3xl font-black mt-1 ${card.color.split(" ")[0]}`}>{card.value}</p>
                  </div>
                ))}
              </div>

              {/* Actions Header Row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Search Box */}
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
                  <input
                    type="text"
                    placeholder="Search by name, phone, ID..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all text-sm font-semibold shadow-sm"
                  />
                </div>

                {/* Exports & Bulk actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleExportCSV}
                    className="px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="px-4 py-2 bg-primary hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Export Excel
                  </button>
                </div>
              </div>

              {/* Layout split: Left table list, Right Order details preview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Side: Interactive Table */}
                <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
                  {/* Filters Row */}
                  <div className="flex border-b border-slate-100 p-2 gap-1 overflow-x-auto">
                    {["all", "new", "accepted", "out", "delivered"].map((status) => (
                      <button
                        key={status}
                        onClick={() => setOrderFilter(status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize shrink-0 ${
                          orderFilter === status
                            ? "bg-primary/10 text-primary font-black"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        {status === "new" ? "New" : status === "out" ? "Out for Delivery" : status} ({
                          status === "all" ? globallyFilteredOrders.length : globallyFilteredOrders.filter(o => o.status === status).length
                        })
                      </button>
                    ))}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 text-slate-400 font-bold text-[10px] border-b border-slate-100 uppercase tracking-wider">
                          <th className="py-4 px-6 select-none cursor-pointer hover:text-slate-700" onClick={() => handleSort("createdAt")}>
                            <span className="flex items-center gap-1">
                              Customer
                              {sortField === "createdAt" && <ArrowUpDown className="h-3 w-3" />}
                            </span>
                          </th>
                          <th className="py-4 px-6 select-none cursor-pointer hover:text-slate-700 text-center" onClick={() => handleSort("quantity")}>
                            <span className="flex items-center justify-center gap-1">
                              Items
                              {sortField === "quantity" && <ArrowUpDown className="h-3 w-3" />}
                            </span>
                          </th>
                          <th className="py-4 px-6 select-none cursor-pointer hover:text-slate-700" onClick={() => handleSort("totalPrice")}>
                            <span className="flex items-center gap-1">
                              Price
                              {sortField === "totalPrice" && <ArrowUpDown className="h-3 w-3" />}
                            </span>
                          </th>
                          <th className="py-4 px-6">Status</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                        {ordersTabPaginated.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                              No orders found.
                            </td>
                          </tr>
                        ) : (
                          ordersTabPaginated.map((o: OrderData) => (
                            <tr
                              key={o.id}
                              onClick={() => setSelectedOrderId(o.id || null)}
                              className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${
                                selectedOrderId === o.id ? "bg-primary/5 border-l-4 border-primary" : ""
                              }`}
                            >
                              <td className="py-4 px-6">
                                <div>
                                  <p className="font-bold text-slate-900">{o.name}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">+91 {o.phone}</p>
                                </div>
                              </td>
                              <td className="py-4 px-6 font-bold text-slate-800 text-center">
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
                                    className="px-3 py-1.5 bg-primary hover:bg-orange-600 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer"
                                  >
                                    Accept Order
                                  </button>
                                )}

                                {o.status === "accepted" && (
                                  <div className="flex items-center justify-end gap-2">
                                    <select
                                      value={assigningExecId[o.id || ""] || ""}
                                      onChange={(e) => setAssigningExecId(prev => ({ ...prev, [o.id || ""]: e.target.value }))}
                                      className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none bg-slate-50 focus:bg-white cursor-pointer"
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
                                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer"
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
                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer"
                                  >
                                    Mark Delivered
                                  </button>
                                )}

                                {o.status === "delivered" && (
                                  <span className="text-xs text-green-600 font-semibold flex items-center justify-end gap-1 pr-2">
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

                  {/* Pagination Footer */}
                  {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-semibold">
                        Page {currentPage} of {totalPages}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className="px-3 py-1 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          Previous
                        </button>
                        <button
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          className="px-3 py-1 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Side: Detailed Details Panel */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 sticky top-20">
                  <h4 className="text-base font-extrabold text-slate-800 uppercase tracking-wider border-b pb-2">Order Specification</h4>
                  {selectedOrder ? (
                    <div className="space-y-4 divide-y divide-slate-100">
                      <div className="pb-3 space-y-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CUSTOMER IDENTITY</p>
                        <h5 className="text-base font-bold text-slate-900">{selectedOrder.name}</h5>
                        <span className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-semibold">
                          <Phone className="h-3.5 w-3.5 text-slate-400" /> +91 {selectedOrder.phone}
                        </span>
                      </div>

                      <div className="py-3 space-y-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ITEMS ORDERED</p>
                        <p className="text-sm font-bold text-slate-800">{selectedOrder.quantity} trays (30 Eggs each)</p>
                        <p className="text-xs text-slate-500">Price per crate: ₹{selectedOrder.pricePerCrate}</p>
                        {selectedOrder.includeTray && (
                          <p className="text-xs font-bold text-primary mt-1">
                            ★ Plastic Tray Add-on: {selectedOrder.trayQuantity || 1} Pcs (₹{selectedOrder.trayPrice || 49} each)
                          </p>
                        )}
                        <p className="text-sm font-black text-slate-900 mt-2">Total Amount: ₹{selectedOrder.totalPrice}</p>
                      </div>

                      <div className="py-3 space-y-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" /> LOCATION & DIRECTIONS
                        </p>
                        <p className="text-sm font-bold text-slate-800">{selectedOrder.flatNo}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{selectedOrder.street}</p>
                        {selectedOrder.latitude && selectedOrder.longitude && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${selectedOrder.latitude},${selectedOrder.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2.5 inline-flex items-center gap-1 text-[11px] text-primary hover:text-orange-600 font-bold border border-orange-100 hover:bg-orange-50/50 px-2.5 py-1 rounded-lg transition-all"
                          >
                            Open in Google Maps
                          </a>
                        )}
                      </div>

                      <div className="py-3 space-y-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400" /> TIMESTAMPS
                        </p>
                        <p className="text-xs text-slate-600 font-medium">
                          Placed on: {selectedOrder.createdAt?.toDate ? selectedOrder.createdAt.toDate().toLocaleString("en-IN") : new Date(selectedOrder.createdAt).toLocaleString("en-IN")}
                        </p>
                        {selectedOrder.assignedTo && (
                          <p className="text-xs text-slate-600 font-medium mt-1">
                            Assigned Executive: <span className="font-bold text-slate-800">{executives.find(ex => ex.id === selectedOrder.assignedTo)?.name || selectedOrder.assignedTo}</span>
                          </p>
                        )}
                      </div>

                      <div className="pt-4 flex justify-end">
                        <button
                          onClick={async () => {
                            if (window.confirm("Are you sure you want to delete this order permanently? This cannot be undone.")) {
                              await handleDeleteOrder(selectedOrder.id!);
                            }
                          }}
                          className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" /> Delete Order
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-xs text-center py-12 font-medium">
                      Select an order from the table to inspect details and assign agents.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "customers" && (
            <div className="space-y-6">
              <CustomerPredictions orders={globallyFilteredOrders} />
            </div>
          )}

          {activeTab === "delivery" && (
            <div className="space-y-6">
              {/* Revamped Team Performance & Salaries metrics */}
              <DeliveryMetrics orders={globallyFilteredOrders} executives={executives} />

              {/* Section: Create Delivery Executive */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" /> Add Delivery Agent
                  </h4>
                  <form onSubmit={handleCreateExec} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 block">Agent Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={newExecName}
                        onChange={(e) => setNewExecName(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all text-sm font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 block">Password (credentials)</label>
                      <input
                        type="password"
                        placeholder="Create at least 4 chars..."
                        value={newExecPassword}
                        onChange={(e) => setNewExecPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all text-sm font-semibold"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={creatingExec}
                      className="w-full py-2.5 bg-primary hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      {creatingExec ? "Creating..." : "Register Executive"}
                    </button>
                  </form>
                </div>

                {/* Registered Executives Registry */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <h4 className="text-base font-bold text-slate-900">Registry List</h4>
                  <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto pr-1">
                    {executives.length === 0 ? (
                      <p className="text-slate-400 text-sm py-4 text-center">No registered agents.</p>
                    ) : (
                      executives.map(ex => (
                        <div key={ex.id} className="py-2.5 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{ex.name}</p>
                            <p className="text-[10px] text-slate-500 font-semibold">Status: <span className="font-bold text-slate-600 capitalize">{ex.status}</span></p>
                          </div>
                          <button
                            onClick={() => handleDeleteExec(ex.id!, ex.name)}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
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
            <div className="max-w-md bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h4 className="text-base font-bold text-slate-900">Crate Price Settings</h4>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 block">Default Price per Crate (30 Eggs)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPriceVal(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all text-sm font-semibold"
                    />
                  </div>
                  <button
                    onClick={handleSavePrice}
                    className="px-4 py-2.5 bg-primary hover:bg-orange-600 text-white rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer"
                  >
                    Save Price
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                This pricing acts as the base unit rate for ordering crates, reflecting on the ordering page.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
