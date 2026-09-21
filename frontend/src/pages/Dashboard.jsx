import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  UploadCloud,
  ArrowUpRight,
  Sparkles,
  Eye,
  Trash2,
  Wallet,
  Activity,
  ShieldCheck,
  Zap,
  MoreVertical,
  Check,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { analyticsService } from '../services/analyticsService';
import { invoiceService } from '../services/invoiceService';
import { formatCurrency, formatCurrencyParts, formatDate, formatConfidence } from '../utils/formatters';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [summaryData, invoicesData] = await Promise.all([
        analyticsService.getSummary(),
        invoiceService.getInvoices({ page: 1, page_size: 6, sort_by: 'created_at', sort_order: 'desc' }),
      ]);
      setSummary(summaryData);
      setRecentInvoices(invoicesData.invoices || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      setDeletingId(id);
      await invoiceService.deleteInvoice(id);
      await loadDashboardData();
    } catch (err) {
      alert('Failed to delete invoice.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Synchronizing financial ledger & metrics..." size="lg" className="py-32" />;
  }

  // Calculate real values
  const totalAmount = summary?.total_amount || 0;
  const currencyParts = formatCurrencyParts(totalAmount);
  const totalInvoices = summary?.total_invoices || 0;
  const validInvoices = summary?.valid_invoices || 0;
  const needsReview = summary?.needs_review_invoices || 0;
  const validRate = totalInvoices > 0 ? Math.round((validInvoices / totalInvoices) * 100) : 100;
  const monthlyTrends = summary?.monthly_trends || [];

  return (
    <div className="space-y-6">
      
      {/* ========================================================
          TOP ROW (4 Cards matching Reference Image exactly):
          1. Total Balance / Total Spend Card
          2. Transfer / Invoice Status Radial Ring Card
          3. Financial Health / Audit Equalizer Card
          4. AI Assistant / Verification Stack Card
         ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5">
        
        {/* Card 1: Total Balance Hero Card (xl:col-span-3) */}
        <div className="xl:col-span-3 bg-[#181b21] rounded-3xl p-6 border border-[#252932] flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-[#222731] border border-[#2e3440] flex items-center justify-center text-slate-300">
              <Wallet className="w-5 h-5" />
            </div>
            <Link to="/analytics" className="text-[#7e8695] hover:text-white transition-colors">
              <ArrowUpRight className="w-5 h-5" />
            </Link>
          </div>

          <div className="my-5">
            <p className="text-xs font-medium text-[#7e8695]">Total Volume</p>
            <div className="flex items-baseline gap-0.5 mt-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {currencyParts.symbol}{currencyParts.integer}
              </span>
              <span className="text-xl font-bold text-[#7e8695]">.{currencyParts.decimal}</span>
            </div>

            {/* Sub-bar metrics matching reference */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#222731]">
              <div>
                <div className="h-1 rounded-full bg-[#2a303c] overflow-hidden mb-1.5">
                  <div className="h-full bg-[#7e8695] w-3/4 rounded-full" />
                </div>
                <p className="text-[10px] text-[#7e8695] truncate">{totalInvoices} Invoices</p>
              </div>
              <div>
                <div className="h-1 rounded-full bg-[#2a303c] overflow-hidden mb-1.5">
                  <div className="h-full bg-[#8ff59c] w-full rounded-full" />
                </div>
                <p className="text-[10px] text-[#7e8695] truncate">{validInvoices} Valid</p>
              </div>
              <div>
                <div className="h-1 rounded-full bg-[#2a303c] overflow-hidden mb-1.5">
                  <div className="h-full bg-[#8b8cf8] w-1/2 rounded-full" />
                </div>
                <p className="text-[10px] text-[#7e8695] truncate">{needsReview} Review</p>
              </div>
            </div>
          </div>

          {/* Action Buttons: Mint Pill Button + Dark Pill Button */}
          <div className="flex items-center gap-2 pt-1">
            <Link
              to="/upload"
              className="flex-1 py-2.5 px-4 rounded-full bg-[#8ff59c] hover:bg-[#7de48b] text-[#0d1710] font-bold text-xs text-center transition-all shadow-md shadow-[#8ff59c]/10"
            >
              Upload Invoice
            </Link>
            <Link
              to="/invoices"
              className="py-2.5 px-4 rounded-full bg-[#222731] hover:bg-[#2a303d] text-slate-200 font-semibold text-xs text-center transition-colors"
            >
              History
            </Link>
          </div>
        </div>

        {/* Card 2: Invoice Distribution Ring (xl:col-span-3) */}
        <div className="xl:col-span-3 bg-[#181b21] rounded-3xl p-6 border border-[#252932] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-tight">Invoice Status</h3>
            <Link to="/invoices" className="text-[#7e8695] hover:text-white">
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Concentric / Radial Rings visually matching the reference */}
          <div className="relative flex items-center justify-center py-4">
            <div className="w-36 h-36 relative flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background track */}
                <circle cx="50" cy="50" r="40" stroke="#222731" strokeWidth="8" fill="none" />
                {/* Outer Lavender Ring: Valid Pass Rate */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#8b8cf8"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${validRate * 2.51} 251`}
                  strokeLinecap="round"
                />
                {/* Inner Mint Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="30"
                  stroke="#8ff59c"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${Math.min(totalInvoices * 25, 188)} 188`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-white tracking-tight">{validRate}%</span>
                <span className="text-[10px] uppercase font-bold text-[#7e8695] tracking-wider">Valid Rate</span>
              </div>
            </div>
          </div>

          {/* Breakdown legend */}
          <div className="space-y-2 text-xs pt-1 border-t border-[#222731]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#8b8cf8]" />
                <span className="text-[#7e8695]">Valid Invoices</span>
              </div>
              <span className="font-semibold text-white">{validInvoices}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#8ff59c]" />
                <span className="text-[#7e8695]">Needs Review</span>
              </div>
              <span className="font-semibold text-white">{needsReview}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#7e8695]" />
                <span className="text-[#7e8695]">Total Invoices</span>
              </div>
              <span className="font-semibold text-white">{totalInvoices}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Financial Health / Soundwave Equalizer (xl:col-span-3) */}
        <div className="xl:col-span-3 bg-[#181b21] rounded-3xl p-6 border border-[#252932] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-tight">Audit Health</h3>
            <MoreVertical className="w-4 h-4 text-[#7e8695]" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#8ff59c]/10 text-[#8ff59c] text-[11px] font-semibold border border-[#8ff59c]/20 mb-2">
              <span>On track</span>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-white">
                {formatCurrency(summary?.average_amount || 0)}
              </span>
              <span className="text-xs text-[#7e8695]">avg / invoice</span>
            </div>
            <p className="text-[11px] text-[#8ff59c] mt-0.5 font-medium">
              +{validRate}% deterministic accuracy
            </p>
          </div>

          {/* Visual Sound-wave / Equalizer Bars matching Reference Image */}
          <div className="my-4 py-3 flex items-center justify-between gap-1 h-20 px-2 bg-[#12151b] rounded-2xl border border-[#1f242d]">
            {[
              { h: '40%', c: 'bg-[#8ff59c]' },
              { h: '65%', c: 'bg-[#8ff59c]' },
              { h: '85%', c: 'bg-[#8ff59c]' },
              { h: '50%', c: 'bg-[#8ff59c]' },
              { h: '30%', c: 'bg-[#8b8cf8]' },
              { h: '70%', c: 'bg-[#8b8cf8]' },
              { h: '100%', c: 'bg-[#8b8cf8]' },
              { h: '80%', c: 'bg-[#8b8cf8]' },
              { h: '45%', c: 'bg-[#8ff59c]' },
              { h: '90%', c: 'bg-[#8ff59c]' },
              { h: '60%', c: 'bg-[#8ff59c]' },
              { h: '35%', c: 'bg-[#8b8cf8]' },
              { h: '75%', c: 'bg-[#8b8cf8]' },
              { h: '95%', c: 'bg-[#8ff59c]' },
              { h: '55%', c: 'bg-[#8b8cf8]' },
            ].map((bar, idx) => (
              <div key={idx} className="flex-1 flex flex-col justify-end items-center h-full">
                <div
                  className={`w-1.5 rounded-full ${bar.c} transition-all duration-500`}
                  style={{ height: bar.h }}
                />
              </div>
            ))}
          </div>

          <p className="text-[11px] text-[#7e8695] leading-relaxed">
            Zero hallucinations: Arithmetic cross-checking against Azure Document Intelligence.
          </p>
        </div>

        {/* Card 4: Right Column Cards (Verification + Budget / AI Assistant) (xl:col-span-3) */}
        <div className="xl:col-span-3 flex flex-col justify-between gap-4">
          
          {/* Account / Azure Verification Card */}
          <div className="bg-[#181b21] rounded-3xl p-5 border border-[#252932]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl bg-[#8ff59c]/10 text-[#8ff59c] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">System Verification</h4>
            </div>
            <p className="text-[11px] text-[#7e8695] leading-relaxed mb-3">
              PostgreSQL & Azure services authenticated with active session.
            </p>
            <Link
              to="/settings"
              className="inline-flex items-center justify-center w-full py-2 rounded-full bg-[#8ff59c] hover:bg-[#7de48b] text-[#0d1710] font-bold text-xs transition-colors"
            >
              Verify Services
            </Link>
          </div>

          {/* Monthly Budget / AP Target */}
          <div className="bg-[#181b21] rounded-3xl p-5 border border-[#252932]">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-white">AP Processing Volume</h4>
              <MoreVertical className="w-3.5 h-3.5 text-[#7e8695]" />
            </div>
            {/* Split Progress Bar */}
            <div className="w-full h-2 rounded-full bg-[#222731] flex overflow-hidden my-2">
              <div className="h-full bg-[#8b8cf8]" style={{ width: `${Math.min(validRate, 70)}%` }} />
              <div className="h-full bg-[#8ff59c]" style={{ width: `${Math.max(100 - validRate, 15)}%` }} />
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-white">{formatCurrency(totalAmount)}</span>
              <span className="text-[#7e8695]">{totalInvoices} Invoices</span>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================
          BOTTOM ROW (Matching Reference Image):
          1. Analytics Performance / Multi-tier Area Chart
          2. Transaction / Invoice Count Bar Chart
          3. Mint Green Highlight Card: "Advanced AI Analytics"
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Chart 1: Analytics Performance Tiered Chart (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-[#181b21] rounded-3xl p-6 border border-[#252932] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Spend Performance</h3>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="flex items-center gap-1.5 text-[#7e8695]">
                  <span className="w-2 h-2 rounded bg-[#8b8cf8]" /> Valid
                </span>
                <span className="flex items-center gap-1.5 text-[#7e8695]">
                  <span className="w-2 h-2 rounded bg-[#a5a6f6]" /> Subtotal
                </span>
                <span className="flex items-center gap-1.5 text-[#7e8695]">
                  <span className="w-2 h-2 rounded bg-[#8ff59c]" /> Tax
                </span>
              </div>
            </div>
            <Link to="/analytics" className="p-2 rounded-full bg-[#222731] text-[#7e8695] hover:text-white">
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Stepped Tier Visualization matching reference style */}
          <div className="space-y-3 my-2">
            {monthlyTrends.slice(-4).map((m, idx) => {
              const pct = totalAmount > 0 ? Math.round((m.total_amount / totalAmount) * 100) : 30 + idx * 15;
              return (
                <div key={m.month || idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#7e8695] font-medium">{m.label}</span>
                    <span className="text-white font-semibold">{formatCurrency(m.total_amount)}</span>
                  </div>
                  <div className="h-4 rounded-xl bg-[#222731] flex overflow-hidden">
                    <div
                      className="h-full bg-[#8b8cf8] rounded-l-xl transition-all duration-500"
                      style={{ width: `${Math.max(pct * 0.7, 15)}%` }}
                    />
                    <div
                      className="h-full bg-[#a5a6f6] opacity-80"
                      style={{ width: `${Math.max(pct * 0.2, 8)}%` }}
                    />
                    <div
                      className="h-full bg-[#8ff59c] rounded-r-xl"
                      style={{ width: `${Math.max(pct * 0.1, 5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {monthlyTrends.length === 0 && (
              <div className="py-8 text-center text-xs text-[#7e8695]">
                Upload invoices to generate monthly performance timelines.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#222731] flex items-center justify-between text-xs text-[#7e8695]">
            <span>Computed from PostgreSQL database ledger</span>
            <span className="text-white font-semibold">{totalInvoices} Records</span>
          </div>
        </div>

        {/* Chart 2: Invoice / Transaction Count Bar Chart (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-[#181b21] rounded-3xl p-6 border border-[#252932] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#7e8695]">Invoice Activity</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">
                {totalInvoices} <span className="text-xs text-[#7e8695] font-normal">processed</span>
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#222731] text-[11px] font-semibold text-slate-300 border border-[#2e3542]">
              Monthly
            </span>
          </div>

          {/* Grouped Vertical Bar Charts matching Reference Image */}
          <div className="flex items-end justify-between gap-3 h-40 my-4 px-2">
            {[
              { label: 'Jan', h1: '80%', h2: '60%' },
              { label: 'Feb', h1: '50%', h2: '35%' },
              { label: 'Mar', h1: '95%', h2: '75%' },
              { label: 'Apr', h1: '40%', h2: '20%' },
              { label: 'May', h1: '70%', h2: '45%' },
            ].map((col, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full flex items-end justify-center gap-1 h-full">
                  <div
                    className="w-2.5 rounded-t-full bg-[#8ff59c]"
                    style={{ height: col.h1 }}
                  />
                  <div
                    className="w-2.5 rounded-t-full bg-[#8b8cf8]"
                    style={{ height: col.h2 }}
                  />
                </div>
                <span className="text-[10px] text-[#7e8695] font-medium">{col.label}</span>
              </div>
            ))}
          </div>

          {/* Avatar stack at bottom matching reference */}
          <div className="flex items-center justify-between pt-3 border-t border-[#222731]">
            <div className="flex -space-x-2 overflow-hidden">
              {['bg-amber-500', 'bg-blue-500', 'bg-purple-500', 'bg-emerald-500'].map((color, idx) => (
                <div
                  key={idx}
                  className={`inline-block h-6 w-6 rounded-full ring-2 ring-[#181b21] ${color} text-[10px] font-bold text-slate-900 flex items-center justify-center`}
                >
                  {String.fromCharCode(65 + idx)}
                </div>
              ))}
            </div>
            <span className="text-[11px] text-[#7e8695]">Audited by Azure AI</span>
          </div>
        </div>

        {/* Highlight Card 3: Mint Green "Advanced AI Analytics" Card (lg:col-span-3) */}
        <div className="lg:col-span-3 bg-[#9bf4ab] text-[#0d1710] rounded-3xl p-6 flex flex-col justify-between shadow-xl shadow-[#9bf4ab]/10 relative overflow-hidden">
          {/* Header pill & icon */}
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-2xl bg-black/10 flex items-center justify-center text-[#0d1710]">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/80 text-[10px] font-bold tracking-wide uppercase shadow-sm">
              <Zap className="w-3 h-3 text-black" />
              <span>AI Assistant</span>
            </span>
          </div>

          {/* Title & Description */}
          <div className="my-4">
            <h3 className="text-xl font-black tracking-tight text-[#0d1710]">
              Advanced AI Analytics
            </h3>
            <p className="text-xs text-[#1e3423] mt-2 font-medium leading-relaxed">
              Use Microsoft Foundry & Azure OpenAI (GPT-4.1-mini) to extract anomalies, verify AP math, and receive automated audit summaries.
            </p>
          </div>

          {/* Avatar + Count Pill */}
          <div className="flex items-center gap-2 my-2">
            <div className="flex -space-x-1.5 overflow-hidden">
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-[9px] font-bold flex items-center justify-center">
                AZ
              </div>
              <div className="w-6 h-6 rounded-full bg-slate-800 text-white text-[9px] font-bold flex items-center justify-center">
                AI
              </div>
            </div>
            <span className="text-xs font-bold text-[#0d1710]">GPT-4.1-mini</span>
          </div>

          {/* Black CTA Pill Button matching reference: "Unlock AI Power" */}
          <Link
            to="/upload"
            className="w-full py-3 px-4 rounded-full bg-black hover:bg-slate-900 text-white font-bold text-xs text-center transition-transform hover:scale-[1.02] shadow-lg shadow-black/20 mt-2"
          >
            Process New Invoice
          </Link>
        </div>

      </div>

      {/* ========================================================
          RECENT INVOICES SECTION (Rivlo Dark Table)
         ======================================================== */}
      <div className="bg-[#181b21] rounded-3xl border border-[#252932] overflow-hidden">
        <div className="p-6 flex items-center justify-between border-b border-[#252932]">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Recent Invoices</h3>
            <p className="text-xs text-[#7e8695] mt-0.5">
              Live records from Azure Document Intelligence OCR extraction
            </p>
          </div>
          <Link
            to="/invoices"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#8ff59c] hover:text-[#7de48b] transition-colors"
          >
            <span>View All</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-[#2a313d] mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-white">No invoices yet</h4>
            <p className="text-xs text-[#7e8695] mt-1 max-w-sm mx-auto">
              Upload a vendor invoice PDF or image to see real-time OCR extraction and GPT-4.1-mini reasoning.
            </p>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-[#8ff59c] hover:bg-[#7de48b] text-[#0d1710] text-xs font-bold rounded-full shadow-lg transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload First Invoice</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#12151b] text-[#7e8695] font-semibold uppercase tracking-wider border-b border-[#252932]">
                <tr>
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Vendor</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Confidence</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252932]">
                {recentInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="hover:bg-[#1e222b] cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-white">
                      {inv.invoice_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-300">
                      {inv.vendor_name || 'Unspecified'}
                    </td>
                    <td className="px-6 py-4 text-[#7e8695]">
                      {formatDate(inv.invoice_date)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-white">
                      {formatCurrency(inv.total, inv.currency)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={inv.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-[#252932] rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              inv.confidence > 0.9 ? 'bg-[#8ff59c]' : inv.confidence > 0.8 ? 'bg-amber-400' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.round((inv.confidence || 0) * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[#7e8695]">
                          {formatConfidence(inv.confidence)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/invoices/${inv.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 hover:bg-[#252932] text-[#7e8695] hover:text-[#8ff59c] rounded-xl transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={(e) => handleDelete(inv.id, e)}
                          disabled={deletingId === inv.id}
                          className="p-2 hover:bg-rose-500/10 text-[#7e8695] hover:text-rose-400 rounded-xl transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

