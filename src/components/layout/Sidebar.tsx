import React, { useState, useMemo } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useAppContext } from '../../store';
import { ChevronDown, ChevronRight, GripVertical, AlertCircle } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar = ({ activeTab, setActiveTab }: SidebarProps) => {
  const { t } = useTranslation();
  const { currentUser, balances, requests, workers, worksites, currentWeekStart, coveredShiftIds } = useAppContext();
  
  const [isBalanceOpen, setIsBalanceOpen] = useState(true);
  const [isUpdatesOpen, setIsUpdatesOpen] = useState(true);
  const [isAssenzeOpen, setIsAssenzeOpen] = useState(true);
  const [isAssenzeListOpen, setIsAssenzeListOpen] = useState(true);

  const userBalance = balances.find(b => b.userId === currentUser.id);

  const dayNames = ['LUNEDI', 'MARTEDI', 'MERCOLEDI', 'GIOVEDI', 'VENERDI', 'SABATO', 'DOMENICA'];
  const dayKeys = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'] as const;

  const absencesThisWeek = useMemo(() => {
    const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
    const weekEndStr = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
    
    return requests
      .filter(req => req.status !== 'rejected')
      .map(req => {
        const worker = workers.find(w => w.id === req.userId);
        return { req, worker };
      })
      .filter(({ req, worker }) => {
        if (!worker) return false;
        if (req.endDate < weekStartStr || req.startDate > weekEndStr) return false;
        return true;
      });
  }, [requests, workers, currentWeekStart]);

  const dynamicDays = useMemo(() => dayNames.map((name, i) => {
    const date = addDays(currentWeekStart, i);
    return {
      date,
      key: dayKeys[i]
    };
  }), [currentWeekStart]);

  const uncoveredShifts = useMemo(() => {
    const shifts: Array<{
      id: string;
      workerName: string;
      worksiteName: string;
      date: Date;
      dayKey: string;
      timeRanges: string;
      ore: string;
    }> = [];

    const weekEnd = addDays(currentWeekStart, 6);

    const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    requests.forEach(req => {
      if (req.status === 'rejected') return;

      const worker = workers.find(w => w.id === req.userId);
      if (!worker) return;

      const assignments = worksites.flatMap(ws => 
        (ws.assignments || [])
          .filter(a => a.workerId === worker.id)
          .map(a => ({ worksite: ws, schedule: a.schedule }))
      );

      const reqStart = parseISO(req.startDate);
      const reqEnd = parseISO(req.endDate);
      
      let currDate = reqStart;
      while (format(currDate, 'yyyy-MM-dd') <= format(reqEnd, 'yyyy-MM-dd')) {
        const dateStr = format(currDate, 'yyyy-MM-dd');
        
        // Only include shifts in the current week view!
        if (dateStr < weekStartStr || dateStr > weekEndStr) {
          currDate = addDays(currDate, 1);
          continue;
        }

        const dKey = dayKeys[currDate.getDay() === 0 ? 6 : currDate.getDay() - 1]; // 0 is Sunday
        
        if (assignments.length > 0) {
           assignments.forEach(assigned => {
             const shiftText = assigned.schedule[dKey] || '';
             
             if (shiftText.trim() !== '') {
                let calculatedOre = '';
                let formattedTimeRanges: string[] = [];
                const regex = /(\d{1,2})(?:[:.](\d{2}))?\s*-\s*(\d{1,2})(?:[:.](\d{2}))?/g;
                let totalHours = 0;
                let match;
                let found = false;
                while ((match = regex.exec(shiftText)) !== null) {
                  found = true;
                  const startH = parseInt(match[1]);
                  const startM = match[2] ? parseInt(match[2]) : 0;
                  const endH = parseInt(match[3]);
                  const endM = match[4] ? parseInt(match[4]) : 0;
                  let diff = (endH + endM / 60) - (startH + startM / 60);
                  if (diff < 0) diff += 24;
                  totalHours += diff;

                  const formattedStartH = startH.toString().padStart(2, '0');
                  const formattedStartM = startM.toString().padStart(2, '0');
                  const formattedEndH = endH.toString().padStart(2, '0');
                  const formattedEndM = endM.toString().padStart(2, '0');
                  formattedTimeRanges.push(`${formattedStartH}:${formattedStartM}-${formattedEndH}:${formattedEndM}`);
                }
                if (found) {
                  calculatedOre = totalHours.toString().replace('.', ',');
                }

                const finalTimeRanges = formattedTimeRanges.length > 0 ? formattedTimeRanges.join('\n') : shiftText;
                
                // Check if it's already covered
                const shiftId = `${req.id}-${assigned.worksite.id}-${dKey}-${dateStr}`;

                shifts.push({
                  id: shiftId,
                  workerName: `${worker.lastName} ${worker.firstName}`,
                  worksiteName: assigned.worksite.name,
                  date: currDate,
                  dayKey: dKey,
                  timeRanges: finalTimeRanges,
                  ore: calculatedOre
                });
             }
           });
        }
        currDate = addDays(currDate, 1);
      }
    });

    return shifts.filter(s => !coveredShiftIds.includes(s.id));
  }, [requests, workers, worksites, currentWeekStart, dynamicDays, coveredShiftIds]);

  const handleExternalCellDragStart = (e: React.DragEvent, shiftId: string, timeRanges: string, worksiteName: string, ore: string, dayKey: string) => {
    const text = `${timeRanges}\n${worksiteName}`;
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'external-cell', id: shiftId, text, ore, dayKey }));
  };

  return (
    <aside className="w-64 border-r border-[#1A1A1A] flex flex-col bg-white shrink-0 hidden md:flex overflow-y-auto">
      <div className="border-b border-[#1A1A1A] bg-white flex flex-col shrink-0">
        <button 
          onClick={() => setIsBalanceOpen(!isBalanceOpen)}
          className="p-8 pb-4 flex justify-between items-center w-full text-left"
        >
          <p className="text-[10px] uppercase tracking-widest opacity-50 m-0">Your Balance</p>
          {isBalanceOpen ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
        </button>
        {isBalanceOpen && (
          <div className="px-8 pb-8">
            {userBalance ? (
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-sm font-serif italic text-gray-900">{t('vacation')}</span>
                    <span className="text-2xl font-light tracking-tighter text-black">{userBalance.vacation} <small className="text-[10px] opacity-40 uppercase">Days</small></span>
                  </div>
                  <div className="w-full h-[2px] bg-[#EAE3DC]"><div className="bg-[#1A1A1A] h-full" style={{ width: `${Math.min((userBalance.vacation / 30) * 100, 100)}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-sm font-serif italic text-gray-900">{t('sick')}</span>
                    <span className="text-2xl font-light tracking-tighter text-black">{userBalance.sick} <small className="text-[10px] opacity-40 uppercase">Days</small></span>
                  </div>
                  <div className="w-full h-[2px] bg-[#EAE3DC]"><div className="bg-[#1A1A1A] h-full" style={{ width: `${Math.min((userBalance.sick / 15) * 100, 100)}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-sm font-serif italic text-gray-900">{t('personal')}</span>
                    <span className="text-2xl font-light tracking-tighter text-black">{userBalance.personal} <small className="text-[10px] opacity-40 uppercase">Days</small></span>
                  </div>
                  <div className="w-full h-[2px] bg-[#EAE3DC]"><div className="bg-[#1A1A1A] h-full" style={{ width: `${Math.min((userBalance.personal / 5) * 100, 100)}%` }}></div></div>
                </div>
              </div>
            ) : (
              <div className="text-xs opacity-50 uppercase tracking-widest">N/A</div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex flex-col shrink-0 border-b border-[#1A1A1A] bg-white">
        <button 
          onClick={() => setIsUpdatesOpen(!isUpdatesOpen)}
          className="p-8 pb-4 flex justify-between items-center w-full text-left"
        >
          <p className="text-[10px] uppercase tracking-widest opacity-50 m-0">Recent Updates</p>
          {isUpdatesOpen ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
        </button>
        {isUpdatesOpen && (
          <div className="px-8 pb-8">
            <div className="space-y-4">
              {requests.slice(0, 3).map((req, i) => (
                <div key={req.id} className={`text-[11px] leading-relaxed ${i > 0 ? 'opacity-50' : ''}`}>
                  <span className="font-bold capitalize">{t(req.status as any)}:</span> Request for {t(req.type as any)} updated.
                </div>
              ))}
              {requests.length === 0 && (
                 <div className="text-[11px] leading-relaxed opacity-50">No recent updates.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {activeTab === 'dashboard' && currentUser?.role === 'manager' && (
      <div className="flex flex-col shrink-0 border-b border-[#1A1A1A] bg-gray-50">
        <button 
          onClick={() => setIsAssenzeListOpen(!isAssenzeListOpen)}
          className="p-8 pb-4 flex justify-between items-center w-full text-left"
        >
          <div className="flex items-center gap-2">
            <p className="text-[10px] uppercase tracking-widest opacity-50 m-0">Assenti in Settimana</p>
            <span className="bg-black text-white px-2 py-0.5 rounded-full text-[9px] font-bold">
              {absencesThisWeek.length}
            </span>
          </div>
          {isAssenzeListOpen ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
        </button>
        {isAssenzeListOpen && (
          <div className="px-8 pb-8 space-y-4 max-h-[300px] overflow-y-auto">
            {absencesThisWeek.length === 0 ? (
              <div className="text-center opacity-50 py-4">
                <p className="text-[10px] uppercase font-bold tracking-widest">Tutti Presenti</p>
              </div>
            ) : (
              absencesThisWeek.map(({ req, worker }) => (
                <div key={`${req.id}-abs`} className="border border-[#1A1A1A] bg-white p-3 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A]">
                    {worker?.lastName} {worker?.firstName}
                  </div>
                  <div className="text-[9px] uppercase opacity-70">
                    Dal {format(parseISO(req.startDate), 'dd/MM')} al {format(parseISO(req.endDate), 'dd/MM')}
                  </div>
                  <div className="text-[10px] bg-gray-100 p-2 inline-block rounded uppercase tracking-widest font-bold">
                    {t(req.type)}
                  </div>
                  {req.status === 'pending' && (
                    <div className="text-[9px] font-bold text-yellow-600 uppercase">Da approvare</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      )}

      {activeTab === 'dashboard' && currentUser?.role === 'manager' && (
      <div className="flex flex-col shrink-0 border-b border-[#1A1A1A] bg-white">
        <button 
          onClick={() => setIsAssenzeOpen(!isAssenzeOpen)}
          className="p-8 pb-4 flex justify-between items-center w-full text-left"
        >
          <div className="flex items-center gap-2">
            <p className="text-[10px] uppercase tracking-widest opacity-50 m-0">Assenze da coprire</p>
            <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px] font-bold">
              {uncoveredShifts.length}
            </span>
          </div>
          {isAssenzeOpen ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
        </button>
        {isAssenzeOpen && (
          <div className="px-8 pb-8 space-y-4">
            <p className="text-[9px] opacity-70 uppercase mb-4">Trascina gli orari nel piano jolly</p>
            {uncoveredShifts.length === 0 ? (
              <div className="text-center opacity-50 py-4">
                <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                <p className="text-[10px] uppercase font-bold tracking-widest">Nessuna assenza<br/>in questa settimana</p>
              </div>
            ) : (
              uncoveredShifts.map(shift => (
                <div 
                  key={shift.id} 
                  className="border border-[#1A1A1A] bg-white p-3 cursor-grab active:cursor-grabbing hover:border-red-500 transition-colors group relative"
                  draggable
                  onDragStart={(e) => handleExternalCellDragStart(e, shift.id, shift.timeRanges, shift.worksiteName, shift.ore, shift.dayKey)}
                  title="Trascina questo turno"
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100">
                    <GripVertical className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-red-600 mb-1">
                    {format(shift.date, 'EEEE dd/MM', { locale: it })}
                  </div>
                  <div className="font-bold text-sm mb-1 uppercase line-clamp-1">{shift.worksiteName}</div>
                  <div className="text-[10px] uppercase opacity-60 mb-2">{shift.workerName}</div>
                  
                  <div className="flex items-center justify-between bg-red-50 p-2 mt-2 border border-red-100 min-h-[32px]">
                    <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-red-800 break-words whitespace-pre-wrap">
                      {shift.timeRanges || <span className="opacity-50">DA COMPILARE</span>}
                    </span>
                    {shift.ore && (
                      <span className="text-[10px] font-bold bg-white text-red-600 px-1 border border-red-200">
                        {shift.ore}h
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      )}
    </aside>
  );
};
