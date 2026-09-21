import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  Building,
  DollarSign,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Clock,
  Printer,
  FileDown
} from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { DocumentViewer } from '../components/invoices/DocumentViewer';
import { LineItemsTable } from '../components/invoices/LineItemsTable';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatCurrency, formatDate, formatConfidence } from '../utils/formatters';
import { API_BASE_URL } from '../services/api';

export const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingReport, setDownloadingReport] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await invoiceService.getInvoiceById(id);
      setInvoice(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to retrieve invoice details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      setDownloadingReport(true);
      const report = await invoiceService.getInvoiceReport(id);
      
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `InvoiceAI_Audit_${invoice.invoice_number || id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download audit report.');
    } finally {
      setDownloadingReport(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <LoadingSpinner text="Retrieving invoice extraction & audit records..." size="lg" className="py-24" />;
  }

  if (error || !invoice) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-[#181b21] rounded-3xl border border-rose-500/20 text-center shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">Unable to load invoice</h3>
        <p className="text-xs text-[#7e8695] mt-1">{error || 'Invoice not found.'}</p>
        <Link
          to="/invoices"
          className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-[#8ff59c] text-[#0d1710] rounded-full text-xs font-bold hover:bg-[#7de48b] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices</span>
        </Link>
      </div>
    );
  }

  const isValid = invoice.status === 'Valid';
  const fileUrl = invoice.blob_url?.startsWith('http')
    ? invoice.blob_url
    : `${API_BASE_URL}${invoice.blob_url || ''}`;

  const validationIssues = invoice.issues?.filter((i) => i.issue_type === 'validation') || [];
  const anomalies = invoice.issues?.filter((i) => i.issue_type === 'anomaly') || [];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181b21] p-5 rounded-3xl border border-[#252932] shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/invoices"
            className="p-2 rounded-xl bg-[#12151b] border border-[#252932] text-[#7e8695] hover:text-white transition-colors"
            title="Back to Invoices"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-white font-mono">
                {invoice.invoice_number || 'Invoice Without ID'}
              </h1>
              <Badge status={invoice.status} />
              {invoice.is_mock && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#8b8cf8]/10 text-[#8b8cf8] border border-[#8b8cf8]/20">
                  Mock Extracted
                </span>
              )}
            </div>
            <p className="text-xs text-[#7e8695] mt-0.5">
              Processed on {formatDate(invoice.created_at)} • Vendor: {invoice.vendor_name || 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#12151b] hover:bg-[#222731] border border-[#252932] text-slate-300 rounded-full text-xs font-semibold transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            onClick={handleDownloadReport}
            disabled={downloadingReport}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#222731] hover:bg-[#2a303d] text-white rounded-full text-xs font-semibold transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{downloadingReport ? 'Generating...' : 'Audit Report'}</span>
          </button>

          {invoice.blob_url && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#8ff59c] hover:bg-[#7de48b] text-[#0d1710] rounded-full text-xs font-bold transition-all shadow-md shadow-[#8ff59c]/10"
            >
              <span>Original Document</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Two-Column Grid: LEFT Preview, RIGHT Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Document Viewer (5 cols) */}
        <div className="lg:col-span-5 h-[680px] sticky top-6">
          <DocumentViewer
            blobUrl={invoice.blob_url}
            fileName={invoice.file_name}
            contentType={invoice.content_type}
          />
        </div>

        {/* Right Column: Extracted Fields & Audit Details (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Status & Confidence Banner Card */}
          <div className={`p-6 rounded-3xl border ${
            isValid
              ? 'bg-[#8ff59c]/10 border-[#8ff59c]/20 text-slate-100'
              : 'bg-amber-500/10 border-amber-500/20 text-slate-100'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3.5">
                {isValid ? (
                  <div className="p-2.5 rounded-2xl bg-[#8ff59c]/20 text-[#8ff59c] shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isValid ? 'Verification Passed (Valid)' : 'Requires Human Review'}
                  </h3>
                  <p className="text-xs mt-1 leading-relaxed text-[#a0a8b7]">
                    {isValid
                      ? 'Mathematical consistency checks, tax validations, and line item sums conform accurately.'
                      : 'Mathematical discrepancies or potential anomalies detected. Review details below prior to payment approval.'}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#7e8695]">
                  Confidence
                </span>
                <p className="text-xl font-black font-mono text-[#8ff59c]">
                  {formatConfidence(invoice.confidence)}
                </p>
              </div>
            </div>
          </div>

          {/* AI Executive Summary Card */}
          {invoice.summary && (
            <div className="bg-[#181b21] p-6 rounded-3xl border border-[#252932] shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-[#8ff59c] font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Microsoft Foundry / Azure OpenAI Analysis</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed bg-[#12151b] p-4 rounded-2xl border border-[#252932]">
                {invoice.summary}
              </p>
            </div>
          )}

          {/* Potential Issues / Anomalies Box */}
          {(validationIssues.length > 0 || anomalies.length > 0) && (
            <div className="bg-[#181b21] p-6 rounded-3xl border border-[#252932] shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Flagged Discrepancies & Potential Anomalies</span>
              </div>

              <div className="space-y-2">
                {validationIssues.map((iss, idx) => (
                  <div
                    key={`val-${idx}`}
                    className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold uppercase text-[10px] text-rose-400 block">
                        Validation Alert
                      </span>
                      <span>{iss.description}</span>
                    </div>
                  </div>
                ))}

                {anomalies.map((anom, idx) => (
                  <div
                    key={`anom-${idx}`}
                    className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold uppercase text-[10px] text-amber-400 block">
                        Anomaly Alert
                      </span>
                      <span>{anom.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Metadata Grid */}
          <div className="bg-[#181b21] p-6 rounded-3xl border border-[#252932] shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-[#252932] pb-3">
              Extracted Header Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#12151b] border border-[#252932]">
                <span className="text-[#7e8695] text-[10px] uppercase font-bold">Vendor Name</span>
                <p className="font-bold text-white mt-0.5 text-sm">{invoice.vendor_name || 'N/A'}</p>
                {invoice.vendor_address && (
                  <p className="text-[#7e8695] text-[11px] mt-1">{invoice.vendor_address}</p>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-[#12151b] border border-[#252932]">
                <span className="text-[#7e8695] text-[10px] uppercase font-bold">Customer / Billed To</span>
                <p className="font-bold text-white mt-0.5 text-sm">{invoice.customer_name || 'N/A'}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#12151b] border border-[#252932]">
                <span className="text-[#7e8695] text-[10px] uppercase font-bold">Invoice Date</span>
                <p className="font-bold text-white mt-0.5">{formatDate(invoice.invoice_date)}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#12151b] border border-[#252932]">
                <span className="text-[#7e8695] text-[10px] uppercase font-bold">Payment Due Date</span>
                <p className="font-bold text-white mt-0.5">{formatDate(invoice.due_date)}</p>
                {invoice.payment_terms && (
                  <span className="inline-block mt-1 text-[10px] text-[#8ff59c] font-medium">
                    Terms: {invoice.payment_terms}
                  </span>
                )}
              </div>
            </div>

            {/* Financial Totals Breakdown */}
            <div className="mt-4 pt-4 border-t border-[#252932] grid grid-cols-3 gap-3 text-center">
              <div className="p-3.5 bg-[#12151b] border border-[#252932] rounded-2xl">
                <span className="text-[#7e8695] text-[10px] uppercase font-bold">Subtotal</span>
                <p className="text-sm font-bold text-white mt-0.5">
                  {formatCurrency(invoice.subtotal, invoice.currency)}
                </p>
              </div>

              <div className="p-3.5 bg-[#12151b] border border-[#252932] rounded-2xl">
                <span className="text-[#7e8695] text-[10px] uppercase font-bold">Tax Amount</span>
                <p className="text-sm font-bold text-white mt-0.5">
                  {formatCurrency(invoice.tax, invoice.currency)}
                </p>
              </div>

              <div className="p-3.5 bg-[#8ff59c]/10 border border-[#8ff59c]/20 rounded-2xl">
                <span className="text-[#8ff59c] text-[10px] uppercase font-bold">Total Amount</span>
                <p className="text-base font-black text-[#8ff59c] mt-0.5">
                  {formatCurrency(invoice.total, invoice.currency)}
                </p>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="bg-[#181b21] p-6 rounded-3xl border border-[#252932] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Extracted Line Items</h3>
              <span className="text-xs text-[#7e8695] font-medium">
                {invoice.items?.length || 0} item(s) itemized
              </span>
            </div>
            <LineItemsTable items={invoice.items} currency={invoice.currency} />
          </div>

          {/* Action Navigation Footer */}
          <div className="flex items-center justify-between pt-2">
            <Link
              to="/"
              className="px-5 py-2.5 text-xs font-semibold text-[#7e8695] hover:text-white transition-colors"
            >
              ← Back to Dashboard
            </Link>
            <Link
              to="/upload"
              className="px-5 py-2.5 bg-[#8ff59c] hover:bg-[#7de48b] text-[#0d1710] text-xs font-bold rounded-full shadow-lg shadow-[#8ff59c]/10 transition-all hover:scale-[1.02]"
            >
              Process Another Invoice
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

