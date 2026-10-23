"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Music, 
  Calendar, 
  Bell, 
  ArrowRight, 
  TrendingUp,
  CheckCircle,
  FileText,
  ChevronRight,
  Activity,
  Clock
} from 'lucide-react';
import { BackendAPI } from '@/lib/api-client';
import { useZone } from '@/hooks/useZone';
import { useAuth } from '@/hooks/useAuth';

interface SubGroupDashboardProps {
  subGroup: any;
  onNavigate: (section: string) => void;
}

// Greeting logic
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function SubGroupDashboard({ subGroup, onNavigate }: SubGroupDashboardProps) {
  const { currentZone } = useZone();
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    memberCount: 0,
    songCount: 0,
    rehearsalCount: 0,
    recentMembers: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  const themeColor = currentZone?.themeColor || '#9333ea';
  const firstName = profile?.first_name || 'Admin';

  useEffect(() => {
    if (!subGroup?.id) return;

    setLoading(true);

    const loadAll = async () => {
      try {
        const [membersRes, songsRes, rehearsalsRes]: any = await Promise.all([
          BackendAPI.subgroups.members(subGroup.id),
          BackendAPI.subgroups.songs({ subGroupId: subGroup.id }),
          BackendAPI.subgroups.praiseNights({ subGroupId: subGroup.id })
        ]);
        const members = Array.isArray(membersRes) ? membersRes : (membersRes?.data || []);
        const songs = Array.isArray(songsRes) ? songsRes : (songsRes?.data || []);
        const rehearsals = Array.isArray(rehearsalsRes) ? rehearsalsRes : (rehearsalsRes?.data || []);
        setStats({
          memberCount: members.length,
          recentMembers: members.slice(0, 5),
          songCount: songs.length,
          rehearsalCount: rehearsals.length
        });
      } catch (error) {
        console.error('Error fetching subgroup dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAll();

    const unsubSongs = BackendAPI.realtime.subscribe('subgroup_songs', subGroup.id, () => loadAll());
    const unsubRehearsals = BackendAPI.realtime.subscribe('praise_nights', subGroup.id, () => loadAll());

    return () => {
      unsubSongs();
      unsubRehearsals();
    };
  }, [subGroup?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Greeting Banner - Matching Main Admin */}
      <div className="px-1">
        <h1 className="text-xl lg:text-3xl font-bold text-gray-900 tracking-tight">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-[12px] text-gray-500 mt-1 flex items-center gap-1.5">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: themeColor }}
          />
          {subGroup?.name}
        </p>
      </div>

      {/* Statistics - Matching Main Admin Style */}
      <div className="px-1">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Overview</p>
        <div className="flex lg:grid lg:grid-cols-4 gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:overflow-visible snap-x snap-mandatory scrollbar-hide">
          <StatCard icon={Users} label="Members" value={stats.memberCount} color="blue" />
          <StatCard icon={Music} label="Songs" value={stats.songCount} color="purple" themeColor={themeColor} />
          <StatCard icon={Calendar} label="Setlists" value={stats.rehearsalCount} color="emerald" />
          <StatCard icon={Activity} label="Status" value="Active" color="orange" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-8 space-y-5 px-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Quick Actions</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ActionTile 
              icon={Music} 
              title="Songs" 
              desc="Manage your song library" 
              onClick={() => onNavigate('Songs')}
              color="purple"
              themeColor={themeColor}
            />
            <ActionTile 
              icon={Users} 
              title="Members" 
              desc="Manage group personnel" 
              onClick={() => onNavigate('Members')}
              color="blue"
            />
            <ActionTile 
              icon={Bell} 
              title="Notifications" 
              desc="Send messages to the team" 
              onClick={() => onNavigate('Notifications')}
              color="orange"
            />
          </div>
        </div>

        <div className="lg:col-span-4 space-y-5 px-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Recent Members</p>
            <button 
              onClick={() => onNavigate('Members')}
              className="text-[10px] font-bold text-purple-600 uppercase tracking-widest hover:underline"
            >
              See All
            </button>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
             {stats.recentMembers.length === 0 ? (
               <div className="p-8 text-center text-gray-400">
                 <p className="text-[11px] font-black uppercase tracking-widest">No members yet</p>
               </div>
             ) : (
               stats.recentMembers.map((member) => (
                 <div key={member.id} className="flex items-center gap-3.5 p-4 hover:bg-gray-50 transition-colors">
                   <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center font-bold text-gray-500 text-sm shadow-sm">
                     {(member.first_name || member.name || 'U').charAt(0).toUpperCase()}
                   </div>
                   <div className="min-w-0 flex-1">
                     <p className="text-sm font-semibold text-gray-900 truncate">
                       {member.first_name ? `${member.first_name} ${member.last_name || ''}` : member.name}
                     </p>
                     <p className="text-[11px] text-gray-400 truncate mt-0.5">{member.email}</p>
                   </div>
                   <Clock className="w-3.5 h-3.5 text-gray-300" />
                 </div>
               ))
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, themeColor }: any) {
  const colors: any = {
    blue: 'border-l-blue-500',
    purple: 'border-l-purple-500',
    emerald: 'border-l-emerald-500',
    orange: 'border-l-orange-500'
  };

  const iconBg: any = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  const borderStyle = color === 'purple' && themeColor 
    ? { borderLeftWidth: '3px', borderLeftColor: themeColor } 
    : {};

  const iconStyle = color === 'purple' && themeColor 
    ? { backgroundColor: `${themeColor}10`, color: themeColor } 
    : {};

  return (
    <div 
      className={`flex-shrink-0 w-[155px] lg:w-auto bg-white rounded-2xl p-4 border border-gray-100 shadow-sm transition-all hover:shadow-md snap-start ${!themeColor && colors[color]} ${!themeColor && 'border-l-[3px]'}`}
      style={borderStyle}
    >
      <div className="flex items-center justify-between mb-3">
        <div 
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${!themeColor && iconBg[color]}`}
          style={iconStyle}
        >
          <Icon className="w-5 h-5" />
        </div>
        <TrendingUp className="w-4 h-4 text-green-500 opacity-50" />
      </div>
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function ActionTile({ icon: Icon, title, desc, onClick, color, themeColor }: any) {
  const iconBg: any = {
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
    orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white',
    emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'
  };

  const iconStyle = color === 'purple' && themeColor 
    ? { backgroundColor: `${themeColor}10`, color: themeColor } 
    : {};

  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:border-gray-300 hover:shadow-md transition-all text-left group active:scale-[0.98]"
    >
      <div 
        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 shadow-sm ${!themeColor && iconBg[color]}`}
        style={iconStyle}
      >
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="font-bold text-gray-900 text-sm">{title}</h4>
        <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{desc}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 ml-auto group-hover:translate-x-1 transition-transform" />
    </button>
  );
}
