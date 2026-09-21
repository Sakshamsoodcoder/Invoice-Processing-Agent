import React, { useState, useEffect } from 'react';
import { Cloud, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import { invoiceService } from '../../services/invoiceService';
import { Link } from 'react-router-dom';

export const AzureStatusBanner = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      const data = await invoiceService.getSystemHealth();
      setHealth(data);
    } catch (e) {
      console.warn('Could not fetch health status:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!health) return null;

  const isLive = health.services?.azure_document_intelligence?.configured &&
                 health.services?.azure_openai?.configured;

  return (
    <div className="bg-[#12151b] border-b border-[#252932] px-6 py-2 text-xs flex items-center justify-between text-slate-300">
      <div className="flex items-center gap-2.5">
        <span className="flex h-2 w-2 relative">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isLive ? 'bg-[#8ff59c]' : 'bg-[#8b8cf8]'
          }`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            isLive ? 'bg-[#8ff59c]' : 'bg-[#8b8cf8]'
          }`} />
        </span>
        <span className="text-[#7e8695]">
          <strong className="text-white font-medium">
            {isLive ? 'Azure AI Active' : 'Sandbox Intelligence Mode'}
          </strong>{' '}
          — {isLive ? (
            'Document Intelligence & Azure OpenAI GPT-4.1-mini online'
          ) : (
            'Running local deterministic verification & fallback heuristics'
          )}
        </span>
      </div>
      <Link
        to="/settings"
        className="flex items-center gap-1 text-xs text-[#8ff59c] hover:text-[#7de48b] font-medium transition-colors"
      >
        <span>Cloud Diagnostics</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
};

