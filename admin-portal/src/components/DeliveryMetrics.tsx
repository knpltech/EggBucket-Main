import { useState, useMemo } from "react";
import type { OrderData, DeliveryExecutive } from "../lib/firebase";
import { settleAgentCash } from "../lib/firebase";
import { 
  IndianRupee, 
  Settings, 
  CheckCircle2, 
  RefreshCw, 
  Users, 
  Coins, 
  Trophy, 
  Award, 
  TrendingUp 
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell 
} from "recharts";

interface DeliveryMetricsProps {
  orders: OrderData[];
  executives: DeliveryExecutive[];
}

export default function DeliveryMetrics({ orders, executives }: DeliveryMetricsProps) {
  // Salary Config states
  const [baseSalary, setBaseSalary] = useState(500); // Daily base
  const [incentivePerOrder, setIncentivePerOrder] = useState(25); // Per order delivered
  const [travelAllowance, setTravelAllowance] = useState(100); // Daily travel allowance

  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [settleMessage, setSettleMessage] = useState<string | null>(null);

  // Re-calculate statistics for each executive based on passed orders
  const execStats = useMemo(() => {
    const stats: Record<string, {
      assignedCount: number;
      completedCount: number;
      completionRate: number;
      cashCollectedToday: number;
      settledCashTotal: number;
      unsettledOrdersCount: number;
      baseSalaryVal: number;
      incentivesVal: number;
      totalPayoutVal: number;
    }> = {};

    // Initialize all executives
    executives.forEach(ex => {
      if (ex.id) {
        stats[ex.id] = {
          assignedCount: 0,
          completedCount: 0,
          completionRate: 0,
          cashCollectedToday: 0,
          settledCashTotal: 0,
          unsettledOrdersCount: 0,
          baseSalaryVal: 0,
          incentivesVal: 0,
          totalPayoutVal: 0,
        };
      }
    });

    // Loop through orders to aggregate stats
    orders.forEach(o => {
      if (!o.assignedTo || !stats[o.assignedTo]) return;
      
      stats[o.assignedTo].assignedCount += 1;
      
      if (o.status === "delivered") {
        stats[o.assignedTo].completedCount += 1;
        
        if (o.settled) {
          stats[o.assignedTo].settledCashTotal += o.totalPrice || 0;
        } else {
          stats[o.assignedTo].cashCollectedToday += o.totalPrice || 0;
          stats[o.assignedTo].unsettledOrdersCount += 1;
        }
      }
    });

    // Compute payout and completion rates
    executives.forEach(ex => {
      if (ex.id && stats[ex.id]) {
        const item = stats[ex.id];
        item.completionRate = item.assignedCount > 0 
          ? Math.round((item.completedCount / item.assignedCount) * 100)
          : 0;

        // Base salary is daily base + travel allowance if they completed at least 1 order
        item.baseSalaryVal = item.completedCount > 0 ? (baseSalary + travelAllowance) : 0;
        item.incentivesVal = item.completedCount * incentivePerOrder;
        item.totalPayoutVal = item.baseSalaryVal + item.incentivesVal;
      }
    });

    return stats;
  }, [orders, executives, baseSalary, incentivePerOrder, travelAllowance]);

  // Summary Cards calculations
  const summary = useMemo(() => {
    const totalEmployees = executives.length;
    let totalMonthlySalary = 0;
    let totalIncentives = 0;
    let topPerformerName = "N/A";
    let topCount = 0;

    executives.forEach(ex => {
      if (ex.id && execStats[ex.id]) {
        const stats = execStats[ex.id];
        totalMonthlySalary += stats.baseSalaryVal;
        totalIncentives += stats.incentivesVal;

        if (stats.completedCount > topCount) {
          topCount = stats.completedCount;
          topPerformerName = ex.name;
        }
      }
    });

    return {
      totalEmployees,
      totalMonthlySalary,
      totalIncentives,
      totalPayout: totalMonthlySalary + totalIncentives,
      topPerformer: topPerformerName
    };
  }, [executives, execStats]);

  // Ranking data for leaderboard
  const leaderboard = useMemo(() => {
    return executives
      .map(ex => {
        const stats = execStats[ex.id || ""] || { completedCount: 0 };
        return {
          id: ex.id || "",
          name: ex.name,
          completedCount: stats.completedCount
        };
      })
      .sort((a, b) => b.completedCount - a.completedCount);
  }, [executives, execStats]);

  // Chart data: Orders Completed Per Employee
  const chartData = useMemo(() => {
    return executives.map(ex => {
      const stats = execStats[ex.id || ""] || { completedCount: 0 };
      return {
        name: ex.name.split(" ")[0],
        completed: stats.completedCount
      };
    });
  }, [executives, execStats]);

  const handleSettle = async (execId: string, execName: string) => {
    setSettlingId(execId);
    setSettleMessage(null);
    try {
      await settleAgentCash(execId);
      setSettleMessage(`Successfully settled cash collection for ${execName}!`);
      setTimeout(() => setSettleMessage(null), 3000);
    } catch (err: any) {
      alert("Failed to settle cash: " + (err.message || err));
    } finally {
      setSettlingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Settlement Success Notification banner */}
      {settleMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-2xl flex items-center gap-2 text-xs font-semibold shadow-sm">
          <CheckCircle2 className="h-4.5 w-4.5 text-green-600 shrink-0" />
          <span>{settleMessage}</span>
        </div>
      )}

      {/* Summary KPI Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/50 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Team size</p>
            <p className="text-2xl font-black text-slate-800 font-heading">{summary.totalEmployees} Agents</p>
          </div>
          <div className="p-3.5 bg-orange-50 text-primary rounded-2xl">
            <Users className="h-5.5 w-5.5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/50 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Salary Payouts</p>
            <p className="text-2xl font-black text-slate-800 font-heading">₹{summary.totalMonthlySalary.toLocaleString("en-IN")}</p>
          </div>
          <div className="p-3.5 bg-blue-50 text-blue-500 rounded-2xl">
            <IndianRupee className="h-5.5 w-5.5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/50 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Incentives</p>
            <p className="text-2xl font-black text-green-600 font-heading">₹{summary.totalIncentives.toLocaleString("en-IN")}</p>
          </div>
          <div className="p-3.5 bg-green-50 text-green-500 rounded-2xl">
            <Coins className="h-5.5 w-5.5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/50 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Top Performer</p>
            <p className="text-2xl font-black text-slate-800 font-heading truncate max-w-[160px]">{summary.topPerformer}</p>
          </div>
          <div className="p-3.5 bg-amber-50 text-amber-500 rounded-2xl">
            <Trophy className="h-5.5 w-5.5" />
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Table Columns (lg:col-span-8) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/50 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Agent Payroll & Performance</h4>
              <p className="text-xs text-slate-400">Reconcile cash collections and review auto-salary computations</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 font-bold text-[10px] border-b border-slate-100 uppercase tracking-wider">
                  <th className="py-4 px-6">Employee</th>
                  <th className="py-3 px-6 text-center">Assigned</th>
                  <th className="py-3 px-6 text-center">Completed</th>
                  <th className="py-3 px-6 text-center">Rate</th>
                  <th className="py-3 px-6">Salary</th>
                  <th className="py-3 px-6">Incentives</th>
                  <th className="py-3 px-6">Total Payout</th>
                  <th className="py-3 px-6">Cash to Collect</th>
                  <th className="py-3 px-6 text-right">Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {executives.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold text-sm">
                      No delivery agents registered yet.
                    </td>
                  </tr>
                ) : (
                  executives.map((ex) => {
                    const stats = execStats[ex.id || ""] || {
                      assignedCount: 0,
                      completedCount: 0,
                      completionRate: 0,
                      cashCollectedToday: 0,
                      settledCashTotal: 0,
                      unsettledOrdersCount: 0,
                      baseSalaryVal: 0,
                      incentivesVal: 0,
                      totalPayoutVal: 0,
                    };

                    return (
                      <tr key={ex.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{ex.name}</p>
                            <span className={`inline-flex items-center gap-1 text-[9px] font-black mt-1 px-2 py-0.5 rounded-full ${
                              ex.status === "available" ? "bg-green-50 text-green-700 border border-green-100" : "bg-orange-50 text-orange-700 border border-orange-100"
                            }`}>
                              ● {ex.status}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center font-bold text-slate-600">
                          {stats.assignedCount}
                        </td>
                        <td className="py-4 px-6 text-center font-black text-slate-800">
                          {stats.completedCount}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            stats.completionRate >= 85 ? "bg-green-50 text-green-600 border border-green-100" :
                            stats.completionRate >= 50 ? "bg-amber-50 text-amber-600 border border-amber-100" :
                            "bg-red-50 text-red-600 border border-red-100"
                          }`}>
                            {stats.completionRate}%
                          </span>
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-700">
                          ₹{stats.baseSalaryVal}
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-700">
                          ₹{stats.incentivesVal}
                        </td>
                        <td className="py-4 px-6 font-extrabold text-slate-900 text-sm">
                          ₹{stats.totalPayoutVal}
                        </td>
                        <td className="py-4 px-6 font-extrabold text-sm">
                          {stats.cashCollectedToday > 0 ? (
                            <span className="text-orange-600">
                              ₹{stats.cashCollectedToday.toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="text-slate-400">₹0</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {stats.cashCollectedToday > 0 ? (
                            <button
                              onClick={() => handleSettle(ex.id!, ex.name)}
                              disabled={settlingId === ex.id}
                              className="px-2.5 py-1.5 bg-primary hover:bg-orange-600 text-white rounded-lg text-[10px] font-bold shadow-sm shadow-orange-500/10 transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {settlingId === ex.id ? (
                                <>
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                  Settling...
                                </>
                              ) : (
                                "Settle Cash"
                              )}
                            </button>
                          ) : (
                            <span className="text-[10px] text-green-600 font-bold inline-flex items-center gap-1 pr-2">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Settled
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Salary Configuration & Leaderboard (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Salary Config Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-sm space-y-4">
            <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Settings className="h-4.5 w-4.5 text-primary" /> Salary Config Rules
            </h4>
            <p className="text-[11px] text-slate-400 font-medium">
              Define standard payout values to auto-compute workforce salaries.
            </p>

            <div className="space-y-4 pt-2">
              {/* Base Salary */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <label>Daily Base Salary</label>
                  <span className="text-primary font-black">₹{baseSalary}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="50"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(Number(e.target.value))}
                  className="w-full accent-primary bg-slate-100 rounded-lg appearance-none h-1.5 cursor-pointer"
                />
              </div>

              {/* Incentive */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <label>Incentive (per order)</label>
                  <span className="text-primary font-black">₹{incentivePerOrder}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={incentivePerOrder}
                  onChange={(e) => setIncentivePerOrder(Number(e.target.value))}
                  className="w-full accent-primary bg-slate-100 rounded-lg appearance-none h-1.5 cursor-pointer"
                />
              </div>

              {/* Travel Allowance */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Travel Allowance (Daily)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₹</span>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={travelAllowance}
                    onChange={(e) => setTravelAllowance(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-xl text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all text-xs font-semibold shadow-inner"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 🏆 Leaderboard: Top Performers */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-sm space-y-4">
            <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-primary" /> Top Performers
            </h4>
            <div className="divide-y divide-slate-100 pr-1 max-h-[220px] overflow-y-auto">
              {leaderboard.length === 0 ? (
                <p className="text-slate-400 text-xs py-4 text-center">No completions registered.</p>
              ) : (
                leaderboard.map((ex, index) => (
                  <div key={ex.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                        index === 0 ? "bg-amber-100 text-amber-700 shadow-sm" :
                        index === 1 ? "bg-slate-100 text-slate-700" :
                        index === 2 ? "bg-orange-50 text-orange-700" :
                        "bg-slate-50 text-slate-400"
                      }`}>
                        {index === 0 ? "👑" : index + 1}
                      </span>
                      <p className="font-bold text-slate-800 text-xs truncate">{ex.name}</p>
                    </div>
                    <span className="text-xs font-black text-slate-700 shrink-0 bg-slate-50 border px-2 py-0.5 rounded-full">
                      {ex.completedCount} Orders
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Performance Chart section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-sm">
        <h4 className="text-base font-extrabold text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
          <TrendingUp className="h-4.5 w-4.5 text-primary" /> Orders Completed Per Employee
        </h4>
        
        <div className="h-[260px] w-full">
          {chartData.filter(d => d.completed > 0).length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Users className="h-10 w-10 mb-2 opacity-50 text-slate-300" />
              <span className="text-xs font-semibold">No completion logs recorded in this period</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid rgba(226, 232, 240, 0.8)", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)" }}
                  wrapperStyle={{ outline: "none" }}
                />
                <Bar dataKey="completed" name="Orders Completed" fill="#FF7A00" radius={[4, 4, 0, 0]} barSize={25}>
                  {chartData.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === 0 ? "#FF7A00" : "#FF9F43"} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
