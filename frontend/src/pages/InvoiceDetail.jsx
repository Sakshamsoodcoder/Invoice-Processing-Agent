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
    : `${API_BASE_URL}${invoice.blob_url ? (invoice.blob_url.startsWith('/') ? '' : '/') + invoice.blob_url : ''}`;

  // Structured reconciliation derived from backend or client fallback
  const recon = invoice.reconciliation || (() => {
    const items = invoice.items || [];
    const lineTotal = items.length > 0
      ? Math.round(items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) * 100) / 100
      : null;
    const sub = invoice.subtotal !== null && invoice.subtotal !== undefined ? Number(invoice.subtotal) : null;
    const taxRate = invoice.tax_rate !== null && invoice.tax_rate !== undefined ? Number(invoice.tax_rate) : null;
    let tax = invoice.tax !== null && invoice.tax !== undefined ? Number(invoice.tax) : null;
    const tot = invoice.total !== null && invoice.total !== undefined ? Number(invoice.total) : null;
    const tol = 0.01;

    let expectedTax = null;
    if (taxRate !== null && sub !== null) {
      expectedTax = Math.round((sub * (taxRate / 100)) * 100) / 100;
    }

    let taxSource = invoice.tax_amount_source || 'UNKNOWN';
    if ((tax === null || (tax === 0 && invoice.tax_amount_source !== 'EXPLICIT_ZERO')) && taxRate > 0 && expectedTax !== null) {
      tax = expectedTax;
      taxSource = 'CALCULATED_FROM_RATE';
    }

    let cTax = null;
    if (taxRate !== null && expectedTax !== null && tax !== null) {
      cTax = Math.abs(tax - expectedTax) <= tol;
    }

    const c1 = lineTotal !== null && sub !== null ? Math.abs(lineTotal - sub) <= tol : null;
    const c2 = sub !== null && tax !== null && tot !== null ? Math.abs(Math.round((sub + tax) * 100) / 100 - tot) <= tol : null;
    const c3 = lineTotal !== null && tax !== null && tot !== null ? Math.abs(Math.round((lineTotal + tax) * 100) / 100 - tot) <= tol : null;

    let exists = false;
    let diff = null;
    let type = 'NONE';
    let severity = 'INFO';
    let message = null;

    if (cTax === false) {
      exists = true;
      diff = Math.round(Math.abs(tax - expectedTax) * 100) / 100;
      type = 'TAX_CALCULATION_MISMATCH';
      severity = 'WARNING';
      message = `Tax calculation mismatch: stated tax (${tax}) does not match expected tax (${expectedTax}) calculated from ${taxRate}% rate.`;
    } else if (c1 === false && c2 === true) {
      exists = true;
      diff = Math.round(Math.abs(lineTotal - sub) * 100) / 100;
      type = 'SUBTOTAL_LINE_ITEM_MISMATCH';
      severity = 'WARNING';
      message = 'Line-item total does not match the stated invoice subtotal.';
    } else if (c1 === true && c2 === false) {
      exists = true;
      diff = Math.round(Math.abs((sub + tax) - tot) * 100) / 100;
      type = 'TOTAL_CALCULATION_MISMATCH';
      severity = 'WARNING';
      message = 'Stated subtotal plus tax does not match total amount due.';
    } else if (c1 === false && c2 === false) {
      exists = true;
      diff = Math.round(Math.abs(lineTotal - sub) * 100) / 100;
      type = 'MULTIPLE_CALCULATION_MISMATCHES';
      severity = 'WARNING';
      message = 'Multiple calculation inconsistencies detected across document.';
    }

    return {
      line_items_total: lineTotal,
      invoice_subtotal: sub,
      tax_and_other_charges: tax,
      invoice_total: tot,
      currency: invoice.currency || 'USD',
      tax_rate: taxRate,
      taxable_amount: sub,
      expected_tax: expectedTax,
      tax_amount_source: taxSource,
      checks: {
        line_items_match_subtotal: c1,
        subtotal_plus_tax_matches_total: c2,
        line_items_plus_tax_matches_total: c3,
        tax_calculation_matches: cTax,
      },
      discrepancy: {
        exists,
        amount: diff,
        type,
        severity,
        message,
      },
      explanation: invoice.summary,
    };
  })();

  // Filter out duplicate calculation & reconciliation alerts so they only appear in the dedicated section
  const isMathOrReconIssue = (desc) => {
    if (!desc) return false;
    const lower = desc.toLowerCase();
    return (
      lower.includes('reconciliation warning') ||
      lower.includes('subtotal discrepancy') ||
      lower.includes('mathematical mismatch') ||
      lower.includes('calculation anomaly') ||
      lower.includes('sum of line items') ||
      lower.includes('line-item total')
    );
  };

  const validationIssues = (invoice.issues || []).filter(
    (i) => i.issue_type === 'validation' && !isMathOrReconIssue(i.description)
  );
  const anomalies = (invoice.issues || []).filter(
    (i) => i.issue_type === 'anomaly' && !isMathOrReconIssue(i.description)
  );

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
                      : 'Mathematical discrepancies or potential anomalies detected. Review reconciliation details below.'}
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

          {/* DEDICATED INVOICE RECONCILIATION SECTION */}
          {recon && (
            <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
              recon.discrepancy?.exists
                ? 'bg-[#181b21] border-amber-500/30'
                : 'bg-[#181b21] border-[#252932]'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  {recon.discrepancy?.exists ? (
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-[#8ff59c]/10 text-[#8ff59c] border border-[#8ff59c]/20">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${
                      recon.discrepancy?.exists ? 'text-amber-400' : 'text-[#8ff59c]'
                    }`}>
                      {recon.discrepancy?.exists ? 'Invoice Reconciliation Issue' : 'Financial Reconciliation Verified'}
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5 font-medium">
                      {recon.discrepancy?.exists
                        ? (recon.discrepancy.message || 'Line-item total does not match the stated invoice subtotal.')
                        : 'All line items, subtotal, and tax amounts match the invoice total.'}
                    </p>
                  </div>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  recon.discrepancy?.exists
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-[#8ff59c]/10 text-[#8ff59c] border border-[#8ff59c]/20'
                }`}>
                  {recon.discrepancy?.exists ? (recon.discrepancy.severity || 'Warning') : 'Verified'}
                </span>
              </div>

              {/* Monetary Comparison Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-[#12151b] border border-[#252932] rounded-2xl">
                  <span className="text-[#7e8695] text-[10px] uppercase font-bold">Calculated Line-Item Subtotal</span>
                  <p className="text-sm font-mono font-bold text-white mt-1">
                    {formatCurrency(recon.line_items_total, recon.currency)}
                  </p>
                </div>

                <div className="p-3.5 bg-[#12151b] border border-[#252932] rounded-2xl">
                  <span className="text-[#7e8695] text-[10px] uppercase font-bold">Invoice Stated Subtotal</span>
                  <p className="text-sm font-mono font-bold text-white mt-1">
                    {formatCurrency(recon.invoice_subtotal, recon.currency)}
                  </p>
                </div>

                <div className={`p-3.5 rounded-2xl border ${
                  recon.discrepancy?.exists
                    ? 'bg-amber-500/10 border-amber-500/20'
                    : 'bg-[#12151b] border-[#252932]'
                }`}>
                  <span className={`text-[10px] uppercase font-bold ${
                    recon.discrepancy?.exists ? 'text-amber-400' : 'text-[#7e8695]'
                  }`}>
                    Difference
                  </span>
                  <p className={`text-sm font-mono font-bold mt-1 ${
                    recon.discrepancy?.exists ? 'text-amber-300' : 'text-[#8ff59c]'
                  }`}>
                    {formatCurrency(recon.discrepancy?.amount || 0, recon.currency)}
                  </p>
                </div>
              </div>

              {/* Calculation Checks Matrix */}
              <div className="bg-[#12151b] p-4 rounded-2xl border border-[#252932] space-y-2">
                <span className="text-[10px] font-bold text-[#7e8695] uppercase tracking-wider block">
                  Calculation Checks
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-[#252932]/50">
                    <span className="text-slate-300">Line items → Subtotal</span>
                    {recon.checks.line_items_match_subtotal === true && (
                      <span className="inline-flex items-center gap-1 text-[#8ff59c] font-medium text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Matches
                      </span>
                    )}
                    {recon.checks.line_items_match_subtotal === false && (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-medium text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" /> Mismatch
                      </span>
                    )}
                    {recon.checks.line_items_match_subtotal === null && (
                      <span className="text-[#7e8695] text-xs">N/A</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-[#252932]/50">
                    <span className="text-slate-300">Subtotal + Tax → Total</span>
                    {recon.checks.subtotal_plus_tax_matches_total === true && (
                      <span className="inline-flex items-center gap-1 text-[#8ff59c] font-medium text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Matches
                      </span>
                    )}
                    {recon.checks.subtotal_plus_tax_matches_total === false && (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-medium text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" /> Mismatch
                      </span>
                    )}
                    {recon.checks.subtotal_plus_tax_matches_total === null && (
                      <span className="text-[#7e8695] text-xs">N/A</span>
                    )}
                  </div>

                  {recon.checks.tax_calculation_matches !== undefined && recon.checks.tax_calculation_matches !== null && (
                    <div className="flex items-center justify-between py-1 border-b border-[#252932]/50">
                      <span className="text-slate-300">
                        Tax calculation {recon.tax_rate ? `(${recon.tax_rate}%)` : ''}
                      </span>
                      {recon.checks.tax_calculation_matches === true && (
                        <span className="inline-flex items-center gap-1 text-[#8ff59c] font-medium text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Matches
                        </span>
                      )}
                      {recon.checks.tax_calculation_matches === false && (
                        <span className="inline-flex items-center gap-1 text-amber-400 font-medium text-xs">
                          <AlertTriangle className="w-3.5 h-3.5" /> Mismatch
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-300">Line items + Tax → Total</span>
                    {recon.checks.line_items_plus_tax_matches_total === true && (
                      <span className="inline-flex items-center gap-1 text-[#8ff59c] font-medium text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Matches
                      </span>
                    )}
                    {recon.checks.line_items_plus_tax_matches_total === false && (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-medium text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" /> Mismatch
                      </span>
                    )}
                    {recon.checks.line_items_plus_tax_matches_total === null && (
                      <span className="text-[#7e8695] text-xs">N/A</span>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Explanation of Reconciliation */}
              {recon.explanation && (
                <div className="bg-[#14171f] p-4 rounded-2xl border border-[#252932] text-xs text-slate-300 leading-relaxed">
                  <div className="flex items-center gap-2 mb-1.5 text-[#8ff59c] font-bold text-[11px] uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Reconciliation Explanation</span>
                  </div>
                  <p>{recon.explanation}</p>
                </div>
              )}
            </div>
          )}

          {/* AI Executive Summary Card (if different from reconciliation explanation) */}
          {invoice.summary && invoice.summary !== recon?.explanation && (
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

          {/* Other Flagged Issues & Operational Anomalies (De-duplicated) */}
          {(validationIssues.length > 0 || anomalies.length > 0) && (
            <div className="bg-[#181b21] p-6 rounded-3xl border border-[#252932] shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Operational Alerts & Potential Anomalies</span>
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
                        Operational Anomaly
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
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[#7e8695] text-[10px] uppercase font-bold">Tax Amount</span>
                  {invoice.tax_rate !== null && invoice.tax_rate !== undefined && (
                    <span className="text-[10px] font-mono text-[#8b8cf8]">({invoice.tax_rate}%)</span>
                  )}
                </div>
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

            {/* Detailed Tax Breakdown & Validation Section */}
            {(invoice.tax_rate !== null && invoice.tax_rate !== undefined) && (
              <div className="p-4 rounded-2xl bg-[#12151b] border border-[#252932] space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#7e8695] uppercase tracking-wider">
                    Tax Details
                  </span>
                  {recon.checks.tax_calculation_matches === true && (
                    <span className="inline-flex items-center gap-1 text-[#8ff59c] text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Tax calculation matches
                    </span>
                  )}
                  {recon.checks.tax_calculation_matches === false && (
                    <span className="inline-flex items-center gap-1 text-amber-400 text-[10px] font-bold">
                      <AlertTriangle className="w-3 h-3" /> Tax calculation mismatch
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#181b21] border border-[#252932]">
                    <span className="text-[#7e8695] text-[10px] uppercase font-semibold">Tax Rate</span>
                    <p className="font-mono font-bold text-white mt-0.5">{invoice.tax_rate}%</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#181b21] border border-[#252932]">
                    <span className="text-[#7e8695] text-[10px] uppercase font-semibold">Taxable Amount</span>
                    <p className="font-mono font-bold text-white mt-0.5">
                      {formatCurrency(recon.taxable_amount || invoice.subtotal, invoice.currency)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#181b21] border border-[#252932]">
                    <span className="text-[#7e8695] text-[10px] uppercase font-semibold">Tax Applied</span>
                    <p className="font-mono font-bold text-white mt-0.5">
                      {formatCurrency(invoice.tax, invoice.currency)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#181b21] border border-[#252932]">
                    <span className="text-[#7e8695] text-[10px] uppercase font-semibold">Expected Tax</span>
                    <p className="font-mono font-bold text-[#8ff59c] mt-0.5">
                      {formatCurrency(recon.expected_tax !== null ? recon.expected_tax : invoice.tax, invoice.currency)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-[#7e8695] pt-0.5 gap-2">
                  <span>
                    Calculation: {formatCurrency(recon.taxable_amount || invoice.subtotal, invoice.currency)} × {invoice.tax_rate}% = {formatCurrency(recon.expected_tax !== null ? recon.expected_tax : invoice.tax, invoice.currency)}
                  </span>
                  {(invoice.tax_amount_source === 'CALCULATED_FROM_RATE' || recon.tax_amount_source === 'CALCULATED_FROM_RATE') && (
                    <span className="text-[#8b8cf8] font-medium">
                      Tax amount calculated from stated {invoice.tax_rate}% tax rate.
                    </span>
                  )}
                </div>
              </div>
            )}
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

