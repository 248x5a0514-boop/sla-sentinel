import { useEffect, useState } from 'react';
import { Server, Plus, Shield, AlertTriangle, ChevronDown, ChevronUp, X, Trash2 } from 'lucide-react';
import { supabase, type Service, type Sla, type Incident } from '../lib/supabase';
import { Card, Badge, Spinner, EmptyState } from './ui';
import {
  statusColors,
  severityColors,
  criticalityColors,
  metricTypeLabels,
  formatMetricValue,
  formatDuration,
  capitalize,
} from '../lib/utils';

export function ServicesView() {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [slas, setSlas] = useState<Sla[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [s, sl, inc] = await Promise.all([
      supabase.from('services').select('*').order('name'),
      supabase.from('slas').select('*'),
      supabase.from('incidents').select('*').order('started_at', { ascending: false }),
    ]);
    setServices(s.data ?? []);
    setSlas(sl.data ?? []);
    setIncidents(inc.data ?? []);
    setLoading(false);
  }

  async function addService(data: Partial<Service>) {
    await supabase.from('services').insert(data);
    setShowAddModal(false);
    load();
  }

  async function deleteService(id: string) {
    await supabase.from('services').delete().eq('id', id);
    load();
  }

  async function addSla(serviceId: string, data: Partial<Sla>) {
    await supabase.from('slas').insert({ ...data, service_id: serviceId });
    load();
  }

  async function deleteSla(id: string) {
    await supabase.from('slas').delete().eq('id', id);
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors shadow-lg shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Service
        </button>
      </div>

      {services.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon={<Server className="w-8 h-8" />} title="No services registered" subtitle="Add a service to start monitoring SLAs" />
        </Card>
      ) : (
        <div className="space-y-3">
          {services.map((svc) => {
            const svcSlas = slas.filter((s) => s.service_id === svc.id);
            const svcIncidents = incidents.filter((i) => i.service_id === svc.id);
            const activeBreaches = svcIncidents.filter((i) => i.breach_detected && i.status !== 'resolved' && i.status !== 'closed');
            const isExpanded = expandedId === svc.id;
            const st = statusColors[svc.status] ?? statusColors.active;

            return (
              <Card key={svc.id} className="overflow-hidden">
                <div
                  onClick={() => setExpandedId(isExpanded ? null : svc.id)}
                  className="p-5 cursor-pointer flex items-center gap-4"
                >
                  <div className={`w-12 h-12 rounded-xl ${st.bg} flex items-center justify-center shrink-0`}>
                    <Server className={`w-6 h-6 ${st.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-base font-semibold text-white">{svc.name}</h3>
                      <Badge value={svc.status} colorMap={statusColors} dot dotColor={st.dot} />
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${criticalityColors[svc.criticality] ?? criticalityColors.standard}`}>
                        {svc.criticality.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1 line-clamp-1">{svc.description ?? 'No description'}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>{svcSlas.length} SLAs</span>
                      <span>{svcIncidents.length} incidents</span>
                      {activeBreaches.length > 0 && (
                        <span className="text-red-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {activeBreaches.length} active breach{activeBreaches.length > 1 ? 'es' : ''}
                        </span>
                      )}
                      <span>Owner: {svc.owner ?? 'Unassigned'}</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-800/60 animate-slide-up">
                    {/* SLAs */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-brand-400" />
                          SLA Definitions
                        </h4>
                        <AddSlaButton onAdd={(data) => addSla(svc.id, data)} />
                      </div>
                      {svcSlas.length === 0 ? (
                        <p className="text-sm text-slate-500 py-2">No SLAs defined for this service.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {svcSlas.map((sla) => (
                            <div key={sla.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 group">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-sm font-medium text-white">{sla.name}</p>
                                  <p className="text-xs text-slate-400 mt-1">
                                    {metricTypeLabels[sla.metric_type] ?? capitalize(sla.metric_type)} • Target: {formatMetricValue(Number(sla.target_value), sla.target_unit)}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-1">
                                    Window: {sla.measurement_window} • Penalty: {sla.penalty ?? 'None'}
                                  </p>
                                </div>
                                <button
                                  onClick={() => deleteSla(sla.id)}
                                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent Incidents */}
                    {svcIncidents.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          Recent Incidents
                        </h4>
                        <div className="space-y-2">
                          {svcIncidents.slice(0, 5).map((inc) => {
                            const sev = severityColors[inc.severity] ?? severityColors.medium;
                            return (
                              <div key={inc.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/30">
                                <span className={`status-dot ${sev.dot}`} />
                                <span className="text-sm text-slate-200 flex-1 truncate">{inc.title}</span>
                                {inc.breach_detected && <Badge value="breach" colorMap={{ breach: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' } }} />}
                                <Badge value={inc.status} colorMap={statusColors} />
                                <span className="text-xs text-slate-500 shrink-0">{formatDuration(inc.started_at, inc.resolved_at)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => deleteService(svc.id)}
                        className="text-sm text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Service
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {showAddModal && <AddServiceModal onClose={() => setShowAddModal(false)} onAdd={addService} />}
    </div>
  );
}

function AddSlaButton({ onAdd }: { onAdd: (data: Partial<Sla>) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [metricType, setMetricType] = useState('uptime');
  const [targetValue, setTargetValue] = useState('99.9');
  const [targetUnit, setTargetUnit] = useState('percent');
  const [penalty, setPenalty] = useState('');
  const [window] = useState('monthly');

  function submit() {
    if (!name.trim()) return;
    onAdd({
      name,
      metric_type: metricType,
      target_value: parseFloat(targetValue),
      target_unit: targetUnit,
      penalty: penalty || null,
      measurement_window: window,
    });
    setOpen(false);
    setName('');
    setPenalty('');
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add SLA
      </button>
    );
  }

  return (
    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="SLA name (e.g. 99.9% Uptime)"
        className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={metricType}
          onChange={(e) => setMetricType(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500"
        >
          <option value="uptime">Uptime</option>
          <option value="response_time">Response Time</option>
          <option value="resolution_time">Resolution Time</option>
          <option value="throughput">Throughput</option>
        </select>
        <select
          value={targetUnit}
          onChange={(e) => setTargetUnit(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500"
        >
          <option value="percent">Percent</option>
          <option value="ms">Milliseconds</option>
          <option value="minutes">Minutes</option>
          <option value="hours">Hours</option>
        </select>
      </div>
      <input
        value={targetValue}
        onChange={(e) => setTargetValue(e.target.value)}
        placeholder="Target value"
        type="number"
        className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
      />
      <input
        value={penalty}
        onChange={(e) => setPenalty(e.target.value)}
        placeholder="Penalty (e.g. 10% service credit)"
        className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
      />
      <div className="flex gap-2">
        <button onClick={submit} className="flex-1 px-3 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors">
          Add
        </button>
        <button onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

function AddServiceModal({ onClose, onAdd }: { onClose: () => void; onAdd: (data: Partial<Service>) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Application');
  const [owner, setOwner] = useState('');
  const [criticality, setCriticality] = useState('standard');

  function submit() {
    if (!name.trim()) return;
    onAdd({ name, description, category, owner, criticality, status: 'active' });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-md mx-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">Add New Service</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Service name"
            className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={2}
            className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500"
            >
              <option value="Application">Application</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Network">Network</option>
              <option value="Data">Data</option>
              <option value="Security">Security</option>
            </select>
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Owner / Team"
              className="px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
          <select
            value={criticality}
            onChange={(e) => setCriticality(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500"
          >
            <option value="standard">Standard</option>
            <option value="business_critical">Business Critical</option>
            <option value="mission_critical">Mission Critical</option>
          </select>
          <button
            onClick={submit}
            className="w-full px-4 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors shadow-lg shadow-brand-500/20"
          >
            Create Service
          </button>
        </div>
      </div>
    </div>
  );
}
