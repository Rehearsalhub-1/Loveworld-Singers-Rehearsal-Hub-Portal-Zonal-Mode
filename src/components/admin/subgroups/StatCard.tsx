import React from 'react';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'purple' | 'green' | 'blue' | 'orange';
  pulse?: boolean;
}

export function StatCard({
  label,
  value,
  icon,
  color,
  pulse
}: StatCardProps) {
  const colors = {
    purple: 'border-purple-500 bg-purple-50/30 text-purple-600',
    green: 'border-emerald-500 bg-emerald-50/30 text-emerald-600',
    blue: 'border-blue-500 bg-blue-50/30 text-blue-600',
    orange: 'border-orange-500 bg-orange-50/30 text-orange-600'
  };

  const iconColors = {
    purple: 'bg-purple-600 text-white shadow-purple-100',
    green: 'bg-emerald-600 text-white shadow-emerald-100',
    blue: 'bg-blue-600 text-white shadow-blue-100',
    orange: 'bg-orange-600 text-white shadow-orange-100'
  };

  return (
    <div className={`flex-shrink-0 w-[160px] lg:w-auto lg:flex-1 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm transition-all hover:shadow-md border-l-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${iconColors[color]}`}>
          {icon}
        </div>
        {pulse && (
          <div className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
          </div>
        )}
      </div>
      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.1em] mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-3xl font-black text-slate-900">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}
