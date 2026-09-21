import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, Cpu, Database } from 'lucide-react';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen flex bg-[#0c0e12] text-slate-100 font-sans selection:bg-[#8ff59c] selection:text-black">
      {/* Left Feature Column */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-14 bg-[#12151b] border-r border-[#252932]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#8ff59c] text-[#0d1710] flex items-center justify-center font-bold text-base shadow-lg shadow-[#8ff59c]/20">
              R
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">InvoiceAI</h1>
              <p className="text-[10px] text-[#8ff59c] font-bold uppercase tracking-wider">
                Intelligent Processing Assistant
              </p>
            </div>
          </div>

          <div className="mt-20 max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181b21] border border-[#252932] text-xs font-semibold text-[#8ff59c] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8ff59c]" />
              <span>Enterprise Cloud AP Automation</span>
            </div>

            <h2 className="text-3xl font-black text-white tracking-tight leading-snug">
              Intelligent Invoice Processing Powered by Azure.
            </h2>
            <p className="mt-4 text-xs text-[#7e8695] leading-relaxed">
              Extract nested line items with Azure Document Intelligence, audit arithmetic deterministically, and generate executive summaries with Microsoft Foundry / Azure OpenAI (GPT-4.1-mini).
            </p>

            <div className="mt-10 space-y-4">
              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#181b21] border border-[#252932]">
                <div className="p-2 rounded-xl bg-[#8b8cf8]/10 text-[#8b8cf8] border border-[#8b8cf8]/20">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Azure Document Intelligence</h4>
                  <p className="text-[11px] text-[#7e8695] mt-0.5">Prebuilt invoice OCR model extracting headers, totals, tax, and line items.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#181b21] border border-[#252932]">
                <div className="p-2 rounded-xl bg-[#8ff59c]/10 text-[#8ff59c] border border-[#8ff59c]/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Microsoft Foundry / Azure OpenAI</h4>
                  <p className="text-[11px] text-[#7e8695] mt-0.5">Structured financial reasoning, anomaly explanation, and audit summaries.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#181b21] border border-[#252932]">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Deterministic Math Auditing</h4>
                  <p className="text-[11px] text-[#7e8695] mt-0.5">Zero-hallucination arithmetic auditing: subtotal + tax = total verification.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-[#7e8695] border-t border-[#252932] pt-6 flex items-center justify-between">
          <span>© 2026 InvoiceAI • Production Architecture</span>
          <span className="text-[#8ff59c] font-mono">v2.4-rivlo</span>
        </div>
      </div>

      {/* Right Form Column */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 bg-[#0c0e12]">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
