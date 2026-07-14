import { type ReactNode } from 'react';

type BadgeProps = {
  variant?: 'default' | 'severity' | 'status' | 'justification' | 'log';
  value: string;
  colorMap?: Record<string, { bg: string; text: string; border: string }>;
  dot?: boolean;
  dotColor?: string;
};

export function Badge({ value, colorMap, dot, dotColor }: BadgeProps) {
  const colors = colorMap?.[value] ?? { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor ?? colors.text.replace('text-', 'bg-')}`} />}
      {value.replace(/_/g, ' ')}
    </span>
  );
}

export function Card({ children, className = '', hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return (
    <div className={`glass-card ${hover ? 'glass-card-hover' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  trendValue,
  accent = 'brand',
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accent?: 'brand' | 'red' | 'amber' | 'emerald' | 'slate';
}) {
  const accentMap: Record<string, string> = {
    brand: 'from-brand-500/20 to-brand-600/5 text-brand-400',
    red: 'from-red-500/20 to-red-600/5 text-red-400',
    amber: 'from-amber-500/20 to-amber-600/5 text-amber-400',
    emerald: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400',
    slate: 'from-slate-500/20 to-slate-600/5 text-slate-400',
  };

  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400';

  return (
    <Card hover className="p-5 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 font-medium">{label}</p>
          <p className="text-3xl font-bold mt-2 text-white">{value}</p>
          {trendValue && (
            <p className={`text-xs mt-2 ${trendColor} font-medium flex items-center gap-1`}>
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
              {trendValue}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accentMap[accent]} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export function ProgressBar({ value, max, colorClass = 'bg-brand-500' }: { value: number; max: number; colorClass?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full ${colorClass} rounded-full transition-all duration-500 ease-out`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-slate-700 border-t-brand-400"
      style={{ width: size, height: size }}
    />
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4 text-slate-500">
        {icon}
      </div>
      <p className="text-slate-300 font-medium">{title}</p>
      {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}
