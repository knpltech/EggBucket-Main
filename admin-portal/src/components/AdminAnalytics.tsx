import { useMemo } from "react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import type { OrderData, DeliveryExecutive } from "../lib/firebase";
import { 
  Package, 
  CheckCircle, 
  IndianRupee, 
  Users, 
  ArrowUpRight, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Award,
  Calendar
} from "lucide-react";

interface AdminAnalyticsProps {
  orders: OrderData[];
  executives: DeliveryExecutive[];
  dateRange: string;
  customStartDate?: string;
  customEndDate?: string;
}

const getPeriodDateBoundaries = (range: string, customStart?: string, customEnd?: string) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let currentStart = new Date(today);
  let currentEnd = new Date(now);
  let prevStart = new Date(today);
  let prevEnd = new Date(today);
  
  switch (range) {
    case "today":
      currentStart.setHours(0,0,0,0);
      currentEnd.setHours(23,59,59,999);
      
      prevStart.setDate(prevStart.getDate() - 1);
      prevStart.setHours(0,0,0,0);
      prevEnd.setDate(prevEnd.getDate() - 1);
      prevEnd.setHours(23,59,59,999);
      break;
      
    case "yesterday":
      currentStart.setDate(currentStart.getDate() - 1);
      currentStart.setHours(0,0,0,0);
      currentEnd.setDate(currentEnd.getDate() - 1);
      currentEnd.setHours(23,59,59,999);
      
      prevStart.setDate(prevStart.getDate() - 2);
      prevStart.setHours(0,0,0,0);
      prevEnd.setDate(prevEnd.getDate() - 2);
      prevEnd.setHours(23,59,59,999);
      break;
      
    case "last7days":
      currentStart.setDate(currentStart.getDate() - 6);
      currentStart.setHours(0,0,0,0);
      currentEnd.setHours(23,59,59,999);
      
      prevStart.setDate(prevStart.getDate() - 13);
      prevStart.setHours(0,0,0,0);
      prevEnd.setDate(prevEnd.getDate() - 7);
      prevEnd.setHours(23,59,59,999);
      break;
      
    case "last30days":
      currentStart.setDate(currentStart.getDate() - 29);
      currentStart.setHours(0,0,0,0);
      currentEnd.setHours(23,59,59,999);
      
      prevStart.setDate(prevStart.getDate() - 59);
      prevStart.setHours(0,0,0,0);
      prevEnd.setDate(prevEnd.getDate() - 30);
      prevEnd.setHours(23,59,59,999);
      break;
      
    case "thismonth":
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      currentEnd.setHours(23,59,59,999);
      
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
      
    case "lastmonth":
      currentStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      
      prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
      break;
      
    case "custom": {
      if (customStart) {
        currentStart = new Date(customStart);
        currentStart.setHours(0,0,0,0);
      }
      if (customEnd) {
        currentEnd = new Date(customEnd);
        currentEnd.setHours(23,59,59,999);
      }
      const diffMs = currentEnd.getTime() - currentStart.getTime();
      prevStart = new Date(currentStart.getTime() - diffMs - 1);
      prevEnd = new Date(currentStart.getTime() - 1);
      break;
    }
  }
  return { currentStart, currentEnd, prevStart, prevEnd };
};

export default function AdminAnalytics({ orders, executives, dateRange, customStartDate, customEndDate }: AdminAnalyticsProps) {
  const stats = useMemo(() => {
    const { currentStart, currentEnd, prevStart, prevEnd } = getPeriodDateBoundaries(dateRange, customStartDate, customEndDate);
    
    const parseDate = (o: OrderData) => o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    
    // Filter orders for current period
    const currentOrders = orders.filter(o => {
      if (!o.createdAt) return false;
      const d = parseDate(o);
      return d >= currentStart && d <= currentEnd;
    });

    // Filter orders for previous period
    const prevOrders = orders.filter(o => {
      if (!o.createdAt) return false;
      const d = parseDate(o);
      return d >= prevStart && d <= prevEnd;
    });

    const getKPIs = (periodOrders: OrderData[]) => {
      const totalOrders = periodOrders.length;
      const completed = periodOrders.filter(o => o.status === "delivered");
      const pending = periodOrders.filter(o => o.status !== "delivered" && (o.status as string) !== "cancelled");
      const revenue = completed.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      
      const uniqueCustomers = new Set(periodOrders.map(o => o.phone).filter(Boolean));
      const activeCustomers = uniqueCustomers.size;
      
      const avgOrderValue = completed.length > 0 ? revenue / completed.length : (totalOrders > 0 ? revenue / totalOrders : 0);
      
      return { totalOrders, completedCount: completed.length, pendingCount: pending.length, revenue, activeCustomers, avgOrderValue };
    };

    const currentKPIs = getKPIs(currentOrders);
    const prevKPIs = getKPIs(prevOrders);

    const calcTrend = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const trends = {
      totalOrders: calcTrend(currentKPIs.totalOrders, prevKPIs.totalOrders),
      completedCount: calcTrend(currentKPIs.completedCount, prevKPIs.completedCount),
      pendingCount: calcTrend(currentKPIs.pendingCount, prevKPIs.pendingCount),
      revenue: calcTrend(currentKPIs.revenue, prevKPIs.revenue),
      activeCustomers: calcTrend(currentKPIs.activeCustomers, prevKPIs.activeCustomers),
      avgOrderValue: calcTrend(currentKPIs.avgOrderValue, prevKPIs.avgOrderValue),
    };

    // Chart A: Daily trend for current period
    const dailyDataMap: Record<string, { date: string; count: number; revenue: number }> = {};
    const daysDiff = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24));
    const maxSteps = Math.max(1, Math.min(daysDiff, 31));
    
    for (let i = maxSteps - 1; i >= 0; i--) {
      const d = new Date(currentEnd);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      dailyDataMap[dateStr] = { date: dateStr, count: 0, revenue: 0 };
    }

    currentOrders.forEach(o => {
      const date = parseDate(o);
      const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      if (dailyDataMap[dateStr]) {
        dailyDataMap[dateStr].count += 1;
        if (o.status === "delivered") {
          dailyDataMap[dateStr].revenue += o.totalPrice || 0;
        }
      }
    });

    const dailyChartData = Object.values(dailyDataMap);

    // Chart B: Monthly Completion (last 6 months)
    const monthlyDataMap: Record<string, { month: string; completed: number; pending: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toLocaleDateString("en-IN", { month: "short" });
      monthlyDataMap[monthStr] = { month: monthStr, completed: 0, pending: 0 };
    }

    orders.forEach(o => {
      if (!o.createdAt) return;
      const date = parseDate(o);
      const monthStr = date.toLocaleDateString("en-IN", { month: "short" });
      if (monthlyDataMap[monthStr]) {
        if (o.status === "delivered") {
          monthlyDataMap[monthStr].completed += 1;
        } else if ((o.status as string) !== "cancelled") {
          monthlyDataMap[monthStr].pending += 1;
        }
      }
    });

    const monthlyChartData = Object.values(monthlyDataMap);

    // Chart C: Top 5 Customers by Revenue
    const customerMap: Record<string, { name: string; revenue: number; trays: number }> = {};
    currentOrders.forEach(o => {
      if (!o.phone) return;
      if (!customerMap[o.phone]) {
        customerMap[o.phone] = { name: o.name || "Customer", revenue: 0, trays: 0 };
      }
      customerMap[o.phone].trays += o.quantity || 0;
      if (o.status === "delivered") {
        customerMap[o.phone].revenue += o.totalPrice || 0;
      }
    });

    const topCustomersChartData = Object.values(customerMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(c => ({
        name: c.name.length > 12 ? c.name.slice(0, 10) + ".." : c.name,
        revenue: c.revenue,
        trays: c.trays
      }));

    // Chart D: Delivery Share
    const execVolumeMap: Record<string, number> = {};
    currentOrders.filter(o => o.status === "delivered").forEach(o => {
      if (!o.assignedTo) return;
      const exec = executives.find(e => e.id === o.assignedTo);
      const execName = exec ? exec.name : "Unassigned";
      execVolumeMap[execName] = (execVolumeMap[execName] || 0) + 1;
    });

    const COLORS = ["#FF7A00", "#F59E0B", "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899"];
    const execChartData = Object.entries(execVolumeMap).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    }));

    const cashMetrics = (() => {
      let totalCashCollected = 0;
      let totalCashPending = 0;
      const agentHoldings: Record<string, { collected: number; pending: number }> = {};

      executives.forEach(ex => {
        if (ex.id) {
          agentHoldings[ex.id] = { collected: 0, pending: 0 };
        }
      });

      currentOrders.forEach(o => {
        if (o.status === "delivered") {
          const cashVal = o.totalPrice || 0;
          totalCashCollected += cashVal;
          if (!o.settled) {
            totalCashPending += cashVal;
          }
          if (o.assignedTo && agentHoldings[o.assignedTo]) {
            agentHoldings[o.assignedTo].collected += cashVal;
            if (!o.settled) {
              agentHoldings[o.assignedTo].pending += cashVal;
            }
          }
        }
      });

      return { totalCashCollected, totalCashPending, agentHoldings };
    })();

    return {
      currentKPIs,
      trends,
      dailyChartData,
      monthlyChartData,
      topCustomersChartData,
      execChartData,
      cashMetrics
    };
  }, [orders, executives, dateRange, customStartDate, customEndDate]);

  // Comparison Text Label helper
  const getComparisonLabel = () => {
    switch (dateRange) {
      case "today": return "vs yesterday";
      case "yesterday": return "vs day before";
      case "last7days": return "vs previous 7d";
      case "last30days": return "vs previous 30d";
      case "thismonth": return "vs last month";
      case "lastmonth": return "vs previous month";
      default: return "vs last period";
    }
  };

  const kpisList = [
    {
      label: "Total Orders",
      value: stats.currentKPIs.totalOrders,
      trend: stats.trends.totalOrders,
      suffix: "",
      icon: Package,
      iconColor: "text-orange-500 bg-orange-50",
      description: "Placements within range"
    },
    {
      label: "Completed Deliveries",
      value: stats.currentKPIs.completedCount,
      trend: stats.trends.completedCount,
      suffix: "",
      icon: CheckCircle,
      iconColor: "text-green-500 bg-green-50",
      description: "Delivered shipments"
    },
    {
      label: "Pending Deliveries",
      value: stats.currentKPIs.pendingCount,
      trend: stats.trends.pendingCount,
      suffix: "",
      icon: Clock,
      iconColor: "text-amber-500 bg-amber-50",
      description: "Accepted/dispatched"
    },
    {
      label: "Monthly Revenue",
      value: `₹${stats.currentKPIs.revenue.toLocaleString("en-IN")}`,
      trend: stats.trends.revenue,
      suffix: "",
      icon: IndianRupee,
      iconColor: "text-blue-500 bg-blue-50",
      description: "Delivered value total"
    },
    {
      label: "Active Customers",
      value: stats.currentKPIs.activeCustomers,
      trend: stats.trends.activeCustomers,
      suffix: "",
      icon: Users,
      iconColor: "text-purple-500 bg-purple-50",
      description: "Unique buyers"
    },
    {
      label: "Average Order Value",
      value: `₹${Math.round(stats.currentKPIs.avgOrderValue).toLocaleString("en-IN")}`,
      trend: stats.trends.avgOrderValue,
      suffix: "",
      icon: ArrowUpRight,
      iconColor: "text-pink-500 bg-pink-50",
      description: "Per completed order"
    }
  ];

  return (
    <div className="space-y-6">
      {/* 6 KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpisList.map((kpi) => {
          const Icon = kpi.icon;
          const isPositive = kpi.trend >= 0;
          
          return (
            <div key={kpi.label} className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-sm flex items-start justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="space-y-3">
                <p className="text-xs text-slate-400 font-extrabold uppercase tracking-wider">{kpi.label}</p>
                <h3 className="text-3xl font-black text-slate-800 font-heading tracking-tight">{kpi.value}</h3>
                
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                    isPositive 
                      ? "bg-green-50 text-green-600 border border-green-100" 
                      : "bg-red-50 text-red-600 border border-red-100"
                  }`}>
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3 shrink-0" />
                    ) : (
                      <TrendingDown className="h-3 w-3 shrink-0" />
                    )}
                    {isPositive ? "+" : ""}{kpi.trend}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                    {getComparisonLabel()}
                  </span>
                </div>
              </div>

              <div className={`p-4 rounded-2xl ${kpi.iconColor} shadow-inner`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Cash Position & Agent Holdings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-orange-50/20 p-6 rounded-3xl border border-orange-100/50 shadow-sm animate-in fade-in duration-300">
        <div className="lg:col-span-12">
          <h4 className="text-base font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            💰 Cash Position & Agent Holdings
          </h4>
          <p className="text-xs text-slate-500 mt-1">Real-time monitoring of cash collected and pending agent deposits for the selected range</p>
        </div>
        
        {/* Left Side: Summary Cards */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Cash Collected</p>
              <p className="text-xl font-black text-slate-800 font-heading">
                ₹{stats.cashMetrics.totalCashCollected.toLocaleString("en-IN")}
              </p>
              <p className="text-[9px] text-slate-400 font-bold">In selected period</p>
            </div>
            <div className="p-3 bg-blue-50/60 text-blue-500 rounded-xl">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Cash With Agents</p>
              <p className="text-xl font-black text-orange-600 font-heading">
                ₹{stats.cashMetrics.totalCashPending.toLocaleString("en-IN")}
              </p>
              <p className="text-[9px] text-orange-500 font-bold">Pending Deposit</p>
            </div>
            <div className="p-3 bg-orange-50 text-primary rounded-xl">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Right Side: Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h5 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Agent-wise Cash Holdings</h5>
          </div>
          <div className="max-h-[140px] overflow-y-auto flex-grow">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/20 text-slate-400 font-bold text-[9px] border-b border-slate-100 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Agent Name</th>
                  <th className="py-2.5 px-4 text-right">Cash Collected</th>
                  <th className="py-2.5 px-4 text-right">Cash Pending Deposit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {executives.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400 font-semibold">
                      No delivery agents registered.
                    </td>
                  </tr>
                ) : (
                  executives.map(ex => {
                    const holdings = stats.cashMetrics.agentHoldings[ex.id || ""] || { collected: 0, pending: 0 };
                    return (
                      <tr key={ex.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-slate-900">{ex.name}</td>
                        <td className="py-2.5 px-4 text-right font-semibold text-slate-600">
                          ₹{holdings.collected.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-orange-600">
                          ₹{holdings.pending.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* A. Orders vs Revenue Trend (Line Chart) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/50 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Orders & Revenue Trend</h4>
              <p className="text-xs text-slate-500">Dual axis sales and order volumes within active range</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/60 text-slate-600 rounded-xl text-xs font-bold">
              <Calendar className="h-3.5 w-3.5 text-slate-400" /> Active Range
            </div>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF7A00" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#FF7A00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} />
                <YAxis yAxisId="left" stroke="#3B82F6" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#FF7A00" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid rgba(226, 232, 240, 0.8)", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)" }}
                  labelClassName="font-black text-slate-800 text-xs"
                  wrapperStyle={{ outline: "none" }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }} />
                <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area yAxisId="right" type="monotone" dataKey="count" name="Orders Count" stroke="#FF7A00" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* B. Monthly Order Completion (Bar Chart) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Order Completion</h4>
            <p className="text-xs text-slate-500 mb-6">Completed vs. pending orders (Last 6 Months)</p>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid rgba(226, 232, 240, 0.8)", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)" }}
                  wrapperStyle={{ outline: "none" }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }} />
                <Bar dataKey="completed" name="Completed" fill="#22C55E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#FF7A00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* C. Top Customers (Horizontal Bar Chart) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Top Customers</h4>
            <p className="text-xs text-slate-500 mb-6">Highest spending customers in active range</p>
          </div>

          <div className="h-[280px] w-full">
            {stats.topCustomersChartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Award className="h-10 w-10 mb-2 opacity-50 text-slate-300" />
                <span className="text-xs font-semibold">No customer records in range</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={stats.topCustomersChartData}
                  margin={{ top: 0, right: 10, left: -10, bottom: 0 }}
                >
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#1F2937" fontSize={10} fontWeight="bold" tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid rgba(226, 232, 240, 0.8)", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)" }}
                    wrapperStyle={{ outline: "none" }}
                  />
                  <Bar dataKey="revenue" name="Sales (₹)" fill="#FF7A00" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* D. Delivery Performance Share (Donut Chart) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Delivery Distribution</h4>
            <p className="text-xs text-slate-500 mb-6">Delivered order share by executive</p>
          </div>

          <div className="flex flex-col items-center justify-center flex-grow">
            {stats.execChartData.length === 0 ? (
              <div className="h-[200px] flex flex-col items-center justify-center text-slate-400">
                <Package className="h-10 w-10 mb-2 opacity-50 text-slate-300" />
                <span className="text-xs font-semibold">No completed dispatches</span>
              </div>
            ) : (
              <>
                <div className="h-[180px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.execChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {stats.execChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid rgba(226, 232, 240, 0.8)", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)" }}
                        wrapperStyle={{ outline: "none" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                    <p className="text-2xl font-black text-slate-800 font-heading leading-none">
                      {stats.currentKPIs.completedCount}
                    </p>
                    <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mt-1">Delivered</p>
                  </div>
                </div>

                {/* Custom Legends */}
                <div className="w-full mt-4 grid grid-cols-2 gap-2 text-[10px] max-h-[80px] overflow-y-auto pr-1">
                  {stats.execChartData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="truncate font-semibold">{entry.name} ({entry.value})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
