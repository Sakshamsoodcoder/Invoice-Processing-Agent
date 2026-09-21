import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'mint', trend }) => {
  const colorMap = {
    mint: 'bg-[#8ff59c]/10 text-[#8ff59c] border-[#8ff59c]/20',
    lavender: 'bg-[#8b8cf8]/10 text-[#8b8cf8] border-[#8b8cf8]/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    blue: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  };

  return (
    <div className="bg-[#181b21] rounded-3xl p-6 border border-[#252932] hover:border-[#303642] transition-all group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#7e8695] uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-2 tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-[#7e8695] mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-[#8ff59c]">
              <span>{trend}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-2xl border ${colorMap[color] || colorMap.mint} transition-transform group-hover:scale-105`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
};

