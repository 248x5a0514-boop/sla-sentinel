export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDuration(startStr: string, endStr: string | null): string {
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const remainingMin = diffMin % 60;

  if (diffHr > 0) return `${diffHr}h ${remainingMin}m`;
  return `${diffMin}m`;
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export const severityColors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-500' },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  low: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-500' },
};

export const statusColors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
  degraded: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  maintenance: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  retired: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-500' },
  open: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500' },
  investigating: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  resolved: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
  closed: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-500' },
};

export const justificationStatusColors: Record<string, { bg: string; text: string; border: string }> = {
  draft: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
  submitted: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  under_review: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

export const logSeverityColors: Record<string, { bg: string; text: string; border: string }> = {
  info: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  warning: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  error: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

export const criticalityColors: Record<string, string> = {
  mission_critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  business_critical: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  standard: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
};

export const metricTypeLabels: Record<string, string> = {
  uptime: 'Uptime',
  response_time: 'Response Time',
  resolution_time: 'Resolution Time',
  throughput: 'Throughput',
};

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function formatMetricValue(value: number, unit: string): string {
  switch (unit) {
    case 'percent':
      return `${value}%`;
    case 'ms':
      return `${value}ms`;
    case 'minutes':
      return `${value}m`;
    case 'hours':
      return `${value}h`;
    default:
      return `${value}`;
  }
}
