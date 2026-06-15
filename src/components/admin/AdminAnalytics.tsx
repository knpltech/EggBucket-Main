import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { OrderData, DeliveryExecutive } from "@/lib/firebase";
import { Package, IndianRupee, Truck, Calendar } from "lucide-react";

interface AdminAnalyticsProps {
  orders: OrderData[];
  executives: DeliveryExecutive[];
}

export default function AdminAnalytics({ orders, executives }: AdminAnalyticsProps) {
  // Process orders data for visualization
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.status === "delivered");
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const activeExecs = executives.length;

    // Group orders and revenue by date (last 7 days)
    const dailyDataMap: Record<string, { date: string; count: number; revenue: number }> = {};
    
    // Initialize last 7 days
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
      
      // If it exists in our last 7 days range, aggregate
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
      const execName = exec ? exec.name : "Unknown Agent";
      execVolumeMap[execName] = (execVolumeMap[execName] || 0) + 1;
    });

    const COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b"];
    const execChartData = Object.entries(execVolumeMap).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    }));

    return {
      totalOrders,
      totalRevenue,
      deliveredCount: deliveredOrders.length,
      activeExecs,
      dailyChartData,
      execChartData
    };
  }, [orders, executives]);

  return (
    <div className="space-y-6">
      {/* Visual KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Orders</span>
              <h3 className="text-3xl font-extrabold text-slate-900">{stats.totalOrders}</h3>
              <p className="text-xs text-orange-500 font-medium">All-time count</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-2xl">
              <Package className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Delivered</span>
              <h3 className="text-3xl font-extrabold text-green-600">{stats.deliveredCount}</h3>
              <p className="text-xs text-green-600 font-medium">
                {stats.totalOrders > 0 
                  ? `${Math.round((stats.deliveredCount / stats.totalOrders) * 100)}% completion rate`
                  : "0% completion rate"}
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-2xl">
              <Truck className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</span>
              <h3 className="text-3xl font-extrabold text-slate-900">₹{stats.totalRevenue.toLocaleString("en-IN")}</h3>
              <p className="text-xs text-slate-500 font-medium">From completed orders</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-2xl">
              <IndianRupee className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Delivery Agents</span>
              <h3 className="text-3xl font-extrabold text-slate-900">{stats.activeExecs}</h3>
              <p className="text-xs text-slate-500 font-medium">Registered executives</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-2xl">
              <Truck className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Chart */}
        <Card className="lg:col-span-2 border-0 shadow-md bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-blue-500" /> Revenue & Order Volume Trends
              </CardTitle>
              <CardDescription className="text-slate-500">Last 7 days daily order details</CardDescription>
            </div>
            <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1 border-0">
              <Calendar className="h-3.5 w-3.5" /> Weekly
            </Badge>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#3b82f6" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#f97316" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "0", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                    labelClassName="font-bold text-slate-700"
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area yAxisId="right" type="monotone" dataKey="count" name="Orders Count" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Agent Volume Distribution */}
        <Card className="border-0 shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Truck className="h-5 w-5 text-orange-500" /> Executive Contribution
            </CardTitle>
            <CardDescription className="text-slate-500">Delivered orders count by agent</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-2">
            {stats.execChartData.length === 0 ? (
              <div className="h-[250px] flex flex-col items-center justify-center text-slate-400">
                <Truck className="h-10 w-10 mb-2 opacity-50" />
                <span>No delivery agent allocations yet</span>
              </div>
            ) : (
              <>
                <div className="h-[200px] w-full relative">
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
                  {/* Center Stat */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                    <p className="text-2xl font-extrabold text-slate-800">{stats.deliveredCount}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivered</p>
                  </div>
                </div>
                {/* Custom Legend */}
                <div className="w-full mt-4 grid grid-cols-2 gap-2 text-xs">
                  {stats.execChartData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 text-slate-700">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="truncate font-medium">{entry.name} ({entry.value})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Volume Bar Chart */}
      <Card className="border-0 shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800">Order Frequency Matrix</CardTitle>
          <CardDescription className="text-slate-500">Order placements comparing the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "0", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="count" name="Orders Placed" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
