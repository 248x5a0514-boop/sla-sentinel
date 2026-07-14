/*
# SLA Breach Awareness & Justification System - Schema

## Overview
Creates the full schema for a Virtual Agent-Driven SLA Breach Awareness & Justification System.
The system tracks IT services, their SLA definitions, incidents that may breach SLAs,
agent-generated justifications for breaches, and a log of virtual agent activity.

## New Tables

### 1. services
IT services being monitored for SLA compliance.
- `id` (uuid, PK)
- `name` (text, not null) - service name
- `description` (text) - service description
- `category` (text) - e.g. "Infrastructure", "Application", "Network"
- `owner` (text) - responsible team or person
- `status` (text) - "active" | "degraded" | "maintenance" | "retired"
- `criticality` (text) - "mission_critical" | "business_critical" | "standard"
- `created_at` (timestamptz)

### 2. slas
SLA definitions attached to services.
- `id` (uuid, PK)
- `service_id` (uuid, FK -> services.id ON DELETE CASCADE)
- `name` (text) - SLA name e.g. "99.9% Uptime"
- `metric_type` (text) - "uptime" | "response_time" | "resolution_time" | "throughput"
- `target_value` (numeric) - the target threshold
- `target_unit` (text) - "percent" | "ms" | "minutes" | "hours"
- `penalty` (text) - description of penalty if breached
- `measurement_window` (text) - "monthly" | "quarterly" | "annually"
- `created_at` (timestamptz)

### 3. incidents
Incidents that may cause SLA breaches.
- `id` (uuid, PK)
- `service_id` (uuid, FK -> services.id ON DELETE CASCADE)
- `title` (text, not null)
- `description` (text)
- `severity` (text) - "critical" | "high" | "medium" | "low"
- `status` (text) - "open" | "investigating" | "resolved" | "closed"
- `started_at` (timestamptz, not null)
- `resolved_at` (timestamptz, nullable)
- `breach_detected` (boolean, default false)
- `breach_type` (text, nullable) - which SLA metric was breached
- `breach_severity` (text, nullable) - "minor" | "moderate" | "severe" | "critical"
- `affected_users` (integer, default 0)
- `created_at` (timestamptz)

### 4. justifications
Agent-generated justifications for SLA breaches.
- `id` (uuid, PK)
- `incident_id` (uuid, FK -> incidents.id ON DELETE CASCADE)
- `agent_name` (text) - name of the virtual agent
- `justification_text` (text) - the main justification narrative
- `root_cause` (text) - identified root cause
- `corrective_actions` (text[]) - array of corrective action items
- `preventive_measures` (text[]) - array of preventive measures
- `status` (text) - "draft" | "submitted" | "under_review" | "approved" | "rejected"
- `confidence_score` (numeric) - 0.00 to 100.00
- `submitted_at` (timestamptz, nullable)
- `reviewed_at` (timestamptz, nullable)
- `reviewer_notes` (text, nullable)
- `created_at` (timestamptz)

### 5. agent_logs
Virtual agent activity and awareness logs.
- `id` (uuid, PK)
- `agent_name` (text) - name of the agent
- `action` (text) - "breach_detected" | "justification_generated" | "escalated" | "monitoring" | "reviewed" | "alert_sent"
- `incident_id` (uuid, FK -> incidents.id ON DELETE SET NULL, nullable)
- `message` (text) - log message
- `severity` (text) - "info" | "warning" | "error" | "critical"
- `metadata` (jsonb) - additional structured data
- `created_at` (timestamptz)

## Security
- RLS enabled on all tables.
- Single-tenant (no auth): all tables allow anon + authenticated CRUD.
- `USING (true)` is acceptable because data is intentionally shared/public.

## Indexes
- slas.service_id
- incidents.service_id
- incidents.status
- incidents.breach_detected
- justifications.incident_id
- justifications.status
- agent_logs.incident_id
- agent_logs.created_at
*/

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text DEFAULT 'Application',
  owner text,
  status text NOT NULL DEFAULT 'active',
  criticality text NOT NULL DEFAULT 'standard',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_services" ON services;
CREATE POLICY "anon_select_services" ON services FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_services" ON services;
CREATE POLICY "anon_insert_services" ON services FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_services" ON services;
CREATE POLICY "anon_update_services" ON services FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_services" ON services;
CREATE POLICY "anon_delete_services" ON services FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS slas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  name text NOT NULL,
  metric_type text NOT NULL DEFAULT 'uptime',
  target_value numeric NOT NULL DEFAULT 99.9,
  target_unit text NOT NULL DEFAULT 'percent',
  penalty text,
  measurement_window text NOT NULL DEFAULT 'monthly',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE slas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_slas" ON slas;
CREATE POLICY "anon_select_slas" ON slas FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_slas" ON slas;
CREATE POLICY "anon_insert_slas" ON slas FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_slas" ON slas;
CREATE POLICY "anon_update_slas" ON slas FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_slas" ON slas;
CREATE POLICY "anon_delete_slas" ON slas FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  breach_detected boolean NOT NULL DEFAULT false,
  breach_type text,
  breach_severity text,
  affected_users integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_incidents" ON incidents;
CREATE POLICY "anon_select_incidents" ON incidents FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_incidents" ON incidents;
CREATE POLICY "anon_insert_incidents" ON incidents FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_incidents" ON incidents;
CREATE POLICY "anon_update_incidents" ON incidents FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_incidents" ON incidents;
CREATE POLICY "anon_delete_incidents" ON incidents FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS justifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  agent_name text NOT NULL DEFAULT 'SLA Sentinel',
  justification_text text NOT NULL,
  root_cause text,
  corrective_actions text[] NOT NULL DEFAULT '{}',
  preventive_measures text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  confidence_score numeric NOT NULL DEFAULT 0,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE justifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_justifications" ON justifications;
CREATE POLICY "anon_select_justifications" ON justifications FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_justifications" ON justifications;
CREATE POLICY "anon_insert_justifications" ON justifications FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_justifications" ON justifications;
CREATE POLICY "anon_update_justifications" ON justifications FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_justifications" ON justifications;
CREATE POLICY "anon_delete_justifications" ON justifications FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL DEFAULT 'SLA Sentinel',
  action text NOT NULL,
  incident_id uuid REFERENCES incidents(id) ON DELETE SET NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_agent_logs" ON agent_logs;
CREATE POLICY "anon_select_agent_logs" ON agent_logs FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_agent_logs" ON agent_logs;
CREATE POLICY "anon_insert_agent_logs" ON agent_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_agent_logs" ON agent_logs;
CREATE POLICY "anon_update_agent_logs" ON agent_logs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_agent_logs" ON agent_logs;
CREATE POLICY "anon_delete_agent_logs" ON agent_logs FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_slas_service_id ON slas(service_id);
CREATE INDEX IF NOT EXISTS idx_incidents_service_id ON incidents(service_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_breach_detected ON incidents(breach_detected);
CREATE INDEX IF NOT EXISTS idx_justifications_incident_id ON justifications(incident_id);
CREATE INDEX IF NOT EXISTS idx_justifications_status ON justifications(status);
CREATE INDEX IF NOT EXISTS idx_agent_logs_incident_id ON agent_logs(incident_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON agent_logs(created_at DESC);
