import { useState } from 'react';
import { Sidebar, TopBar, type View } from './components/Layout';
import { DashboardView } from './components/DashboardView';
import { ServicesView } from './components/ServicesView';
import { IncidentsView } from './components/IncidentsView';
import { AgentView } from './components/AgentView';
import { JustificationsView } from './components/JustificationsView';
import { LogsView } from './components/LogsView';

const viewMeta: Record<View, { title: string; subtitle: string }> = {
  dashboard: { title: 'Operations Dashboard', subtitle: 'Real-time SLA breach awareness and system health overview' },
  services: { title: 'Services & SLAs', subtitle: 'Manage monitored services and their SLA definitions' },
  incidents: { title: 'Incident Management', subtitle: 'Track incidents and detect SLA breaches in real time' },
  justifications: { title: 'Justification Registry', subtitle: 'Review and manage agent-generated breach justifications' },
  agent: { title: 'Virtual Agent', subtitle: 'SLA Sentinel — autonomous breach awareness and justification engine' },
  logs: { title: 'Agent Activity Logs', subtitle: 'Complete audit trail of virtual agent actions and decisions' },
};

function App() {
  const [view, setView] = useState<View>('dashboard');

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar activeView={view} onNavigate={setView} />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <TopBar title={viewMeta[view].title} subtitle={viewMeta[view].subtitle} />
          {view === 'dashboard' && <DashboardView onNavigate={setView} />}
          {view === 'services' && <ServicesView />}
          {view === 'incidents' && <IncidentsView onNavigateToJustifications={() => setView('agent')} />}
          {view === 'justifications' && <JustificationsView />}
          {view === 'agent' && <AgentView />}
          {view === 'logs' && <LogsView />}
        </div>
      </main>
    </div>
  );
}

export default App;
