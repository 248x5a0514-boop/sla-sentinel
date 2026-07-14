import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Search, Clock, Users, Zap, CheckCircle2, Bot, X } from 'lucide-react';
import { supabase, type Incident, type Service, type Sla, type Justification } from '../lib/supabase';
import { Card, Badge, Spinner, EmptyState } from './ui';
import {
  severityColors,
  statusColors,
  justificationStatusColors,
  formatRelativeTime,
  formatDuration,
  formatNumber,
  capitalize,
  metricTypeLabels,
} from '../lib/utils';

export function IncidentsView({ onNavigateToJustifications }: { onNavigateToJustifications: () => void }) {
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [slas, setSlas] = useState<Sla[]>([]);
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBreach, setFilterBreach] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [inc, svc, sl, jus] = await Promise.all([
      supabase.from('incidents').select('*').order('started_at', { ascending: false }),
      supabase.from('services').select('*'),
      supabase.from('slas').select('*'),
      supabase.from('justifications').select('*'),
    ]);
    setIncidents(inc.data ?? []);
    setServices(svc.data ?? []);
    setSlas(sl.data ?? []);
    setJustifications(jus.data ?? []);
    setLoading(false);
  }

  async function addIncident(data: Partial<Incident>) {
    await supabase.from('incidents').insert(data);
    setShowAddModal(false);
    load();
  }

  async function updateIncidentStatus(id: string, status: string) {
    const updates: Partial<Incident> = { status };
    if (status === 'resolved' || status === 'closed') {
      updates.resolved_at = new Date().toISOString();
    }
    await supabase.from('incidents').update(updates).eq('id', id);
    load();
  }

  async function toggleBreach(incident: Incident) {
    const newBreach = !incident.breach_detected;
    const updates: Partial<Incident> = { breach_detected: newBreach };
    if (newBreach && !incident.breach_type) {
      const svcSlas = slas.filter((s) => s.service_id === incident.service_id);
      if (svcSlas.length > 0) {
        updates.breach_type = svcSlas[0].metric_type;
        updates.breach_severity = incident.severity === 'critical' ? 'severe' : incident.severity === 'high' ? 'moderate' : 'minor';
      }
    }
    await supabase.from('incidents').update(updates).eq('id', incident.id);
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  const serviceMap = new Map(services.map((s) => [s.id, s]));
  const filtered = incidents.filter((inc) => {
    const svc = serviceMap.get(inc.service_id);
    const matchesSearch = !search ||
      inc.title.toLowerCase().includes(search.toLowerCase()) ||
      (svc?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || inc.status === filterStatus;
    const matchesBreach = filterBreach === 'all' ||
      (filterBreach === 'breach' && inc.breach_detected) ||
      (filterBreach === 'no_breach' && !inc.breach_detected);
    return matchesSearch && matchesStatus && matchesBreach;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search incidents..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={filterBreach}
          onChange={(e) => setFilterBreach(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500"
        >
          <option value="all">All Incidents</option>
          <option value="breach">SLA Breaches Only</option>
          <option value="no_breach">No Breach</option>
        </select>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors shadow-lg shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" />
          Log Incident
        </button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon={<AlertTriangle className="w-8 h-8" />} title="No incidents found" subtitle="Try adjusting your filters or log a new incident" />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((inc) => {
            const svc = serviceMap.get(inc.service_id);
            const sev = severityColors[inc.severity] ?? severityColors.medium;
            const st = statusColors[inc.status] ?? statusColors.open;
            const incJustifications = justifications.filter((j) => j.incident_id === inc.id);

            return (
              <Card key={inc.id} hover className="p-4 cursor-pointer" >
                <div onClick={() => setSelectedIncident(inc)}>
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-xl ${sev.bg} flex items-center justify-center shrink-0`}>
                      {inc.breach_detected ? (
                        <AlertTriangle className={`w-5 h-5 ${sev.text}`} />
                      ) : (
                        <Clock className={`w-5 h-5 ${sev.text}`} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-white">{inc.title}</h3>
                        {inc.breach_detected && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 font-medium">
                            SLA BREACH
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-1 line-clamp-1">{inc.description ?? 'No description'}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-slate-500">
                        <span className="text-slate-300 font-medium">{svc?.name ?? 'Unknown'}</span>
                        <span>•</span>
                        <Badge value={inc.severity} colorMap={severityColors} />
                        <Badge value={inc.status} colorMap={statusColors} dot dotColor={st.dot} />
                        {inc.breach_detected && inc.breach_severity && (
                          <Badge value={inc.breach_severity} colorMap={severityColors} />
                        )}
                        {inc.breach_detected && inc.breach_type && (
                          <span>Breach: {metricTypeLabels[inc.breach_type] ?? capitalize(inc.breach_type)}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {formatNumber(inc.affected_users)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(inc.started_at, inc.resolved_at)}
                        </span>
                        <span>{formatRelativeTime(inc.started_at)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {incJustifications.length > 0 && (
                        <span className="text-xs text-brand-400 flex items-center gap-1">
                          <Bot className="w-3.5 h-3.5" />
                          {incJustifications.length} justification{incJustifications.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <AddIncidentModal
          services={services}
          onClose={() => setShowAddModal(false)}
          onAdd={addIncident}
        />
      )}

      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          service={serviceMap.get(selectedIncident.service_id)}
          incidentSlas={slas.filter((s) => s.service_id === selectedIncident.service_id)}
          justifications={justifications.filter((j) => j.incident_id === selectedIncident.id)}
          onClose={() => setSelectedIncident(null)}
          onUpdateStatus={updateIncidentStatus}
          onToggleBreach={toggleBreach}
          onNavigateToJustifications={onNavigateToJustifications}
        />
      )}
    </div>
  );
}

function AddIncidentModal({
  services,
  onClose,
  onAdd,
}: {
  services: Service[];
  onClose: () => void;
  onAdd: (data: Partial<Incident>) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '');
  const [severity, setSeverity] = useState('medium');
  const [affectedUsers, setAffectedUsers] = useState('0');

  function submit() {
    if (!title.trim() || !serviceId) return;
    onAdd({
      title,
      description,
      service_id: serviceId,
      severity,
      status: 'open',
      affected_users: parseInt(affectedUsers) || 0,
      started_at: new Date().toISOString(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-md mx-4 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">Log New Incident</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Incident title"
            className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"
          />
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <input
              value={affectedUsers}
              onChange={(e) => setAffectedUsers(e.target.value)}
              placeholder="Affected users"
              type="number"
              className="px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
          <button
            onClick={submit}
            className="w-full px-4 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors shadow-lg shadow-brand-500/20"
          >
            Create Incident
          </button>
        </div>
      </div>
    </div>
  );
}

function IncidentDetailModal({
  incident,
  service,
  incidentSlas,
  justifications,
  onClose,
  onUpdateStatus,
  onToggleBreach,
  onNavigateToJustifications,
}: {
  incident: Incident;
  service: Service | undefined;
  incidentSlas: Sla[];
  justifications: Justification[];
  onClose: () => void;
  onUpdateStatus: (id: string, status: string) => void;
  onToggleBreach: (inc: Incident) => void;
  onNavigateToJustifications: () => void;
}) {
  const sev = severityColors[incident.severity] ?? severityColors.medium;
  const st = statusColors[incident.status] ?? statusColors.open;
  const isActive = incident.status === 'open' || incident.status === 'investigating';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-2xl mx-4 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-xl ${sev.bg} flex items-center justify-center shrink-0`}>
              {incident.breach_detected ? (
                <AlertTriangle className={`w-6 h-6 ${sev.text}`} />
              ) : (
                <Clock className={`w-6 h-6 ${sev.text}`} />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{incident.title}</h3>
              <p className="text-sm text-slate-400">{service?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-4">
          <Badge value={incident.severity} colorMap={severityColors} />
          <Badge value={incident.status} colorMap={statusColors} dot dotColor={st.dot} />
          {incident.breach_detected && (
            <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 font-medium">
              SLA BREACH
            </span>
          )}
          {incident.breach_detected && incident.breach_severity && (
            <Badge value={incident.breach_severity} colorMap={severityColors} />
          )}
        </div>

        {incident.description && (
          <p className="text-sm text-slate-300 mb-4 leading-relaxed">{incident.description}</p>
        )}

        {/* Incident Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="p-3 rounded-xl bg-slate-800/40">
            <p className="text-xs text-slate-500">Started</p>
            <p className="text-sm text-white mt-1">{formatRelativeTime(incident.started_at)}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40">
            <p className="text-xs text-slate-500">Duration</p>
            <p className="text-sm text-white mt-1">{formatDuration(incident.started_at, incident.resolved_at)}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40">
            <p className="text-xs text-slate-500">Affected Users</p>
            <p className="text-sm text-white mt-1">{formatNumber(incident.affected_users)}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40">
            <p className="text-xs text-slate-500">Breach Type</p>
            <p className="text-sm text-white mt-1">
              {incident.breach_type ? metricTypeLabels[incident.breach_type] ?? capitalize(incident.breach_type) : '—'}
            </p>
          </div>
        </div>

        {/* SLA Context */}
        {incidentSlas.length > 0 && (
          <div className="mb-5">
            <h4 className="text-sm font-semibold text-slate-200 mb-2">Applicable SLAs</h4>
            <div className="space-y-2">
              {incidentSlas.map((sla) => (
                <div key={sla.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40">
                  <div>
                    <p className="text-sm text-white">{sla.name}</p>
                    <p className="text-xs text-slate-500">{metricTypeLabels[sla.metric_type]} • {sla.measurement_window}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-brand-400 font-medium">
                      {sla.target_value}{sla.target_unit === 'percent' ? '%' : ` ${sla.target_unit}`}
                    </p>
                    <p className="text-xs text-slate-500">{sla.penalty ?? 'No penalty'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Justifications */}
        {justifications.length > 0 && (
          <div className="mb-5">
            <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <Bot className="w-4 h-4 text-brand-400" />
              Agent Justifications
            </h4>
            <div className="space-y-2">
              {justifications.map((jus) => (
                <div key={jus.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">{jus.agent_name}</span>
                    <div className="flex items-center gap-2">
                      <Badge value={jus.status} colorMap={justificationStatusColors} />
                      <span className="text-xs text-brand-400 font-medium">{jus.confidence_score}% confidence</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 line-clamp-2">{jus.justification_text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-800/60">
          {isActive && (
            <>
              <button
                onClick={() => onUpdateStatus(incident.id, 'investigating')}
                className="px-3 py-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-sm font-medium hover:bg-amber-500/20 transition-colors"
              >
                Mark Investigating
              </button>
              <button
                onClick={() => onUpdateStatus(incident.id, 'resolved')}
                className="px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-sm font-medium hover:bg-emerald-500/20 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 inline mr-1" />
                Resolve
              </button>
            </>
          )}
          <button
            onClick={() => onToggleBreach(incident)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              incident.breach_detected
                ? 'bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-700'
                : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
            }`}
          >
            {incident.breach_detected ? 'Unmark Breach' : 'Mark as Breach'}
          </button>
          <button
            onClick={() => { onClose(); onNavigateToJustifications(); }}
            className="px-3 py-2 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/30 text-sm font-medium hover:bg-brand-500/20 transition-colors flex items-center gap-1"
          >
            <Zap className="w-4 h-4" />
            Generate Justification
          </button>
        </div>
      </div>
    </div>
  );
}
