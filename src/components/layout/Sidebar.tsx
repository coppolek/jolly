import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useAppContext } from '../../store';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar = ({ activeTab, setActiveTab }: SidebarProps) => {
  const { t } = useTranslation();
  const { currentUser, balances, requests } = useAppContext();
  
  const userBalance = balances.find(b => b.userId === currentUser.id);

  return (
    <aside className="w-64 border-r border-[#1A1A1A] flex flex-col bg-[#F7F3F0] shrink-0 hidden md:flex">
      <div className="p-8 border-b border-[#1A1A1A] bg-white">
        <p className="text-[10px] uppercase tracking-widest opacity-50 mb-6">Your Balance</p>
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
      
      <div className="flex-1 p-8 flex flex-col justify-between overflow-y-auto">
        <div>
          <p className="text-[10px] uppercase tracking-widest opacity-50 mb-6">Recent Updates</p>
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
      </div>
    </aside>
  );
};
