import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Cpu,
  Sparkles,
  Database,
  Key,
  Shield,
  ExternalLink,
  Server
} from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const Settings = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      setRefreshing(true);
      const data = await invoiceService.getSystemHealth();
      setHealth(data);
    } catch (err) {
      console.error('Error fetching health:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Checking cloud integrations..." size="lg" className="py-24" />;
  }

  const docIntel = health?.services?.azure_document_intelligence;
  const openai = health?.services?.azure_openai;
  const storage = health?.services?.azure_blob_storage;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System & Azure Diagnostics</h1>
          <p className="text-xs text-[#7e8695] mt-1">
            Service abstractions, cloud credentials status, and operational diagnostics.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#181b21] border border-[#252932] text-slate-200 hover:border-[#8ff59c] text-xs font-semibold shadow-sm transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#8ff59c]' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Cloud Integration Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Azure Document Intelligence */}
        <div className="bg-[#181b21] p-6 rounded-3xl border border-[#252932] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-2xl bg-[#8b8cf8]/10 text-[#8b8cf8] border border-[#8b8cf8]/20">
                <Cpu className="w-5 h-5" />
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  docIntel?.configured
                    ? 'bg-[#8ff59c]/10 text-[#8ff59c] border border-[#8ff59c]/20'
                    : 'bg-[#8b8cf8]/10 text-[#8b8cf8] border border-[#8b8cf8]/20'
                }`}
              >
                {docIntel?.mode || 'Mock Mode'}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white">Document Intelligence</h3>
            <p className="text-xs text-[#7e8695] mt-1 leading-relaxed">
              Extracts invoice numbers, vendors, totals, dates, and itemized line structures.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#252932] text-[11px] font-mono text-[#7e8695] truncate">
            {docIntel?.configured ? docIntel.endpoint : 'Fallback: Intelligent Regex / Parser'}
          </div>
        </div>

        {/* Microsoft Foundry / Azure OpenAI */}
        <div className="bg-[#181b21] p-6 rounded-3xl border border-[#252932] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-2xl bg-[#8ff59c]/10 text-[#8ff59c] border border-[#8ff59c]/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  openai?.configured
                    ? 'bg-[#8ff59c]/10 text-[#8ff59c] border border-[#8ff59c]/20'
                    : 'bg-[#8b8cf8]/10 text-[#8b8cf8] border border-[#8b8cf8]/20'
                }`}
              >
                {openai?.mode || 'Mock Mode'}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white">Azure OpenAI / Foundry</h3>
            <p className="text-xs text-[#7e8695] mt-1 leading-relaxed">
              Provides executive summaries, checks semantic consistency, and flags anomalies.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#252932] text-[11px] font-mono text-[#7e8695] truncate">
            Model: {openai?.deployment || 'gpt-4.1-mini'}
          </div>
        </div>

        {/* Azure Blob Storage */}
        <div className="bg-[#181b21] p-6 rounded-3xl border border-[#252932] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-2xl bg-[#8ff59c]/10 text-[#8ff59c] border border-[#8ff59c]/20">
                <Database className="w-5 h-5" />
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  storage?.configured
                    ? 'bg-[#8ff59c]/10 text-[#8ff59c] border border-[#8ff59c]/20'
                    : 'bg-[#8b8cf8]/10 text-[#8b8cf8] border border-[#8b8cf8]/20'
                }`}
              >
                {storage?.configured ? 'Blob Storage' : 'Local Storage'}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white">Blob Storage</h3>
            <p className="text-xs text-[#7e8695] mt-1 leading-relaxed">
              Secure container persistence for original invoice PDF and scan attachments.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#252932] text-[11px] font-mono text-[#7e8695] truncate">
            {storage?.configured ? `Container: ${storage.container}` : 'Local: ./uploads'}
          </div>
        </div>
      </div>

      {/* Production Configuration Guide Card */}
      <div className="bg-[#181b21] p-6 rounded-3xl border border-[#252932] shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-[#8ff59c]" />
          <h2 className="text-base font-bold text-white">Cloud Configuration Architecture</h2>
        </div>
        <p className="text-xs text-[#7e8695] leading-relaxed">
          InvoiceAI features clean service abstraction layers. Active Azure resources are securely loaded by the FastAPI backend runtime:
        </p>

        <div className="bg-[#12151b] text-slate-300 p-5 rounded-2xl border border-[#252932] text-xs font-mono space-y-1 overflow-x-auto">
          <p className="text-[#7e8695]"># Azure Document Intelligence</p>
          <p className="text-slate-300">AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/</p>
          <p className="text-slate-500">AZURE_DOCUMENT_INTELLIGENCE_KEY=••••••••••••••••</p>
          <br />
          <p className="text-[#7e8695]"># Microsoft Foundry / Azure OpenAI</p>
          <p className="text-slate-300">AZURE_OPENAI_ENDPOINT=https://your-resource.services.ai.azure.com/openai/v1</p>
          <p className="text-slate-300">AZURE_OPENAI_DEPLOYMENT=gpt-4.1-mini</p>
          <p className="text-slate-500">AZURE_OPENAI_API_KEY=••••••••••••••••</p>
          <br />
          <p className="text-[#7e8695]"># Azure Blob Storage</p>
          <p className="text-slate-300">AZURE_STORAGE_CONTAINER=invoices</p>
          <p className="text-slate-500">AZURE_STORAGE_CONNECTION_STRING=••••••••••••••••</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#12151b] border border-[#252932] flex items-start gap-3 text-xs text-[#7e8695]">
          <Shield className="w-4 h-4 text-[#8ff59c] shrink-0 mt-0.5" />
          <span>
            <strong className="text-white">Zero Hardcoded Credentials:</strong> All credentials remain securely stored in the backend environment and are never transmitted to or executed in client browser runtimes.
          </span>
        </div>
      </div>
    </div>
  );
};

