import React, { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useAppContext } from '../../store';
import { RefreshCw, Database } from 'lucide-react';
import { toast } from 'sonner';

export const SettingsView = () => {
  const { t } = useTranslation();
  const { syncWithHR } = useAppContext();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    toast.loading(t('syncing'), { id: 'hr-sync' });
    
    try {
      await syncWithHR();
      setLastSync(new Date());
      toast.success(t('synced'), { id: 'hr-sync' });
    } catch (e) {
      toast.error('Sync failed', { id: 'hr-sync' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <section className="flex-1 flex flex-col h-full bg-white">
      <div className="p-10 border-b border-[#1A1A1A] flex justify-between items-end bg-[#F7F3F0] shrink-0">
        <div>
          <h2 className="text-5xl font-serif italic tracking-tighter">{t('settings')}</h2>
          <p className="text-xs uppercase tracking-widest opacity-40 mt-2">Configuration & Integrations</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-10">
        <div className="max-w-4xl border border-[#1A1A1A] bg-[#F7F3F0] flex flex-col">
          <div className="p-8 border-b border-[#1A1A1A] bg-white">
            <h2 className="text-xl font-serif italic flex items-center gap-3">
              <Database className="w-5 h-5" />
              HR System Integration
            </h2>
            <p className="text-[10px] uppercase tracking-widest opacity-50 mt-2">
              Synchronize leave balances, employee lists, and department data with the central HR system (SAP / Workday).
            </p>
          </div>

          <div className="p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] uppercase font-bold tracking-widest">Connection Status</p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${lastSync ? 'bg-green-500' : 'bg-orange-400'}`}></div>
                <span className="text-xs font-serif italic">
                  {lastSync ? `Connected to SAP R/3 — Last sync: ${lastSync.toLocaleTimeString()}` : 'Awaiting manual synchronization'}
                </span>
              </div>
            </div>
             
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-6 py-2 border border-[#1A1A1A] bg-[#1A1A1A] text-[#F7F3F0] text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-transparent hover:text-[#1A1A1A] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Force Sync'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
