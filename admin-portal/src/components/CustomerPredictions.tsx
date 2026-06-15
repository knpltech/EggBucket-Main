import { useState, useMemo } from "react";
import type { OrderData } from "../lib/firebase";
import { Search, Calendar, Sparkles, TrendingUp, ShoppingBag, AlertCircle, CheckCircle } from "lucide-react";

interface CustomerPredictionsProps {
  orders: OrderData[];
}

interface CustomerProfile {
  phone: string;
  name: string;
  totalOrders: number;
  totalRevenue: number;
  totalTrays: number;
  lastOrderDate: Date;
  avgIntervalDays: number;
  predictedNextOrderDate: Date;
  status: "Stock OK" | "Due Soon" | "Overdue";
  daysRemaining: number;
}

export default function CustomerPredictions({ orders }: CustomerPredictionsProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const customerProfiles = useMemo(() => {
    // 1. Group orders by phone number
    const customerOrdersMap: Record<string, OrderData[]> = {};
    orders.forEach(o => {
      if (!o.phone) return;
      if (!customerOrdersMap[o.phone]) {
        customerOrdersMap[o.phone] = [];
      }
      customerOrdersMap[o.phone].push(o);
    });

    const profiles: CustomerProfile[] = [];
    const today = new Date();

    Object.entries(customerOrdersMap).forEach(([phone, userOrders]) => {
      // Sort orders by date (oldest to newest)
      const sortedOrders = [...userOrders].sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateA.getTime() - dateB.getTime();
      });

      const totalOrders = sortedOrders.length;
      const totalRevenue = sortedOrders.filter(o => o.status === "delivered").reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      const totalTrays = sortedOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
      
      const lastOrder = sortedOrders[sortedOrders.length - 1];
      const lastOrderDate = lastOrder.createdAt?.toDate ? lastOrder.createdAt.toDate() : new Date(lastOrder.createdAt);

      // Determine average consumption interval
      let avgIntervalDays = 10; // Default estimate: 1 crate of eggs lasts 10 days for a normal user
      
      if (totalOrders > 1) {
        let totalDiffMs = 0;
        for (let i = 1; i < sortedOrders.length; i++) {
          const prevDate = sortedOrders[i - 1].createdAt?.toDate ? sortedOrders[i - 1].createdAt.toDate() : new Date(sortedOrders[i - 1].createdAt);
          const currDate = sortedOrders[i].createdAt?.toDate ? sortedOrders[i].createdAt.toDate() : new Date(sortedOrders[i].createdAt);
          totalDiffMs += (currDate.getTime() - prevDate.getTime());
        }
        const avgMs = totalDiffMs / (totalOrders - 1);
        avgIntervalDays = Math.max(1, Math.round(avgMs / (1000 * 60 * 60 * 24)));
      } else {
        // Simple prediction based on tray count (e.g. 1 tray = 10 days, 2 trays = 18 days)
        const qty = lastOrder.quantity || 1;
        avgIntervalDays = Math.round(qty * 10);
      }

      // Predicted next order date
      const predictedNextOrderDate = new Date(lastOrderDate);
      predictedNextOrderDate.setDate(lastOrderDate.getDate() + avgIntervalDays);

      // Calculate days remaining or overdue
      const msDiff = predictedNextOrderDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

      let status: "Stock OK" | "Due Soon" | "Overdue" = "Stock OK";
      if (daysRemaining < 0) {
        status = "Overdue";
      } else if (daysRemaining <= 2) {
        status = "Due Soon";
      }

      profiles.push({
        phone,
        name: lastOrder.name || "Customer",
        totalOrders,
        totalRevenue,
        totalTrays,
        lastOrderDate,
        avgIntervalDays,
        predictedNextOrderDate,
        status,
        daysRemaining
      });
    });

    return profiles;
  }, [orders]);

  // Filter profiles based on search
  const filteredProfiles = useMemo(() => {
    return customerProfiles.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone.includes(searchTerm)
    );
  }, [customerProfiles, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Description & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" /> Customer Demand Predictor
          </h4>
          <p className="text-sm text-slate-500">
            Smart algorithm predicting egg consumption cycles and warning when customers are running low.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/25 transition-all text-sm"
          />
        </div>
      </div>

      {/* Customer Prediction List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold text-xs border-b border-slate-100 uppercase tracking-wider">
                <th className="py-4 px-6">Customer</th>
                <th className="py-4 px-6">Order History</th>
                <th className="py-4 px-6">Avg Cycle</th>
                <th className="py-4 px-6">Last Order Date</th>
                <th className="py-4 px-6">Restocking Status</th>
                <th className="py-4 px-6">Predicted Refill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No customers found matching your search.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((p) => (
                  <tr key={p.phone} className="hover:bg-slate-50/50 transition-colors">
                    {/* Customer Identity */}
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-bold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">+91 {p.phone}</p>
                      </div>
                    </td>

                    {/* Order Volume Stats */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-0.5 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <ShoppingBag className="h-3 w-3 text-slate-400" /> {p.totalOrders} orders ({p.totalTrays} trays)
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <TrendingUp className="h-3 w-3 text-slate-400" /> LTV: ₹{p.totalRevenue}
                        </span>
                      </div>
                    </td>

                    {/* Avg Consumption Cycle */}
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2 py-1 bg-orange-50 text-orange-700 text-xs font-semibold rounded-md">
                        Every {p.avgIntervalDays} days
                      </span>
                    </td>

                    {/* Last Order Date */}
                    <td className="py-4 px-6 text-slate-500">
                      {p.lastOrderDate.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>

                    {/* Stock Status Badge */}
                    <td className="py-4 px-6">
                      {p.status === "Overdue" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-100">
                          <AlertCircle className="h-3 w-3" /> Overdue ({Math.abs(p.daysRemaining)} days ago)
                        </span>
                      ) : p.status === "Due Soon" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-100">
                          <Calendar className="h-3 w-3" /> Due Soon ({p.daysRemaining} days left)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-100">
                          <CheckCircle className="h-3 w-3" /> Stock OK ({p.daysRemaining} days left)
                        </span>
                      )}
                    </td>

                    {/* Predicted Next Order Date */}
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      {p.predictedNextOrderDate.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
