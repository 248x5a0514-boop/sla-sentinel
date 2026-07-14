import { useEffect, useState } from 'react';
import { Activity, Search, Bot, AlertTriangle, Zap, Eye, Send, Monitor } from 'lucide-react';
import { supabase, type AgentLog, type Incident, type Service } from '../lib/supabase';
import { Card, Badge, Spinner, EmptyState } from './ui';
import { logSeverityColors, formatRelativeTime } from '../lib/utils';

const actionIcons: Record<string, typeof Bot> = {
  breach_detected: AlertTriangle,
  justification_generated: Zap,
  escalated: AlertTriangle,
  monitoring: Monitor,
  reviewed: Eye,
  alert_sent: Send,
};

const actionColors: Record<string, string> = {
  breach_detected: 'text-red-400 bg-red-500/10',
  justification_generated: 'text-brand-400 bg-brand-500/10',
  escalated: 'text-red-400 bg-red-500/10',
  monitoring: 'text-blue-400 bg-blue-500/10',
  reviewed: 'text-emerald-400 bg-emerald-500/10',
  alert_sent: 'text-amber-400 bg-amber-500/10',
};

export function LogsView() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [log, inc, svc] = await Promise.all([
      supabase.from('agent_logs').select('*').order('created_at', { ascending: false }),
      supabase.from('incidents').select('*'),
      supabase.from('services').select('*'),
    ]);
    setLogs(log.data ?? []);
    setIncidents(inc.data ?? []);
    setServices(svc.data ?? []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  const incidentMap = new Map(incidents.map((i) => [i.id, i]));
  const serviceMap = new Map(services.map((s) => [s.id, s]));

  const filtered = logs.filter((log) => {
    const matchesSearch = !search ||
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.agent_name.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = filterSeverity === 'all' || log.severity === filterSeverity;
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    return matchesSearch && matchesSeverity && matchesAction;
  });

  const actionCounts: Record<string, number> = {};
  logs.forEach((l) => { actionCounts[l.action] = (actionCounts[l.action] ?? 0) + 1; });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Object.entries(actionCounts).map(([action, count]) => {
          const Icon = actionIcons[action] ?? Activity;
          const colorClass = actionColors[action] ?? 'text-slate-400 bg-slate-500/10';
          return (
            <Card key={action} className="p-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${colorClass} flex items-center justify-center shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-white">{count}</p>
                  <p className="text-[10px] text-slate-500 truncate">{action.replace(/_/g, ' ')}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500"
        >
          <option value="all">All Severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="critical">Critical</option>
        </select>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500"
        >
          <option value="all">All Actions</option>
          <option value="breach_detected">Breach Detected</option>
          <option value="justification_generated">Justification Generated</option>
          <option value="escalated">Escalated</option>
          <option value="monitoring">Monitoring</option>
          <option value="reviewed">Reviewed</option>
          <option value="alert_sent">Alert Sent</option>
        </select>
      </div>

      {/* Logs Timeline */}
      {filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon={<Activity className="w-8 h-8" />} title="No logs found" subtitle="Agent activity will appear here" />
        </Card>
      ) : (
        <Card className="p-5">
          <div className="relative space-y-1">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-800" />

            {filtered.map((log, idx) => {
              const Icon = actionIcons[log.action] ?? Activity;
              const colorClass = actionColors[log.action] ?? 'text-slate-400 bg-slate-500/10';
              const inc = log.incident_id ? incidentMap.get(log.incident_id) : undefined;
              const svc = inc ? serviceMap.get(inc.service_id) : undefined;

              return (
                <div key={log.id} className="flex gap-4 py-3 relative animate-fade-in" style={{ animationDelay: `${idx * 30}ms` }}>
                  <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center shrink-0 z-10 border-2 border-slate-950`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-white">{log.action.replace(/_/g, ' ')}</span>
                      <Badge value={log.severity} colorMap={logSeverityColors} />
                      <span className="text-xs text-slate-500">{log.agent_name}</span>
                      <span className="text-xs text-slate-500">• {formatRelativeTime(log.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{log.message}</p>
                    {(inc || svc) && (
                      <p className="text-xs text-slate-500 mt-1">
                        {svc && <span>Service: {svc.name}</span>}
                        {svc && inc && <span> • </span>}
                        {inc && <span>Incident: {inc.title}</span>}
                      </p>
                    )}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(log.metadata).map(([k, v]) => (
                          <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400 font-mono">
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
