import React, { useState } from 'react';
import { AppProvider, useAppContext } from './store';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { Dashboard } from './components/views/Dashboard';
import { RequestsView } from './components/views/RequestsView';
import { CalendarView } from './components/views/CalendarView';
import { WorkersView } from './components/views/WorkersView';
import { WorksitesView } from './components/views/WorksitesView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { SettingsView } from './components/views/SettingsView';
import { LeaveForm } from './components/views/LeaveForm';
import { Toaster } from 'sonner';

function LoginScreen() {
  const { login } = useAppContext();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F7F3F0] text-[#1A1A1A]">
      <div className="max-w-md w-full p-12 bg-white border border-[#1A1A1A] shadow-[8px_8px_0_0_rgba(26,26,26,1)] text-center">
        <h1 className="text-5xl font-serif italic font-bold tracking-tighter mb-4">LV<span className="opacity-40">|</span>Pro</h1>
        <p className="text-[10px] uppercase tracking-[0.2em] opacity-60 font-semibold mb-12">Multiservizi Management</p>
        
        <button 
          onClick={login}
          className="w-full px-8 py-4 border border-[#1A1A1A] bg-[#1A1A1A] text-[#F7F3F0] text-[10px] uppercase tracking-widest font-bold hover:bg-transparent hover:text-[#1A1A1A] transition-all"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLeaveFormOpen, setIsLeaveFormOpen] = useState(false);
  const { currentUser, isLoadingAuth } = useAppContext();

  if (isLoadingAuth) {
    return <div className="min-h-screen bg-[#F7F3F0] flex items-center justify-center font-serif italic opacity-50">Loading...</div>;
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#F7F3F0] text-[#1A1A1A] overflow-hidden font-sans select-none">
      <Topbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 flex flex-col overflow-y-auto bg-white border-l border-[#1A1A1A]">
          {activeTab === 'dashboard' && <Dashboard onNewRequest={() => setIsLeaveFormOpen(true)} />}
          {activeTab === 'requests' && <RequestsView />}
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'workers' && currentUser?.role === 'manager' && <WorkersView />}
          {activeTab === 'worksites' && currentUser?.role === 'manager' && <WorksitesView />}
          {activeTab === 'analytics' && currentUser?.role === 'manager' && <AnalyticsView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>
      
      {isLeaveFormOpen && <LeaveForm onClose={() => setIsLeaveFormOpen(false)} />}
      
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

