import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ text = 'Loading...', size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-slate-400 ${className}`}>
      <Loader2 className={`${sizeMap[size] || sizeMap.md} animate-spin text-[#8ff59c]`} />
      {text && <p className="text-xs font-medium mt-3 text-slate-400 tracking-wide">{text}</p>}
    </div>
  );
};

