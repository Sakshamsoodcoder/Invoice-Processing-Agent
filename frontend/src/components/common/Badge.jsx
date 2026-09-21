import React from 'react';
import { getStatusBadgeConfig } from '../../utils/formatters';

export const Badge = ({ status, className = '' }) => {
  const config = getStatusBadgeConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
