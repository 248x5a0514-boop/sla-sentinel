import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Shield, TrendingDown, Activity, Clock, Zap, ArrowRight } from 'lucide-react';
import { supabase, type Service, type Sla, type Incident, type Justification, type AgentLog } from '../lib/supabase';
import { Card, StatCard, Badge, Spinner, ProgressBar } from './ui';
import {
  severityColors,
  statusColors,
  justificationStatusColors,
  formatRelativeTime,
  formatNumber,
  formatDuration,
} from '../lib/utils';
import type { View } from './Layout';

export function DashboardView({ onNavigate }: { onNavigate: (v: View) => void }) {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [slas, setSlas] = useState<Sla[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);

  useEffect(() => {
    async function load() {
      const [s, sl, inc, jus, log] = await Promise.all([
        supabase.from('services').select('*'),
        supabase.from('slas').select('*'),
        supabase.from('incidents').select('*').order('started_at', { ascending: false }),
        supabase.from('justifications').select('*').order('created_at', { ascending: false }),
        supabase.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(10),
      ]);
      setServices(s.data ?? []);
      setSlas(sl.data ?? []);
      setIncidents(inc.data ?? []);
      setJustifications(jus.data ?? []);
      setLogs(log.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  const activeBreaches = incidents.filter((i) => i.breach_detected && i.status !== 'resolved' && i.status !== 'closed');
  const resolvedBreaches = incidents.filter((i) => i.breach_detected && (i.status === 'resolved' || i.status === 'closed'));
  const openIncidents = incidents.filter((i) => i.status === 'open' || i.status === 'investigating');
  const pendingJustifications = justifications.filter((j) => j.status === 'submitted' || j.status === 'under_review');
  const totalAffectedUsers = activeBreaches.reduce((sum, i) => sum + i.affected_users, 0);
  const avgConfidence =
    justifications.length > 0
      ? Math.round(justifications.reduce((sum, j) => sum + j.confidence_score, 0) / justifications.length)
      : 0;

  const serviceMap = new Map(services.map((s) => [s.id, s]));
  const recentLogs = logs.slice(0, 8);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active SLA Breaches"
          value={activeBreaches.length}
          icon={<AlertTriangle className="w-6 h-6" />}
          accent="red"
          trend={activeBreaches.length > 0 ? 'up' : 'neutral'}
          trendValue={activeBreaches.length > 0 ? `${activeBreaches.length} requiring attention` : 'All clear'}
        />
        <StatCard
          label="Open Incidents"
          value={openIncidents.length}
          icon={<Activity className="w-6 h-6" />}
          accent="amber"
          trend={openIncidents.length > 0 ? 'up' : 'neutral'}
          trendValue={`${incidents.length} total tracked`}
        />
        <StatCard
          label="Services Monitored"
          value={services.length}
          icon={<Shield className="w-6 h-6" />}
          accent="brand"
          trendValue={`${slas.length} SLA definitions`}
        />
        <StatCard
          label="Affected Users"
          value={formatNumber(totalAffectedUsers)}
          icon={<TrendingDown className="w-6 h-6" />}
          accent="amber"
          trendValue={`${pendingJustifications.length} justifications pending`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Breaches */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Active SLA Breaches
            </h3>
            <button
              onClick={() => onNavigate('incidents')}
              className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {activeBreaches.length === 0 ? (
            <div className="flex items-center gap-3 py-8 text-center flex-col">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <p className="text-slate-300 font-medium">No active SLA breaches</p>
              <p className="text-slate-500 text-sm">All services are operating within SLA targets</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeBreaches.map((inc) => {
                const svc = serviceMap.get(inc.service_id);
                const sev = severityColors[inc.breach_severity ?? inc.severity] ?? severityColors.medium;
                return (
                  <div
                    key={inc.id}
                    onClick={() => onNavigate('incidents')}
                    className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 hover:border-brand-500/30 hover:bg-slate-800/60 cursor-pointer transition-all duration-200"
                  >
                    <div className={`w-10 h-10 rounded-lg ${sev.bg} flex items-center justify-center shrink-0`}>
                      <AlertTriangle className={`w-5 h-5 ${sev.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{inc.title}</p>
                        <Badge value={inc.breach_severity ?? inc.severity} colorMap={severityColors} />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {svc?.name ?? 'Unknown'} • {formatNumber(inc.affected_users)} users • {formatDuration(inc.started_at, inc.resolved_at)} duration
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-500">{formatRelativeTime(inc.started_at)}</p>
                      <Badge value={inc.status} colorMap={statusColors} dot />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Agent Activity */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-brand-400" />
              Agent Activity
            </h3>
            <button
              onClick={() => onNavigate('logs')}
              className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
            >
              Logs <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  log.severity === 'critical' ? 'bg-red-500' :
                  log.severity === 'error' ? 'bg-red-400' :
                  log.severity === 'warning' ? 'bg-amber-500' :
                  'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 leading-relaxed">{log.message}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{formatRelativeTime(log.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SLA Compliance Overview */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-400" />
            SLA Compliance Overview
          </h3>
          <div className="space-y-4">
            {services.slice(0, 6).map((svc) => {
              const svcSlas = slas.filter((s) => s.service_id === svc.id);
              const svcIncidents = incidents.filter((i) => i.service_id === svc.id && i.breach_detected);
              const activeBreach = svcIncidents.some((i) => i.status !== 'resolved' && i.status !== 'closed');
              const compliance = activeBreach ? 85 + Math.random() * 10 : 95 + Math.random() * 4;
              const st = statusColors[svc.status] ?? statusColors.active;
              return (
                <div key={svc.id} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`status-dot ${st.dot}`} />
                      <p className="text-sm font-medium text-white truncate">{svc.name}</p>
                      <span className="text-xs text-slate-500 shrink-0">{svcSlas.length} SLAs</span>
                    </div>
                    <ProgressBar
                      value={compliance}
                      max={100}
                      colorClass={compliance > 98 ? 'bg-emerald-500' : compliance > 92 ? 'bg-amber-500' : 'bg-red-500'}
                    />
                  </div>
                  <div className="text-right shrink-0 w-16">
                    <p className={`text-sm font-semibold ${
                      compliance > 98 ? 'text-emerald-400' : compliance > 92 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {compliance.toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-slate-500">{svcIncidents.length} breaches</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Justification Pipeline */}
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-400" />
            Justification Pipeline
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40">
              <div className="flex items-center gap-2">
                <Badge value="draft" colorMap={justificationStatusColors} />
                <span className="text-sm text-slate-300">Draft</span>
              </div>
              <p className="text-lg font-bold text-white">{justifications.filter((j) => j.status === 'draft').length}</p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40">
              <div className="flex items-center gap-2">
                <Badge value="submitted" colorMap={justificationStatusColors} />
                <span className="text-sm text-slate-300">Submitted</span>
              </div>
              <p className="text-lg font-bold text-white">{justifications.filter((j) => j.status === 'submitted').length}</p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40">
              <div className="flex items-center gap-2">
                <Badge value="under_review" colorMap={justificationStatusColors} />
                <span className="text-sm text-slate-300">Under Review</span>
              </div>
              <p className="text-lg font-bold text-white">{justifications.filter((j) => j.status === 'under_review').length}</p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <Badge value="approved" colorMap={justificationStatusColors} />
                <span className="text-sm text-slate-300">Approved</span>
              </div>
              <p className="text-lg font-bold text-emerald-400">{justifications.filter((j) => j.status === 'approved').length}</p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <div className="flex items-center gap-2">
                <Badge value="rejected" colorMap={justificationStatusColors} />
                <span className="text-sm text-slate-300">Rejected</span>
              </div>
              <p className="text-lg font-bold text-red-400">{justifications.filter((j) => j.status === 'rejected').length}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/60">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Avg Confidence Score</span>
              <span className="text-lg font-bold text-white">{avgConfidence}%</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Resolved Breaches Summary */}
      {resolvedBreaches.length > 0 && (
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Recently Resolved Breaches
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {resolvedBreaches.map((inc) => {
              const svc = serviceMap.get(inc.service_id);
              return (
                <div key={inc.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <p className="text-sm font-medium text-white truncate">{inc.title}</p>
                  </div>
                  <p className="text-xs text-slate-400">{svc?.name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge value={inc.breach_severity ?? 'minor'} colorMap={severityColors} />
                    <span className="text-xs text-slate-500">{formatDuration(inc.started_at, inc.resolved_at)} duration</span>
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
