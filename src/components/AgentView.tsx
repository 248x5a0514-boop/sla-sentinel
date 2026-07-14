import { useEffect, useState, useRef } from 'react';
import { Bot, Send, Sparkles, AlertTriangle, CheckCircle2, XCircle, Clock, Brain, Target, Wrench, Shield } from 'lucide-react';
import { supabase, type Incident, type Service, type Sla, type Justification } from '../lib/supabase';
import { Card, Badge, Spinner } from './ui';
import {
  severityColors,
  justificationStatusColors,
  formatRelativeTime,
  formatDuration,
  formatNumber,
  metricTypeLabels,
} from '../lib/utils';

type AgentMessage = {
  role: 'agent' | 'system';
  content: string;
  timestamp: string;
  action?: string;
};

export function AgentView() {
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [slas, setSlas] = useState<Sla[]>([]);
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [breachedIncidents, setBreachedIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [generatedJustification, setGeneratedJustification] = useState<Partial<Justification> | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function load() {
    setLoading(true);
    const [inc, svc, sl, jus] = await Promise.all([
      supabase.from('incidents').select('*').order('started_at', { ascending: false }),
      supabase.from('services').select('*'),
      supabase.from('slas').select('*'),
      supabase.from('justifications').select('*').order('created_at', { ascending: false }),
    ]);
    setIncidents(inc.data ?? []);
    setServices(svc.data ?? []);
    setSlas(sl.data ?? []);
    setJustifications(jus.data ?? []);
    const breached = (inc.data ?? []).filter((i) => i.breach_detected);
    setBreachedIncidents(breached);
    setLoading(false);

    setMessages([{
      role: 'agent',
      content: `SLA Sentinel initialized. I'm monitoring ${svc.data?.length ?? 0} services with ${sl.data?.length ?? 0} SLA definitions. I've detected ${breached.length} SLA breaches that require justification. Select a breached incident to begin generating a justification.`,
      timestamp: new Date().toISOString(),
    }]);
  }

  const serviceMap = new Map(services.map((s) => [s.id, s]));

  async function generateJustification(incident: Incident) {
    setGenerating(true);
    setGeneratedJustification(null);
    setSelectedIncidentId(incident.id);

    const svc = serviceMap.get(incident.service_id);
    const svcSlas = slas.filter((s) => s.service_id === incident.id || s.service_id === incident.service_id);

    // Simulate agent reasoning process
    const steps: AgentMessage[] = [
      {
        role: 'agent',
        content: `Analyzing incident: "${incident.title}" on ${svc?.name ?? 'Unknown Service'}...`,
        timestamp: new Date().toISOString(),
        action: 'analysis_start',
      },
    ];
    setMessages((prev) => [...prev, ...steps]);

    await delay(800);

    const analysisMsg: AgentMessage = {
      role: 'agent',
      content: `Incident severity: ${incident.severity}. Affected users: ${formatNumber(incident.affected_users)}. Duration: ${formatDuration(incident.started_at, incident.resolved_at)}. Breach type: ${incident.breach_type ? metricTypeLabels[incident.breach_type] : 'Unknown'}.`,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, analysisMsg]);
    await delay(800);

    const slaMsg: AgentMessage = {
      role: 'agent',
      content: `Cross-referencing with ${svcSlas.length} applicable SLA definition(s). ${svcSlas.map((s) => s.name).join(', ')}.`,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, slaMsg]);
    await delay(1000);

    const rootCauseMsg: AgentMessage = {
      role: 'agent',
      content: `Performing root cause analysis... Examining incident patterns, service topology, and historical data...`,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, rootCauseMsg]);
    await delay(1200);

    // Generate the justification
    const justification = buildJustification(incident, svc, svcSlas);
    const confidence = calculateConfidence(incident, svcSlas);

    const draftMsg: AgentMessage = {
      role: 'agent',
      content: `Justification draft generated with ${confidence}% confidence. Root cause identified. ${justification.corrective_actions?.length ?? 0} corrective actions and ${justification.preventive_measures?.length ?? 0} preventive measures proposed.`,
      timestamp: new Date().toISOString(),
      action: 'justification_generated',
    };
    setMessages((prev) => [...prev, draftMsg]);

    setGeneratedJustification({
      ...justification,
      confidence_score: confidence,
    });
    setGenerating(false);
  }

  async function submitJustification() {
    if (!generatedJustification || !selectedIncidentId) return;

    const incident = incidents.find((i) => i.id === selectedIncidentId);
    if (!incident) return;

    await supabase.from('justifications').insert({
      incident_id: selectedIncidentId,
      agent_name: 'SLA Sentinel',
      justification_text: generatedJustification.justification_text,
      root_cause: generatedJustification.root_cause,
      corrective_actions: generatedJustification.corrective_actions ?? [],
      preventive_measures: generatedJustification.preventive_measures ?? [],
      status: 'submitted',
      confidence_score: generatedJustification.confidence_score ?? 0,
      submitted_at: new Date().toISOString(),
    });

    // Log agent activity
    await supabase.from('agent_logs').insert({
      agent_name: 'SLA Sentinel',
      action: 'justification_generated',
      incident_id: selectedIncidentId,
      message: `Justification submitted for "${incident.title}" with ${generatedJustification.confidence_score}% confidence.`,
      severity: 'info',
      metadata: { confidence: generatedJustification.confidence_score },
    });

    const submitMsg: AgentMessage = {
      role: 'agent',
      content: `Justification submitted successfully. Status: "Submitted" — awaiting review. Incident ID: ${selectedIncidentId.slice(0, 8)}...`,
      timestamp: new Date().toISOString(),
      action: 'submitted',
    };
    setMessages((prev) => [...prev, submitMsg]);

    setGeneratedJustification(null);
    setSelectedIncidentId(null);
    load();
  }

  async function reviewJustification(jus: Justification, approved: boolean) {
    const newStatus = approved ? 'approved' : 'rejected';
    await supabase.from('justifications').update({
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: reviewNotes || null,
    }).eq('id', jus.id);

    await supabase.from('agent_logs').insert({
      agent_name: 'SLA Sentinel',
      action: 'reviewed',
      incident_id: jus.incident_id,
      message: `Justification ${newStatus}. ${reviewNotes || 'No notes provided.'}`,
      severity: approved ? 'info' : 'warning',
      metadata: { review_status: newStatus },
    });

    setReviewNotes('');
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  const pendingJustifications = justifications.filter((j) => j.status === 'submitted' || j.status === 'under_review');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Agent Header */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">SLA Sentinel</h3>
            <p className="text-sm text-slate-400">Virtual Agent for SLA Breach Awareness & Justification</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{breachedIncidents.length}</p>
              <p className="text-xs text-slate-500">Breaches Detected</p>
            </div>
            <div className="w-px h-12 bg-slate-800" />
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{justifications.length}</p>
              <p className="text-xs text-slate-500">Justifications</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Breach Queue */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Breach Justification Queue
          </h3>
          {breachedIncidents.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No breaches requiring justification.</p>
          ) : (
            <div className="space-y-2">
              {breachedIncidents.map((inc) => {
                const svc = serviceMap.get(inc.service_id);
                const hasJus = justifications.some((j) => j.incident_id === inc.id);
                const sev = severityColors[inc.breach_severity ?? inc.severity] ?? severityColors.medium;
                const isSelected = selectedIncidentId === inc.id;
                return (
                  <button
                    key={inc.id}
                    onClick={() => generateJustification(inc)}
                    disabled={generating}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? 'bg-brand-500/15 border-brand-500/30'
                        : 'bg-slate-800/40 border-slate-700/40 hover:border-brand-500/20 hover:bg-slate-800/60'
                    } ${generating && !isSelected ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`status-dot ${sev.dot}`} />
                      <p className="text-sm font-medium text-white truncate">{inc.title}</p>
                    </div>
                    <p className="text-xs text-slate-500">{svc?.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {hasJus ? (
                        <Badge value="justified" colorMap={{ justified: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' } }} />
                      ) : (
                        <Badge value="needs justification" colorMap={{ 'needs justification': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' } }} />
                      )}
                      <span className="text-xs text-slate-500">{formatNumber(inc.affected_users)} users</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Agent Console */}
        <Card className="p-0 lg:col-span-2 flex flex-col" >
          <div className="px-5 py-4 border-b border-slate-800/60 flex items-center gap-2">
            <Brain className="w-5 h-5 text-brand-400" />
            <h3 className="text-sm font-semibold text-white">Agent Reasoning Console</h3>
            {generating && (
              <span className="ml-auto text-xs text-brand-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                Processing...
              </span>
            )}
          </div>

          <div className="flex-1 min-h-[300px] max-h-[400px] overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 animate-slide-up ${msg.role === 'system' ? 'opacity-60' : ''}`}>
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-brand-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-200 leading-relaxed">{msg.content}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{formatRelativeTime(msg.timestamp)}</p>
                </div>
              </div>
            ))}
            {generating && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-brand-400 animate-pulse" />
                </div>
                <div className="flex items-center gap-1 py-2">
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Generated Justification Preview */}
          {generatedJustification && (
            <div className="border-t border-slate-800/60 p-4 animate-slide-up max-h-[400px] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-400" />
                  Generated Justification
                </h4>
                <Badge value="draft" colorMap={justificationStatusColors} />
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Root Cause</p>
                  <p className="text-sm text-slate-200">{generatedJustification.root_cause}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-1">Justification</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{generatedJustification.justification_text}</p>
                </div>

                {generatedJustification.corrective_actions && generatedJustification.corrective_actions.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Wrench className="w-3 h-3" /> Corrective Actions</p>
                    <ul className="space-y-1">
                      {generatedJustification.corrective_actions.map((a, i) => (
                        <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                          <span className="text-brand-400 mt-0.5">•</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {generatedJustification.preventive_measures && generatedJustification.preventive_measures.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Shield className="w-3 h-3" /> Preventive Measures</p>
                    <ul className="space-y-1">
                      {generatedJustification.preventive_measures.map((m, i) => (
                        <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                          <span className="text-emerald-400 mt-0.5">•</span>
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2 border-t border-slate-800/60">
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">Confidence Score</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-400 to-brand-500 rounded-full transition-all duration-500"
                          style={{ width: `${generatedJustification.confidence_score}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-white">{generatedJustification.confidence_score}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={submitJustification}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Submit for Review
                  </button>
                  <button
                    onClick={() => { setGeneratedJustification(null); setSelectedIncidentId(null); }}
                    className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Pending Reviews */}
      {pendingJustifications.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Pending Reviews
          </h3>
          <div className="space-y-3">
            {pendingJustifications.map((jus) => {
              const inc = incidents.find((i) => i.id === jus.incident_id);
              const svc = inc ? serviceMap.get(inc.service_id) : undefined;
              return (
                <div key={jus.id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-white">{inc?.title ?? 'Unknown incident'}</p>
                      <p className="text-xs text-slate-500">{svc?.name} • Generated by {jus.agent_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge value={jus.status} colorMap={justificationStatusColors} />
                      <span className="text-xs text-brand-400 font-medium">{jus.confidence_score}% confidence</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 line-clamp-2 mb-2">{jus.justification_text}</p>
                  {jus.root_cause && (
                    <p className="text-xs text-slate-500 mb-2"><span className="text-slate-400">Root cause:</span> {jus.root_cause}</p>
                  )}
                  <input
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Review notes (optional)..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => reviewJustification(jus, true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-sm font-medium hover:bg-emerald-500/20 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => reviewJustification(jus, false)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-sm font-medium hover:bg-red-500/20 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildJustification(incident: Incident, svc: Service | undefined, svcSlas: Sla[]): Partial<Justification> {
  const isExternal = incident.description?.toLowerCase().includes('downstream') ||
    incident.description?.toLowerCase().includes('partner') ||
    incident.description?.toLowerCase().includes('provider') ||
    incident.description?.toLowerCase().includes('external');

  const isInternal = incident.description?.toLowerCase().includes('migration') ||
    incident.description?.toLowerCase().includes('index') ||
    incident.description?.toLowerCase().includes('query') ||
    incident.description?.toLowerCase().includes('config');

  const rootCause = isExternal
    ? 'External dependency degradation caused cascading impact on service availability. The root cause originates outside our infrastructure, making this an externally-triggered breach rather than an internal failure.'
    : isInternal
    ? 'Internal configuration or infrastructure change introduced a regression that was not caught in pre-deployment validation. The root cause is an internal process gap in change management.'
    : 'Service degradation occurred due to resource exhaustion under unexpected load conditions. The root cause is insufficient capacity planning for peak traffic scenarios.';

  const justificationText = `The ${svc?.name ?? 'service'} experienced an SLA breach on its ${incident.breach_type ? metricTypeLabels[incident.breach_type] : 'availability'} metric. The incident began at ${new Date(incident.started_at).toLocaleString()} and affected approximately ${formatNumber(incident.affected_users)} users over a period of ${formatDuration(incident.started_at, incident.resolved_at)}.

${rootCause}

The breach severity is classified as ${incident.breach_severity ?? incident.severity} based on the ${svc?.criticality?.replace(/_/g, ' ') ?? 'standard'} criticality of the affected service and the number of impacted users. ${isExternal ? 'This breach was caused by factors outside our direct control, and corrective actions were taken immediately upon detection to mitigate impact and reroute traffic.' : 'This breach was preventable and corrective actions have been implemented to address both the immediate issue and prevent recurrence.'}

The applicable SLA${svcSlas.length > 1 ? 's' : ''} ${svcSlas.map((s) => `${s.name} (${s.target_value}${s.target_unit === 'percent' ? '%' : ` ${s.target_unit}`})`).join(', ')} ${svcSlas.length > 1 ? 'were' : 'was'} impacted. ${svcSlas[0]?.penalty ? `The associated penalty is: ${svcSlas[0].penalty}.` : 'No specific penalty clause applies.'}`;

  const correctiveActions = isExternal
    ? [
        'Rerouted traffic to backup/secondary endpoint to reduce load on affected dependency',
        'Engaged external provider/partner support team for resolution',
        'Enabled circuit breaker pattern to prevent cascading failures',
        'Implemented async processing for non-critical operations to reduce synchronous dependency',
      ]
    : isInternal
    ? [
        'Reverted the problematic change and restored previous working state',
        'Added missing configuration/index/optimization identified during investigation',
        'Enabled additional monitoring on affected endpoints to detect similar issues early',
        'Created hotfix deployment with corrected configuration',
      ]
    : [
        'Scaled up service resources to handle current load levels',
        'Enabled auto-scaling policy with more aggressive thresholds',
        'Implemented rate limiting to protect against traffic spikes',
        'Activated queue-based load shedding for non-critical requests',
      ];

  const preventiveMeasures = isExternal
    ? [
        'Implement multi-region/multi-provider routing with automatic failover',
        'Add latency-based circuit breakers to detect external dependency degradation early',
        'Negotiate advance notification clauses in provider contracts for capacity or policy changes',
        'Build dependency health monitoring with proactive alerting at degradation thresholds',
        'Establish runbook for external dependency failure scenarios',
      ]
    : isInternal
    ? [
        'Add automated validation step to CI/CD pipeline for configuration changes',
        'Implement performance regression tests in staging environment',
        'Review and update change management process to include SLA impact assessment',
        'Set up automated slow-query/performance alerting with threshold-based triggers',
        'Schedule regular review of all pending changes for missing optimizations',
      ]
    : [
        'Implement workload management with resource groups per consumer',
        'Set up predictive auto-scaling based on historical traffic patterns',
        'Create capacity planning review cadence (monthly) for all critical services',
        'Deploy adaptive rate limiting with graduated backoff strategies',
        'Establish load testing schedule to validate capacity before peak periods',
      ];

  return {
    justification_text: justificationText,
    root_cause: rootCause,
    corrective_actions: correctiveActions,
    preventive_measures: preventiveMeasures,
  };
}

function calculateConfidence(incident: Incident, svcSlas: Sla[]): number {
  let base = 75;
  if (incident.description && incident.description.length > 50) base += 5;
  if (incident.affected_users > 0) base += 3;
  if (incident.breach_type) base += 5;
  if (svcSlas.length > 0) base += 5;
  if (incident.severity === 'critical' || incident.severity === 'high') base += 3;
  if (incident.resolved_at) base += 4;
  return Math.min(98, base);
}
