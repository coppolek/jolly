import React from 'react';
import { useAppContext } from '../../store';
import { useTranslation } from '../../hooks/useTranslation';
import { parseISO, format } from 'date-fns';
import { SubstitutionsTable } from './SubstitutionsTable';

export const Dashboard = ({ onNewRequest }: { onNewRequest: () => void }) => {
  const { currentUser, requests, users, workers } = useAppContext();
  const { t } = useTranslation();

  const userRequests = requests.filter(r => r.userId === currentUser.id);
  const displayedRequests = currentUser.role === 'employee' ? userRequests : requests.slice(0, 5);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getUserName = (id: string) => {
    const u = users.find(u => u.id === id);
    if (u) return u.name;
    const w = workers.find(w => w.id === id);
    if (w) return `${w.lastName} ${w.firstName}`;
    return 'Unknown';
  };

  return (
    <section className="flex-1 flex flex-col h-full bg-white">
      <div className="p-10 border-b border-[#1A1A1A] flex justify-between items-end bg-[white] shrink-0">
        <div>
          <h2 className="text-5xl font-serif italic tracking-tighter">Piano Sostituzioni</h2>
          <p className="text-xs uppercase tracking-widest opacity-40 mt-2">
            Pianificazione settimanale operatori jolly e occasionali
          </p>
        </div>
        <div className="flex gap-2">
          {currentUser.role === 'employee' && (
            <button 
              onClick={onNewRequest}
              className="px-6 py-2 border border-[#1A1A1A] bg-[#1A1A1A] text-[white] text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-transparent hover:text-[#1A1A1A] transition-all"
            >
              New Request +
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col bg-[white]">
        <div className="flex-1">
          <SubstitutionsTable />
        </div>
        
        {/* Recent Activity Section */}
        <div className="border-t border-[#1A1A1A] bg-white">
          <div className="p-6 border-b border-[#1A1A1A] bg-[#EAE3DC]">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-60">Log Attività Recenti</h3>
          </div>
          {displayedRequests.map((req) => (
            <div key={req.id} className="p-6 border-b border-[#1A1A1A] flex items-center group hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#EAE3DC] mr-6 flex items-center justify-center font-serif flex-shrink-0">
                {getInitials(getUserName(req.userId))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1 truncate">{t(req.type as any)} - {t(req.status as any)}</p>
                <h3 className="text-sm font-bold truncate">{getUserName(req.userId)}</h3>
              </div>
              <div className="text-center px-8 shrink-0">
                <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Periodo</p>
                <p className="text-xs font-serif italic">
                  {format(parseISO(req.startDate), 'MMM dd')} &mdash; {format(parseISO(req.endDate), 'MMM dd')}
                </p>
              </div>
              <div className="w-24 text-right">
                <span className={`text-[10px] uppercase font-bold tracking-widest ${req.status === 'pending' ? 'text-orange-500' : req.status === 'approved' ? 'text-green-600' : 'text-red-500'}`}>
                  {req.status}
                </span>
              </div>
            </div>
          ))}
          {displayedRequests.length === 0 && (
            <div className="p-10 text-center text-[10px] uppercase tracking-widest opacity-40">
              {t('noRequests')}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

