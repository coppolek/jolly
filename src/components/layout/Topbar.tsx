import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useAppContext } from '../../store';
import clsx from 'clsx';

interface TopbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Topbar = ({ activeTab, setActiveTab }: TopbarProps) => {
  const { t, language } = useTranslation();
  const { currentUser, setLanguage, logout } = useAppContext();

  const navItems = [
    { id: 'dashboard', label: t('dashboard') },
    { id: 'requests', label: t('requests') },
    { id: 'calendar', label: t('calendar') },
  ];

  if (currentUser?.role === 'manager') {
    navItems.push({ id: 'workers', label: language === 'it' ? 'Lavoratori' : 'Workers' });
    navItems.push({ id: 'worksites', label: language === 'it' ? 'Cantieri' : 'Worksites' });
    navItems.push({ id: 'analytics', label: t('analytics') });
  }

  navItems.push({ id: 'settings', label: t('settings') });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <header className="h-24 border-b border-[#1A1A1A] flex items-center justify-between px-10 bg-[#F7F3F0] z-10 shrink-0">
      <div className="flex items-baseline gap-4">
        <h1 className="text-4xl font-serif italic font-bold tracking-tighter">LV<span className="opacity-40">|</span>Pro</h1>
        <span className="text-[10px] uppercase tracking-[0.2em] opacity-60 font-semibold hidden md:inline">Multiservizi Management</span>
      </div>
      
      <div className="flex items-center gap-12">
        <nav className="hidden lg:flex gap-8 text-[11px] uppercase tracking-widest font-bold">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={clsx(
                "transition-opacity",
                item.id === activeTab ? "border-b border-[#1A1A1A]" : "opacity-40 hover:opacity-100"
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setLanguage(language === 'en' ? 'it' : 'en')}
            className="text-[10px] uppercase tracking-widest font-bold opacity-60 hover:opacity-100 transition-opacity"
          >
            {language}
          </button>

          <div className="flex items-center gap-4 border-l border-[#1A1A1A] pl-6">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold uppercase tracking-tight">{currentUser?.name}</p>
              <p className="text-[10px] opacity-50 uppercase tracking-widest">{t(currentUser?.role as any)}</p>
            </div>
            <div className="w-10 h-10 rounded-full border border-[#1A1A1A] bg-white flex items-center justify-center font-serif italic text-lg cursor-pointer" onClick={logout} title="Logout">
              {getInitials(currentUser?.name || 'A')}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
