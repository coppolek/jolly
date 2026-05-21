import React, { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useAppContext } from '../../store';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isToday, parseISO, isWithinInterval } from 'date-fns';
import clsx from 'clsx';

export const CalendarView = () => {
  const { t } = useTranslation();
  const { requests, currentUser } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const displayedRequests = requests.filter(r => 
    (currentUser.role === 'manager' && r.status === 'approved') ||
    (currentUser.role === 'employee' && r.userId === currentUser.id)
  );

  const getDayStatus = (date: Date) => {
    for (const req of displayedRequests) {
      const start = parseISO(req.startDate);
      const end = parseISO(req.endDate);
      if (isWithinInterval(date, { start, end })) {
        if (req.status === 'pending') return 'pending';
        if (req.status === 'approved') return 'approved';
      }
    }
    return null;
  };

  return (
    <section className="flex-1 flex flex-col h-full bg-[#F7F3F0]">
      <div className="p-10 border-b border-[#1A1A1A] flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-5xl font-serif italic tracking-tighter">{t('calendar')}</h2>
          <p className="text-xs uppercase tracking-widest opacity-40 mt-2">Team Availability Overview</p>
        </div>
        <div className="flex gap-4 items-center">
          <button onClick={prevMonth} className="px-4 py-2 border border-[#1A1A1A] text-[10px] uppercase font-bold hover:bg-[#1A1A1A] hover:text-[#F7F3F0] transition-colors">Prev</button>
          <span className="text-sm font-serif italic min-w-[120px] text-center">{format(currentDate, 'MMMM yyyy')}</span>
          <button onClick={nextMonth} className="px-4 py-2 border border-[#1A1A1A] text-[10px] uppercase font-bold hover:bg-[#1A1A1A] hover:text-[#F7F3F0] transition-colors">Next</button>
        </div>
      </div>

      <div className="flex-1 px-10 py-10 overflow-auto bg-white flex justify-center">
        <div className="w-full max-w-4xl border border-[#1A1A1A] bg-[#F7F3F0]">
          <div className="grid grid-cols-7 border-b border-[#1A1A1A]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
              <div key={day} className={`py-4 text-center text-[10px] uppercase tracking-widest font-bold opacity-60 ${i < 6 ? 'border-r border-[#1A1A1A]' : ''}`}>
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-[120px]">
            {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
              <div key={`pad-${i}`} className="border-r border-b border-[#1A1A1A] bg-[#EAE3DC] opacity-20"></div>
            ))}
            
            {daysInMonth.map((day, i) => {
              const status = getDayStatus(day);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const isColEnd = (startOfMonth(currentDate).getDay() + i + 1) % 7 === 0;

              return (
                <div 
                  key={day.toString()} 
                  className={clsx(
                    "p-3 flex flex-col border-b border-[#1A1A1A]",
                    !isColEnd && "border-r",
                    !isSameMonth(day, currentDate) && "opacity-20 bg-[#EAE3DC]",
                    status === 'approved' && "bg-[#1A1A1A] text-[#F7F3F0]",
                    status === 'pending' && "bg-[#EAE3DC]"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={clsx(
                      "text-sm font-bold",
                      isToday(day) && status !== 'approved' && "bg-[#1A1A1A] text-[#F7F3F0] px-2 py-0.5"
                    )}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  
                  {status === 'approved' && (
                    <div className="mt-auto overflow-hidden">
                      <span className="block text-[10px] uppercase tracking-widest font-bold opacity-80 truncate">
                        {currentUser.role === 'manager' ? 'Staff on leave' : 'Approved Leave'}
                      </span>
                    </div>
                  )}
                  {status === 'pending' && (
                    <div className="mt-auto overflow-hidden">
                      <span className="block text-[10px] uppercase tracking-widest font-bold opacity-60 truncate">
                        Pending
                      </span>
                    </div>
                  )}
                  {!status && isWeekend && (
                    <div className="mt-auto">
                      <span className="block text-[10px] uppercase tracking-widest font-bold text-red-600 opacity-60">Weekend</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
