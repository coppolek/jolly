import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../store';
import { useTranslation } from '../../hooks/useTranslation';
import { format, parseISO } from 'date-fns';
import { Plus, Search } from 'lucide-react';
import { LeaveForm } from './LeaveForm';
import { LeaveRequest } from '../../types';

export const RequestsView = () => {
  const { requests, currentUser, users, workers, updateRequestStatus, deleteRequest } = useAppContext();
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isManager = currentUser.role === 'manager';
  
  const displayedRequests = useMemo(() => {
    let reqs = requests;
    if (searchTerm) {
      reqs = reqs.filter(r => {
        const userName = (() => {
          const u = users.find(u => u.id === r.userId);
          if (u) return u.name;
          const w = workers.find(w => w.id === r.userId);
          if (w) return `${w.lastName} ${w.firstName}`;
          return '';
        })();
        const searchStr = `${r.type} ${r.status} ${r.reason} ${userName}`.toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
      });
    }
    return reqs;
  }, [requests, users, workers, searchTerm]);

  const getUserName = (id: string) => {
    const u = users.find(u => u.id === id);
    if (u) return u.name;
    const w = workers.find(w => w.id === id);
    if (w) return `${w.lastName} ${w.firstName}`;
    return 'Unknown';
  };
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <section className="flex-1 flex flex-col h-full bg-white">
      <div className="p-10 border-b border-[#1A1A1A] flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-[#F7F3F0] shrink-0">
        <div>
          <h2 className="text-5xl font-serif italic tracking-tighter">ELENCO ASSENZE</h2>
          <p className="text-xs uppercase tracking-widest opacity-40 mt-2">
            {isManager ? 'All employee leave requests' : 'Your complete leave history'}
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
            <input 
              type="text" 
              placeholder="Cerca assenza..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 pl-9 pr-4 py-3 border border-[#1A1A1A] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
            />
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors rounded-none border border-[#1A1A1A]"
          >
            <Plus className="w-4 h-4" />
            <span className="text-[10px] uppercase font-bold tracking-widest">NUOVA ASSENZA</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white">
        {displayedRequests.map((req) => (
          <div key={req.id} className="p-10 border-b border-[#1A1A1A] flex items-center group">
            <div className="w-12 h-12 rounded-full bg-[#EAE3DC] mr-6 flex items-center justify-center font-serif shrink-0">
              {getInitials(getUserName(req.userId))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1 truncate">{t(req.type as any)}</p>
              <h3 className="text-xl font-bold truncate">
                {getUserName(req.userId)} {req.reason && <span className="text-sm font-normal opacity-50 ml-2">- {req.reason}</span>}
              </h3>
            </div>
            
            <div className="text-center px-12 shrink-0">
              <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Period</p>
              <p className="text-sm font-serif italic whitespace-nowrap">
                {format(parseISO(req.startDate), 'MMM dd')} &mdash; {format(parseISO(req.endDate), 'MMM dd, yyyy')}
              </p>
            </div>
            
            <div className="w-48 text-right flex items-center justify-end">
              {isManager ? (
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      setEditingRequest(req as unknown as LeaveRequest);
                      setShowForm(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 px-4 py-2 border border-[#1A1A1A] text-[10px] uppercase font-bold text-blue-600 hover:bg-blue-50 hover:border-blue-600 transition-all"
                  >
                    Modifica
                  </button>
                  <button 
                    onClick={() => {
                      if (deletingId === req.id) {
                        deleteRequest(req.id);
                        setDeletingId(null);
                      } else {
                        setDeletingId(req.id);
                        // Optional: Reset after 3 seconds
                        setTimeout(() => setDeletingId(null), 3000);
                      }
                    }}
                    className={`px-4 py-2 border text-[10px] uppercase font-bold transition-all ${
                      deletingId === req.id 
                        ? 'bg-red-600 text-white border-red-600' 
                        : 'opacity-0 group-hover:opacity-100 border-[#1A1A1A] text-red-600 hover:bg-red-50 hover:border-red-600'
                    }`}
                  >
                    {deletingId === req.id ? 'Sicuro?' : 'Elimina'}
                  </button>
                  <span className={`text-[10px] uppercase font-bold tracking-widest ${req.status === 'pending' ? 'text-orange-500' : req.status === 'approved' ? 'text-green-600' : 'text-red-500'}`}>
                    {t(req.status as any)}
                  </span>
                </div>
              ) : (
                <span className={`text-[10px] uppercase font-bold tracking-widest ${req.status === 'pending' ? 'text-orange-500' : req.status === 'approved' ? 'text-green-600' : 'text-red-500'}`}>
                  {t(req.status as any)}
                </span>
              )}
            </div>
          </div>
        ))}

        {displayedRequests.length === 0 && (
          <div className="p-10 text-center text-[10px] uppercase tracking-widest opacity-40">
            {t('noRequests')}
          </div>
        )}
      </div>
      
      {showForm && <LeaveForm onClose={() => { setShowForm(false); setEditingRequest(undefined); }} request={editingRequest} />}
    </section>
  );
};
