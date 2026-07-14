import { type ReactNode } from 'react';
import { Shield, LayoutDashboard, Server, AlertTriangle, Bot, ScrollText, Activity } from 'lucide-react';

export type View = 'dashboard' | 'services' | 'incidents' | 'justifications' | 'agent' | 'logs';

type NavItem = {
  id: View;
  label: string;
  icon: ReactNode;
};

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'services', label: 'Services & SLAs', icon: <Server className="w-5 h-5" /> },
  { id: 'incidents', label: 'Incidents', icon: <AlertTriangle className="w-5 h-5" /> },
  { id: 'justifications', label: 'Justifications', icon: <ScrollText className="w-5 h-5" /> },
  { id: 'agent', label: 'Virtual Agent', icon: <Bot className="w-5 h-5" /> },
  { id: 'logs', label: 'Agent Logs', icon: <Activity className="w-5 h-5" /> },
];

export function Sidebar({ activeView, onNavigate }: { activeView: View; onNavigate: (v: View) => void }) {
  return (
    <aside className="w-64 shrink-0 border-r border-slate-800/60 bg-slate-950/40 backdrop-blur-xl flex flex-col h-screen sticky top-0">
      <div className="px-6 py-6 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">SLA Sentinel</h1>
            <p className="text-xs text-slate-500">Breach Awareness System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-brand-500/15 text-brand-300 border border-brand-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-slate-800/60">
        <div className="flex items-center gap-3 px-2">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-semibold">
              SS
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">SLA Sentinel</p>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Agent Active
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function TopBar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
