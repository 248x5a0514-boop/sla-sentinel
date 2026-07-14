import { useEffect, useState } from 'react';
import { ScrollText, Search, CheckCircle2, XCircle, Clock, Bot, Target, Wrench, Shield } from 'lucide-react';
import { supabase, type Justification, type Incident, type Service } from '../lib/supabase';
import { Card, Badge, Spinner, EmptyState } from './ui';
import {
  justificationStatusColors,
  severityColors,
  formatRelativeTime,
} from '../lib/utils';

export function JustificationsView() {
  const [loading, setLoading] = useState(true);
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedJus, setSelectedJus] = useState<Justification | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [jus, inc, svc] = await Promise.all([
      supabase.from('justifications').select('*').order('created_at', { ascending: false }),
      supabase.from('incidents').select('*'),
      supabase.from('services').select('*'),
    ]);
    setJustifications(jus.data ?? []);
    setIncidents(inc.data ?? []);
    setServices(svc.data ?? []);
    setLoading(false);
  }

  async function updateStatus(jus: Justification, status: string, notes: string) {
    await supabase.from('justifications').update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: notes || null,
    }).eq('id', jus.id);

    await supabase.from('agent_logs').insert({
      agent_name: 'SLA Sentinel',
      action: 'reviewed',
      incident_id: jus.incident_id,
      message: `Justification ${status}. ${notes || 'No notes provided.'}`,
      severity: status === 'approved' ? 'info' : 'warning',
      metadata: { review_status: status },
    });

    setSelectedJus(null);
    load();
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

  const filtered = justifications.filter((j) => {
    const inc = incidentMap.get(j.incident_id);
    const svc = inc ? serviceMap.get(inc.service_id) : undefined;
    const matchesSearch = !search ||
      j.justification_text.toLowerCase().includes(search.toLowerCase()) ||
      j.root_cause?.toLowerCase().includes(search.toLowerCase()) ||
      (inc?.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (svc?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || j.status === filterStatus;
    return matchesSearch && matchesStatus;
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
            placeholder="Search justifications..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon={<ScrollText className="w-8 h-8" />} title="No justifications found" subtitle="Generate justifications from the Virtual Agent view" />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((jus) => {
            const inc = incidentMap.get(jus.incident_id);
            const svc = inc ? serviceMap.get(inc.service_id) : undefined;
            const sev = severityColors[inc?.breach_severity ?? inc?.severity ?? 'medium'] ?? severityColors.medium;

            return (
              <Card key={jus.id} hover className="p-5 cursor-pointer" >
                <div onClick={() => setSelectedJus(jus)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
                        <Bot className="w-5 h-5 text-brand-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{inc?.title ?? 'Unknown incident'}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{svc?.name} • Generated by {jus.agent_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge value={jus.status} colorMap={justificationStatusColors} />
                      <span className="text-xs text-brand-400 font-medium">{jus.confidence_score}%</span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed line-clamp-2 mb-3">{jus.justification_text}</p>

                  {jus.root_cause && (
                    <div className="flex items-start gap-2 mb-2 p-2 rounded-lg bg-slate-800/40">
                      <Target className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-300">{jus.root_cause}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    {jus.corrective_actions.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Wrench className="w-3 h-3" />
                        {jus.corrective_actions.length} corrective actions
                      </span>
                    )}
                    {jus.preventive_measures.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        {jus.preventive_measures.length} preventive measures
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(jus.created_at)}
                    </span>
                    {inc && (
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${sev.bg} ${sev.text} ${sev.border}`}>
                        {inc.breach_severity ?? inc.severity}
                      </span>
                    )}
                  </div>

                  {jus.reviewer_notes && (
                    <div className="mt-3 pt-3 border-t border-slate-800/60">
                      <p className="text-xs text-slate-500 mb-1">Reviewer Notes</p>
                      <p className="text-sm text-slate-300">{jus.reviewer_notes}</p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selectedJus && (
        <JustificationDetailModal
          jus={selectedJus}
          incident={incidentMap.get(selectedJus.incident_id)}
          service={serviceMap.get(incidentMap.get(selectedJus.incident_id)?.service_id ?? '')}
          onClose={() => setSelectedJus(null)}
          onUpdate={updateStatus}
        />
      )}
    </div>
  );
}

function JustificationDetailModal({
  jus,
  incident,
  service,
  onClose,
  onUpdate,
}: {
  jus: Justification;
  incident: Incident | undefined;
  service: Service | undefined;
  onClose: () => void;
  onUpdate: (jus: Justification, status: string, notes: string) => void;
}) {
  const [notes, setNotes] = useState(jus.reviewer_notes ?? '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-2xl mx-4 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{incident?.title ?? 'Justification'}</h3>
              <p className="text-sm text-slate-400">{service?.name} • {jus.agent_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Badge value={jus.status} colorMap={justificationStatusColors} />
          <span className="text-sm text-brand-400 font-medium">{jus.confidence_score}% confidence</span>
          <span className="text-xs text-slate-500">Created {formatRelativeTime(jus.created_at)}</span>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Root Cause</p>
            <p className="text-sm text-slate-200">{jus.root_cause}</p>
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-1">Justification</p>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{jus.justification_text}</p>
          </div>

          {jus.corrective_actions.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Wrench className="w-3 h-3" /> Corrective Actions</p>
              <ul className="space-y-1">
                {jus.corrective_actions.map((a, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-brand-400 mt-0.5">•</span>{a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {jus.preventive_measures.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Shield className="w-3 h-3" /> Preventive Measures</p>
              <ul className="space-y-1">
                {jus.preventive_measures.map((m, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>{m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {jus.reviewer_notes && (
            <div className="p-3 rounded-xl bg-slate-800/40">
              <p className="text-xs text-slate-500 mb-1">Previous Review Notes</p>
              <p className="text-sm text-slate-300">{jus.reviewer_notes}</p>
            </div>
          )}
        </div>

        {(jus.status === 'submitted' || jus.status === 'under_review' || jus.status === 'draft') && (
          <div className="mt-5 pt-4 border-t border-slate-800/60">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Review notes..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => onUpdate(jus, 'approved', notes)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-sm font-medium hover:bg-emerald-500/20 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={() => onUpdate(jus, 'rejected', notes)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-sm font-medium hover:bg-red-500/20 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={() => onUpdate(jus, 'under_review', notes)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-sm font-medium hover:bg-amber-500/20 transition-colors"
              >
                <Clock className="w-4 h-4" />
                Mark Under Review
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
