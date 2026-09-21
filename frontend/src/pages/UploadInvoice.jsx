import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Loader2
} from 'lucide-react';
import { invoiceService } from '../services/invoiceService';

const PIPELINE_STEPS = [
  'Uploading to Azure Blob Storage...',
  'Reading document with Document Intelligence...',
  'Extracting line items & tax fields...',
  'Running deterministic arithmetic reconciliation...',
  'Auditing with Azure OpenAI GPT-4.1-mini...',
  'Persisting invoice records to PostgreSQL...',
];

export const UploadInvoice = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [error, setError] = useState('');

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError('');
    if (!selectedFile) return;

    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    const validExts = ['pdf', 'jpg', 'jpeg', 'png'];

    if (!validExts.includes(ext) && !allowed.includes(selectedFile.type)) {
      setError(`Unsupported file format '.${ext}'. Please upload a PDF, JPG, JPEG, or PNG.`);
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File exceeds maximum size of 10MB.');
      return;
    }

    setFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setError('');
    setProcessing(true);
    setCurrentStepIndex(0);

    // Progressive step animation
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < PIPELINE_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 900);

    try {
      const response = await invoiceService.processInvoice(file);
      clearInterval(interval);
      setCurrentStepIndex(PIPELINE_STEPS.length - 1);

      // Brief delay so user sees final completion
      setTimeout(() => {
        navigate(`/invoices/${response.invoice.id}`);
      }, 600);
    } catch (err) {
      clearInterval(interval);
      setProcessing(false);
      setError(
        err.response?.data?.detail || 'Failed to process invoice. Please check the document format and try again.'
      );
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Upload & Process Invoice</h1>
        <p className="text-xs text-[#7e8695] mt-1">
          Azure Document Intelligence OCR, deterministic math checks, and Azure OpenAI GPT-4.1-mini.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Drag & Drop Card */}
      <div className="bg-[#181b21] rounded-3xl border border-[#252932] p-8">
        {!file ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-[#8ff59c] bg-[#8ff59c]/5 scale-[1.01]'
                : 'border-[#2e3542] hover:border-[#8ff59c]/50 hover:bg-[#1f242d]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="w-16 h-16 rounded-2xl bg-[#8ff59c]/10 border border-[#8ff59c]/20 flex items-center justify-center text-[#8ff59c] mx-auto mb-4">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white">
              Drag & Drop invoice here, or <span className="text-[#8ff59c] underline">Browse</span>
            </h3>
            <p className="text-xs text-[#7e8695] mt-2">
              Supported formats: PDF, JPG, JPEG, PNG (Up to 10 MB)
            </p>

            <div className="flex items-center justify-center gap-2 mt-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#222731] text-[#7e8695] text-[11px] font-semibold border border-[#2a303c]">
                <FileText className="w-3.5 h-3.5 text-[#8b8cf8]" /> PDF Documents
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#222731] text-[#7e8695] text-[11px] font-semibold border border-[#2a303c]">
                <ImageIcon className="w-3.5 h-3.5 text-[#8ff59c]" /> Scans & Photos
              </span>
            </div>
          </div>
        ) : (
          /* Selected File Preview Box */
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#12151b] border border-[#252932]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#8ff59c]/10 text-[#8ff59c] border border-[#8ff59c]/20 flex items-center justify-center shrink-0">
                  {file.name.toLowerCase().endsWith('.pdf') ? (
                    <FileText className="w-5 h-5" />
                  ) : (
                    <ImageIcon className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white truncate max-w-md">{file.name}</h4>
                  <p className="text-xs text-[#7e8695]">{formatFileSize(file.size)}</p>
                </div>
              </div>

              {!processing && (
                <button
                  onClick={() => setFile(null)}
                  className="p-2 text-[#7e8695] hover:text-rose-400 hover:bg-[#222731] rounded-xl transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Processing Steps Stepper Animation */}
            {processing && (
              <div className="p-6 rounded-2xl bg-[#12151b] border border-[#252932] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-[#8ff59c] animate-pulse" />
                    <span className="text-sm font-bold text-white">AI Processing Pipeline</span>
                  </div>
                  <span className="text-xs text-[#8ff59c] font-mono font-bold">
                    Step {currentStepIndex + 1} of {PIPELINE_STEPS.length}
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  {PIPELINE_STEPS.map((step, idx) => {
                    const isDone = idx < currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    return (
                      <div
                        key={step}
                        className={`flex items-center gap-3 text-xs transition-opacity duration-300 ${
                          isDone
                            ? 'text-[#8ff59c] font-semibold'
                            : isCurrent
                            ? 'text-white font-bold'
                            : 'text-[#7e8695] opacity-50'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-[#8ff59c] shrink-0" />
                        ) : isCurrent ? (
                          <Loader2 className="w-4 h-4 text-[#8ff59c] animate-spin shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-[#2a303c] shrink-0" />
                        )}
                        <span>{step}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!processing && (
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setFile(null)}
                  className="px-5 py-2.5 rounded-full bg-[#222731] hover:bg-[#2a303d] text-slate-200 text-xs font-semibold transition-colors"
                >
                  Choose Another
                </button>
                <button
                  onClick={handleProcess}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#8ff59c] hover:bg-[#7de48b] text-[#0d1710] text-xs font-bold rounded-full shadow-lg shadow-[#8ff59c]/10 transition-all hover:scale-[1.02]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Process Invoice with AI</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-5 bg-[#181b21] rounded-3xl border border-[#252932] flex items-start gap-3.5">
          <div className="p-2.5 rounded-2xl bg-[#8b8cf8]/10 text-[#8b8cf8] border border-[#8b8cf8]/20 shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h5 className="font-bold text-white">Prebuilt Invoice OCR</h5>
            <p className="mt-1 text-[#7e8695] leading-relaxed">Azure Document Intelligence parses nested line items, totals, and metadata.</p>
          </div>
        </div>

        <div className="p-5 bg-[#181b21] rounded-3xl border border-[#252932] flex items-start gap-3.5">
          <div className="p-2.5 rounded-2xl bg-[#8ff59c]/10 text-[#8ff59c] border border-[#8ff59c]/20 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h5 className="font-bold text-white">Deterministic Math Check</h5>
            <p className="mt-1 text-[#7e8695] leading-relaxed">Subtotal + Tax = Total arithmetic audited within a 0.05 tolerance limit.</p>
          </div>
        </div>

        <div className="p-5 bg-[#181b21] rounded-3xl border border-[#252932] flex items-start gap-3.5">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h5 className="font-bold text-white">Azure OpenAI Auditor</h5>
            <p className="mt-1 text-[#7e8695] leading-relaxed">Synthesizes executive summaries, flags potential anomalies, and provides AP recommendations.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

