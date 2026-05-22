import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useAppContext } from '../../store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const AnalyticsView = () => {
  const { t } = useTranslation();
  const { requests } = useAppContext();

  const typeData = [
    { name: t('vacation'), value: requests.filter(r => r.type === 'vacation').length },
    { name: t('sick'), value: requests.filter(r => r.type === 'sick').length },
    { name: t('personal'), value: requests.filter(r => r.type === 'personal').length },
  ];

  const COLORS = ['#1A1A1A', '#8c8c8c', '#EAE3DC'];

  const monthlyLeaves = [
    { name: 'Jan', count: 4 },
    { name: 'Feb', count: 3 },
    { name: 'Mar', count: 5 },
    { name: 'Apr', count: 2 },
    { name: 'May', count: requests.length },
    { name: 'Jun', count: 8 },
  ];

  return (
    <section className="flex-1 flex flex-col h-full bg-white">
      <div className="p-10 border-b border-[#1A1A1A] flex justify-between items-end bg-[white] shrink-0">
        <div>
          <h2 className="text-5xl font-serif italic tracking-tighter">{t('analytics')}</h2>
          <p className="text-xs uppercase tracking-widest opacity-40 mt-2">Data Insights & Trends</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="border border-[#1A1A1A] flex flex-col bg-[white]">
          <div className="p-6 border-b border-[#1A1A1A] bg-white">
            <h2 className="text-xl font-serif italic tracking-tight">Leave Distribution</h2>
          </div>
          <div className="h-[300px] w-full p-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '0px', border: '1px solid #1A1A1A', backgroundColor: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-[#1A1A1A] flex flex-col bg-[white]">
          <div className="p-6 border-b border-[#1A1A1A] bg-white">
            <h2 className="text-xl font-serif italic tracking-tight">Monthly Trends</h2>
          </div>
          <div className="h-[300px] w-full p-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyLeaves}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE3DC" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#1A1A1A', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#1A1A1A', fontSize: 10}} />
                <Tooltip cursor={{fill: '#EAE3DC'}} contentStyle={{ borderRadius: '0px', border: '1px solid #1A1A1A', backgroundColor: '#fff' }} />
                <Bar dataKey="count" fill="#1A1A1A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
};
