import { useState, useMemo } from "react";
import type { OrderData, DeliveryExecutive } from "../lib/firebase";
import { settleAgentCash } from "../lib/firebase";
import { IndianRupee, Settings, CheckCircle2, RefreshCw } from "lucide-react";

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

  // Calculate stats for each executive
  const execStats = useMemo(() => {
    const stats: Record<string, {
      completedCount: number;
      cashCollectedToday: number;
      settledCashTotal: number;
      unsettledOrdersCount: number;
    }> = {};

    // Initialize all executives
    executives.forEach(ex => {
      if (ex.id) {
        stats[ex.id] = {
          completedCount: 0,
          cashCollectedToday: 0,
          settledCashTotal: 0,
          unsettledOrdersCount: 0,
        };
      }
    });

    orders.forEach(o => {
      if (!o.assignedTo || !stats[o.assignedTo]) return;
      
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

    return stats;
  }, [orders, executives]);

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
    <div className="space-y-6">
      {/* Settlement Success Notification banner */}
      {settleMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm shadow-sm animate-fade-in">
          <CheckCircle2 className="h-4.5 w-4.5 text-green-600 shrink-0" />
          <span>{settleMessage}</span>
        </div>
      )}

      {/* Configuration & Salary Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Parameters Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Settings className="h-5 w-5 text-orange-500" /> Salary Config Rules
          </h4>
          <p className="text-xs text-slate-500">
            Define basic settings to auto-calculate the daily payout of your delivery executives.
          </p>

          <div className="space-y-3 pt-2">
            {/* Base Salary */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <label>Daily Base Salary</label>
                <span className="text-orange-600">₹{baseSalary}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1000"
                step="50"
                value={baseSalary}
                onChange={(e) => setBaseSalary(Number(e.target.value))}
                className="w-full accent-orange-500 bg-slate-100 rounded-lg appearance-none h-1.5 cursor-pointer"
              />
            </div>

            {/* Incentive */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <label>Incentive (per order)</label>
                <span className="text-orange-600">₹{incentivePerOrder}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={incentivePerOrder}
                onChange={(e) => setIncentivePerOrder(Number(e.target.value))}
                className="w-full accent-orange-500 bg-slate-100 rounded-lg appearance-none h-1.5 cursor-pointer"
              />
            </div>

            {/* Travel Allowance */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">Travel Allowance (Daily)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₹</span>
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={travelAllowance}
                  onChange={(e) => setTravelAllowance(Number(e.target.value))}
                  className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-xl text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/25 transition-all text-sm font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Financial & Salary calculation summary table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-6 border-b border-slate-100">
            <h4 className="text-lg font-bold text-slate-800">Agent Performance & Settlement</h4>
            <p className="text-sm text-slate-500">Track delivery stats, payouts, and reconcile collections.</p>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold text-xs border-b border-slate-100 uppercase tracking-wider">
                  <th className="py-4 px-6">Delivery Executive</th>
                  <th className="py-3 px-6 text-center">Deliveries</th>
                  <th className="py-3 px-6">Cash Collected</th>
                  <th className="py-3 px-6">Estimated Salary</th>
                  <th className="py-3 px-6 text-right">Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {executives.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No delivery agents registered yet.
                    </td>
                  </tr>
                ) : (
                  executives.map((ex) => {
                    const stats = execStats[ex.id || ""] || {
                      completedCount: 0,
                      cashCollectedToday: 0,
                      settledCashTotal: 0,
                      unsettledOrdersCount: 0,
                    };

                    const computedSalary = stats.completedCount > 0
                      ? baseSalary + (stats.completedCount * incentivePerOrder) + travelAllowance
                      : 0;

                    return (
                      <tr key={ex.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Identity */}
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-bold text-slate-900">{ex.name}</p>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full ${
                              ex.status === "available" ? "bg-green-50 text-green-700 border border-green-100" : "bg-orange-50 text-orange-700 border border-orange-100"
                            }`}>
                              ● {ex.status}
                            </span>
                          </div>
                        </td>

                        {/* Deliveries Count */}
                        <td className="py-4 px-6 text-center">
                          <span className="font-extrabold text-slate-800 text-base">{stats.completedCount}</span>
                        </td>

                        {/* Cash Collected */}
                        <td className="py-4 px-6">
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-800">₹{stats.cashCollectedToday}</p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                              <span>Settled: ₹{stats.settledCashTotal}</span>
                            </p>
                          </div>
                        </td>

                        {/* Salary Calculation */}
                        <td className="py-4 px-6">
                          <div className="space-y-0.5">
                            <p className="font-extrabold text-slate-900 text-base flex items-center">
                              <IndianRupee className="h-3.5 w-3.5 inline text-slate-400" /> {computedSalary}
                            </p>
                            {stats.completedCount > 0 && (
                              <p className="text-[10px] text-slate-400 font-medium">
                                ({baseSalary} + {stats.completedCount}×{incentivePerOrder} + {travelAllowance})
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Reconcile Settlement Button */}
                        <td className="py-4 px-6 text-right">
                          {stats.cashCollectedToday > 0 ? (
                            <button
                              onClick={() => handleSettle(ex.id!, ex.name)}
                              disabled={settlingId === ex.id}
                              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold shadow-sm shadow-orange-500/10 hover:shadow transition-all inline-flex items-center gap-1 disabled:opacity-50"
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
                            <span className="text-[11px] text-green-600 font-semibold inline-flex items-center gap-1 pr-2">
                              <CheckCircle2 className="h-4.5 w-4.5" /> Settled
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
      </div>
    </div>
  );
}
