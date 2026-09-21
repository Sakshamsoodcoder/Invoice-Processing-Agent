import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Receipt,
  DollarSign,
  ShieldCheck,
  Building,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatCurrency } from '../utils/formatters';

const STATUS_COLORS = {
  Valid: '#8ff59c',         // mint
  'Needs Review': '#f59e0b', // amber
  Processing: '#8b8cf8',    // lavender
  Failed: '#ef4444',        // rose
};

const VENDOR_BAR_COLORS = ['#8ff59c', '#8b8cf8', '#a5a6f6', '#38bdf8', '#34d399', '#f472b6'];

export const Analytics = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getSummary();
      setSummary(data);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Computing financial trends and aggregations..." size="lg" className="py-24" />;
  }

  const statusData = summary?.status_distribution || [];
  const monthlyTrends = summary?.monthly_trends || [];
  const topVendors = summary?.top_vendors || [];
  const taxDist = summary?.tax_distribution || { total_subtotal: 0, total_tax: 0, tax_ratio_percentage: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Financial & Invoice Analytics</h1>
        <p className="text-xs text-[#7e8695] mt-1">
          Real-time aggregates computed from your PostgreSQL database ledger.
        </p>
      </div>

      {/* Top 4 Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#181b21] p-5 rounded-3xl border border-[#252932]">
          <span className="text-xs font-medium text-[#7e8695] uppercase tracking-wider">Total Volume</span>
          <h3 className="text-2xl font-black text-white mt-1 tracking-tight">
            {formatCurrency(summary?.total_amount || 0)}
          </h3>
          <p className="text-xs text-[#7e8695] mt-1">{summary?.total_invoices || 0} processed invoices</p>
        </div>

        <div className="bg-[#181b21] p-5 rounded-3xl border border-[#252932]">
          <span className="text-xs font-medium text-[#7e8695] uppercase tracking-wider">Average Invoice</span>
          <h3 className="text-2xl font-black text-white mt-1 tracking-tight">
            {formatCurrency(summary?.average_amount || 0)}
          </h3>
          <p className="text-xs text-[#7e8695] mt-1">Across all vendor disbursements</p>
        </div>

        <div className="bg-[#181b21] p-5 rounded-3xl border border-[#252932]">
          <span className="text-xs font-medium text-[#7e8695] uppercase tracking-wider">Validation Accuracy</span>
          <h3 className="text-2xl font-black text-[#8ff59c] mt-1 tracking-tight">
            {summary?.total_invoices ? Math.round(((summary?.valid_invoices || 0) / summary.total_invoices) * 100) : 0}%
          </h3>
          <p className="text-xs text-[#7e8695] mt-1">{summary?.valid_invoices || 0} passed without discrepancies</p>
        </div>

        <div className="bg-[#181b21] p-5 rounded-3xl border border-[#252932]">
          <span className="text-xs font-medium text-[#7e8695] uppercase tracking-wider">Average OCR Confidence</span>
          <h3 className="text-2xl font-black text-[#8b8cf8] mt-1 tracking-tight">
            {Math.round((summary?.average_confidence || 0) * 100)}%
          </h3>
          <p className="text-xs text-[#7e8695] mt-1">Azure Document Intelligence score</p>
        </div>
      </div>

      {/* Row 1: Spending Over Time (Area Chart) & Status Distribution (Donut Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Spending Over Time */}
        <div className="lg:col-span-8 bg-[#181b21] p-6 rounded-3xl border border-[#252932]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-white">Total Spending & Volume Over Time</h2>
              <p className="text-xs text-[#7e8695] mt-0.5">Historical disbursement trajectories</p>
            </div>
            <div className="p-2.5 rounded-2xl bg-[#222731] text-[#8ff59c] border border-[#2a303c]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="h-72 w-full">
            {monthlyTrends.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#7e8695]">
                Upload invoices to generate spend trajectories.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrends} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8ff59c" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8ff59c" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#252932" />
                  <XAxis dataKey="label" stroke="#7e8695" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#7e8695"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value), 'Total Spending']}
                    contentStyle={{
                      backgroundColor: '#12151b',
                      borderRadius: '16px',
                      border: '1px solid #252932',
                      color: '#ffffff',
                      fontSize: '12px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total_amount"
                    stroke="#8ff59c"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#spendColor)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Valid vs Needs Review Pie Chart */}
        <div className="lg:col-span-4 bg-[#181b21] p-6 rounded-3xl border border-[#252932] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-white">Status Breakdown</h2>
                <p className="text-xs text-[#7e8695] mt-0.5">Auditing resolution distribution</p>
              </div>
              <div className="p-2.5 rounded-2xl bg-[#222731] text-[#8b8cf8] border border-[#2a303c]">
                <PieChartIcon className="w-4 h-4" />
              </div>
            </div>

            <div className="h-52 w-full">
              {statusData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[#7e8695]">
                  No invoice status records.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#7e8695'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name, item) => [`${val} (${item.payload.percentage}%)`, name]}
                      contentStyle={{
                        backgroundColor: '#12151b',
                        borderRadius: '12px',
                        border: '1px solid #252932',
                        color: '#ffffff',
                        fontSize: '11px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-[#252932]">
            {statusData.map((st) => (
              <div key={st.status} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[st.status] || '#7e8695' }}
                  />
                  <span className="text-slate-300 font-medium">{st.status}</span>
                </div>
                <div className="font-bold text-white font-mono">
                  {st.count} ({st.percentage}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Top Vendors (Bar Chart) & Tax vs Subtotal Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Vendors Bar Chart */}
        <div className="lg:col-span-7 bg-[#181b21] p-6 rounded-3xl border border-[#252932]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-white">Spending by Top Vendors</h2>
              <p className="text-xs text-[#7e8695] mt-0.5">Highest concentration of AP disbursements</p>
            </div>
            <div className="p-2.5 rounded-2xl bg-[#222731] text-[#8ff59c] border border-[#2a303c]">
              <Building className="w-4 h-4" />
            </div>
          </div>

          <div className="h-72 w-full">
            {topVendors.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#7e8695]">
                No vendor spending data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topVendors} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#252932" />
                  <XAxis
                    type="number"
                    stroke="#7e8695"
                    fontSize={11}
                    tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`}
                  />
                  <YAxis
                    dataKey="vendor_name"
                    type="category"
                    stroke="#a0a8b7"
                    fontSize={11}
                    width={110}
                    tickFormatter={(name) => (name.length > 14 ? `${name.substring(0, 14)}...` : name)}
                  />
                  <Tooltip
                    formatter={(val) => [formatCurrency(val), 'Total Spend']}
                    contentStyle={{
                      backgroundColor: '#12151b',
                      borderRadius: '12px',
                      border: '1px solid #252932',
                      color: '#ffffff',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="total_amount" radius={[0, 8, 8, 0]}>
                    {topVendors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={VENDOR_BAR_COLORS[index % VENDOR_BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tax Distribution Breakdown Card */}
        <div className="lg:col-span-5 bg-[#181b21] p-6 rounded-3xl border border-[#252932] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-white">Tax & Subtotal Distribution</h2>
                <p className="text-xs text-[#7e8695] mt-0.5">Tax assessment and exempt vs taxed ratios</p>
              </div>
              <div className="p-2.5 rounded-2xl bg-[#222731] text-[#8b8cf8] border border-[#2a303c]">
                <Receipt className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-3 my-6">
              <div className="p-4 rounded-2xl bg-[#12151b] border border-[#252932] flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase font-semibold text-[#7e8695]">Total Net Subtotal</span>
                  <p className="text-lg font-bold text-white mt-0.5">
                    {formatCurrency(taxDist.total_subtotal)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-medium text-[#7e8695]">
                    {taxDist.total_subtotal + taxDist.total_tax > 0
                      ? Math.round((taxDist.total_subtotal / (taxDist.total_subtotal + taxDist.total_tax)) * 100)
                      : 0}
                    % gross
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#12151b] border border-[#252932] flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase font-semibold text-[#7e8695]">Total Remitted Tax</span>
                  <p className="text-lg font-bold text-white mt-0.5">
                    {formatCurrency(taxDist.total_tax)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-medium text-[#8ff59c]">
                    {taxDist.tax_ratio_percentage}% effective rate
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#8ff59c]/10 rounded-2xl border border-[#8ff59c]/20 text-slate-200 text-xs leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-[#8ff59c] inline mr-1.5 -mt-0.5" />
            Deterministic validation checks verify every invoice subtotal and tax line before committing to database ledger.
          </div>
        </div>
      </div>
    </div>
  );
};

