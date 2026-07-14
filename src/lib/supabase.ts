import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Service = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  owner: string | null;
  status: string;
  criticality: string;
  created_at: string;
};

export type Sla = {
  id: string;
  service_id: string;
  name: string;
  metric_type: string;
  target_value: number;
  target_unit: string;
  penalty: string | null;
  measurement_window: string;
  created_at: string;
};

export type Incident = {
  id: string;
  service_id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  started_at: string;
  resolved_at: string | null;
  breach_detected: boolean;
  breach_type: string | null;
  breach_severity: string | null;
  affected_users: number;
  created_at: string;
};

export type Justification = {
  id: string;
  incident_id: string;
  agent_name: string;
  justification_text: string;
  root_cause: string | null;
  corrective_actions: string[];
  preventive_measures: string[];
  status: string;
  confidence_score: number;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
};

export type AgentLog = {
  id: string;
  agent_name: string;
  action: string;
  incident_id: string | null;
  message: string;
  severity: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type IncidentWithRelations = Incident & {
  services?: Service;
  justifications?: Justification[];
};

export type ServiceWithRelations = Service & {
  slas?: Sla[];
  incidents?: Incident[];
};
