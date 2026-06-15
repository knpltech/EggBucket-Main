import { useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import type { OrderData, DeliveryExecutive } from "../lib/firebase";
import { Package, IndianRupee, Truck, Calendar, ShoppingBag, CheckCircle } from "lucide-react";

interface AdminAnalyticsProps {
  orders: OrderData[];
  executives: DeliveryExecutive[];
}

export default function AdminAnalytics({ orders, executives }: AdminAnalyticsProps) {
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.status === "delivered");
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const totalTrays = orders.reduce((sum, o) => sum + (o.quantity || 0), 0);

    // Group orders and revenue by date (last 7 days)
    const dailyDataMap: Record<string, { date: string; count: number; revenue: number }> = {};
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      dailyDataMap[dateStr] = { date: dateStr, count: 0, revenue: 0 };
    }

    orders.forEach(o => {
      if (!o.createdAt) return;
      const date = typeof o.createdAt.toDate === "function" ? o.createdAt.toDate() : new Date(o.createdAt as any);
      const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      
      if (dailyDataMap[dateStr]) {
        dailyDataMap[dateStr].count += 1;
        if (o.status === "delivered") {
          dailyDataMap[dateStr].revenue += o.totalPrice || 0;
        }
      }
    });

    const dailyChartData = Object.values(dailyDataMap);

    // Group by delivery executive for volume distribution
    const execVolumeMap: Record<string, number> = {};
    deliveredOrders.forEach(o => {
      if (!o.assignedTo) return;
      const exec = executives.find(e => e.id === o.assignedTo);
      const execName = exec ? exec.name : "Unassigned/Deleted";
      execVolumeMap[execName] = (execVolumeMap[execName] || 0) + 1;
    });

    const COLORS = ["#F8790A", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b"];
    const execChartData = Object.entries(execVolumeMap).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    }));

    return {
      totalOrders,
      totalRevenue,
      deliveredCount: deliveredOrders.length,
      totalTrays,
      dailyChartData,
      execChartData
    };
  }, [orders, executives]);

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Orders</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{stats.totalOrders}</h3>
            <p className="text-xs text-orange-500 font-medium mt-1">Placements to date</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-2xl text-orange-500">
            <Package className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Completed Deliveries</p>
            <h3 className="text-3xl font-extrabold text-green-600 mt-2">{stats.deliveredCount}</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {stats.totalOrders > 0
                ? `${Math.round((stats.deliveredCount / stats.totalOrders) * 100)}% delivery success rate`
                : "0% success rate"}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-2xl text-green-600">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Sales</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-2">₹{stats.totalRevenue.toLocaleString("en-IN")}</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">From completed orders</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-2xl text-blue-500">
            <IndianRupee className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Trays Shipped</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{stats.totalTrays}</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Total crates of 30 eggs</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-2xl text-purple-500">
            <ShoppingBag className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Area Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-bold text-slate-800">Financial Growth & Orders</h4>
              <p className="text-sm text-slate-500">Daily revenue and order count over the last 7 days</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-xs font-semibold">
              <Calendar className="h-3.5 w-3.5 text-slate-400" /> Last 7 Days
            </div>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F8790A" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#F8790A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#3b82f6" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#F8790A" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "0", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                  labelClassName="font-bold text-slate-700"
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area yAxisId="right" type="monotone" dataKey="count" name="Orders Count" stroke="#F8790A" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Executive Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-lg font-bold text-slate-800">Agent Performance Share</h4>
            <p className="text-sm text-slate-500 mb-4">Total completions distributed by agent</p>
          </div>
          <div className="flex flex-col items-center justify-center flex-1">
            {stats.execChartData.length === 0 ? (
              <div className="h-[200px] flex flex-col items-center justify-center text-slate-400">
                <Truck className="h-10 w-10 mb-2 opacity-50" />
                <span className="text-sm">No agent assignments logged</span>
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
                        contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "0", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                    <p className="text-2xl font-extrabold text-slate-800">{stats.deliveredCount}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivered</p>
                  </div>
                </div>
                {/* Custom Legend */}
                <div className="w-full mt-4 grid grid-cols-2 gap-2 text-xs">
                  {stats.execChartData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="truncate font-medium">{entry.name} ({entry.value})</span>
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
