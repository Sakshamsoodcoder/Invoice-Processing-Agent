export const formatCurrency = (amount, currency = 'USD') => {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatCurrencyParts = (amount, currency = 'USD') => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return { symbol: '$', integer: '0', decimal: '00', full: '$0.00' };
  }
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
  }).format(amount);

  // Match e.g. "$6,721.48"
  const match = formatted.match(/^([^0-9]*)([\d,]+)\.(\d{2})$/);
  if (match) {
    return {
      symbol: match[1],
      integer: match[2],
      decimal: match[3],
      full: formatted,
    };
  }
  return { symbol: '$', integer: String(amount), decimal: '00', full: formatted };
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    return dateString;
  }
};

export const formatConfidence = (score) => {
  if (score === undefined || score === null) return '0%';
  const pct = Math.round(score * 100);
  return `${pct}%`;
};

export const getStatusBadgeConfig = (status) => {
  switch (status?.toLowerCase()) {
    case 'valid':
      return {
        bg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
        dot: 'bg-emerald-400',
        label: 'Valid',
      };
    case 'needs review':
    case 'needs_review':
      return {
        bg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
        dot: 'bg-amber-400',
        label: 'Needs Review',
      };
    case 'processing':
      return {
        bg: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
        dot: 'bg-blue-400 animate-pulse',
        label: 'Processing',
      };
    case 'failed':
      return {
        bg: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
        dot: 'bg-rose-400',
        label: 'Failed',
      };
    default:
      return {
        bg: 'bg-white/[0.04] text-slate-400 border-white/[0.08]',
        dot: 'bg-slate-500',
        label: status || 'Unknown',
      };
  }
};

