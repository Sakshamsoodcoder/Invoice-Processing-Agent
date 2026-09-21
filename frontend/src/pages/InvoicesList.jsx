import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  ArrowUpDown,
  FileText,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  Download
} from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatCurrency, formatDate, formatConfidence } from '../utils/formatters';

export const InvoicesList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('All');
  const [vendorFilter, setVendorFilter] = useState('All');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [availableVendors, setAvailableVendors] = useState([]);

  useEffect(() => {
    fetchInvoices();
  }, [page, pageSize, statusFilter, vendorFilter, sortBy, sortOrder]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (statusFilter !== 'All') params.status = statusFilter;
      if (vendorFilter !== 'All') params.vendor = vendorFilter;
      if (search.trim()) params.search = search.trim();

      const data = await invoiceService.getInvoices(params);
      setInvoices(data.invoices || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);

      // Extract unique vendors for dropdown
      if (availableVendors.length === 0 && data.invoices) {
        const unique = Array.from(new Set(data.invoices.map((i) => i.vendor_name).filter(Boolean)));
        setAvailableVendors(unique);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInvoices();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await invoiceService.deleteInvoice(id);
      fetchInvoices();
    } catch (err) {
      alert('Failed to delete invoice.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Invoice History</h1>
          <p className="text-xs text-[#7e8695] mt-1">
            Search, filter, and audit all processed vendor documents ({total} total).
          </p>
        </div>

        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#8ff59c] hover:bg-[#7de48b] text-[#0d1710] text-xs font-bold rounded-full shadow-lg shadow-[#8ff59c]/10 transition-all hover:scale-[1.02]"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Invoice</span>
        </Link>
      </div>

      {/* Search & Filter Bar Card */}
      <div className="bg-[#181b21] p-4 rounded-3xl border border-[#252932] shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-[#7e8695] absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice #, vendor, keywords..."
              className="w-full pl-10 pr-4 py-2 bg-[#12151b] border border-[#252932] rounded-full text-xs text-white placeholder-[#7e8695] focus:outline-none focus:border-[#8ff59c] transition-colors"
            />
          </form>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 bg-[#12151b] border border-[#252932] rounded-full text-xs text-slate-300 focus:outline-none focus:border-[#8ff59c] transition-colors"
            >
              <option value="All">All Statuses</option>
              <option value="Valid">Valid</option>
              <option value="Needs Review">Needs Review</option>
              <option value="Processing">Processing</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          {/* Vendor Filter */}
          <div>
            <select
              value={vendorFilter}
              onChange={(e) => {
                setVendorFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 bg-[#12151b] border border-[#252932] rounded-full text-xs text-slate-300 focus:outline-none focus:border-[#8ff59c] transition-colors"
            >
              <option value="All">All Vendors</option>
              {availableVendors.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb);
                setSortOrder(so);
                setPage(1);
              }}
              className="w-full py-2 px-3 bg-[#12151b] border border-[#252932] rounded-full text-xs text-slate-300 focus:outline-none focus:border-[#8ff59c] transition-colors"
            >
              <option value="created_at-desc">Date (Newest first)</option>
              <option value="created_at-asc">Date (Oldest first)</option>
              <option value="total-desc">Amount (Highest first)</option>
              <option value="total-asc">Amount (Lowest first)</option>
              <option value="confidence-desc">Confidence (Highest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table Card */}
      <div className="bg-[#181b21] rounded-3xl border border-[#252932] shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Querying database ledger..." size="md" className="py-20" />
        ) : invoices.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="w-12 h-12 text-[#2a303c] mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white">No invoices found</h3>
            <p className="text-xs text-[#7e8695] mt-1">
              Try adjusting your search criteria or clearing active filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#12151b] text-[#7e8695] font-semibold uppercase tracking-wider border-b border-[#252932]">
                <tr>
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Vendor</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Total Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Confidence</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252932]">
                {invoices.map((inv) => (
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
                      {formatDate(inv.invoice_date || inv.created_at)}
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

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#252932] flex items-center justify-between text-xs text-[#7e8695] bg-[#14171d]">
            <div>
              Showing page <span className="font-bold text-white">{page}</span> of{' '}
              <span className="font-bold text-white">{totalPages}</span> ({total} invoices)
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="p-2 rounded-full border border-[#252932] hover:bg-[#1f242d] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="p-2 rounded-full border border-[#252932] hover:bg-[#1f242d] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

