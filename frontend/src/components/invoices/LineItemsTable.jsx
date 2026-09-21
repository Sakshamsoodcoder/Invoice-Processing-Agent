import React from 'react';
import { formatCurrency } from '../../utils/formatters';

export const LineItemsTable = ({ items = [], currency = 'USD' }) => {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-[#7e8695] bg-[#12151b] rounded-2xl border border-dashed border-[#252932]">
        No itemized line items extracted for this invoice.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#252932] bg-[#12151b]">
      <table className="w-full text-left text-xs">
        <thead className="bg-[#0c0e12] text-[#7e8695] uppercase font-semibold border-b border-[#252932]">
          <tr>
            <th className="px-4 py-3">Description</th>
            <th className="px-4 py-3 text-right">Quantity</th>
            <th className="px-4 py-3 text-right">Unit Price</th>
            <th className="px-4 py-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#252932] font-medium">
          {items.map((item, idx) => (
            <tr key={item.id || idx} className="hover:bg-[#181b21] transition-colors">
              <td className="px-4 py-3 text-slate-200 font-normal">{item.description}</td>
              <td className="px-4 py-3 text-right text-[#7e8695]">{item.quantity}</td>
              <td className="px-4 py-3 text-right text-[#7e8695]">
                {formatCurrency(item.unit_price, currency)}
              </td>
              <td className="px-4 py-3 text-right font-bold text-[#8ff59c]">
                {formatCurrency(item.amount, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

