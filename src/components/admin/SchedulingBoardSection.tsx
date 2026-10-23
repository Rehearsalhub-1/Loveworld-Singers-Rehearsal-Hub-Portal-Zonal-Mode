"use client";

import React, { useState } from 'react';
import { Loader2, Plus, Clock, Archive, ArrowLeft, Trash2, Edit2, Check, Coffee, Hourglass, Star } from 'lucide-react';
import { useSchedulingBoard } from '@/hooks/useSchedulingBoard';

const TABS = [
  { id: 'schedule', label: 'Daily Schedule' },
  { id: 'new', label: 'New Songs' },
  { id: 'carried', label: 'Carried Over' },
  { id: 'swapped', label: 'Swapped' },
  { id: 'renamed', label: 'Name Changes' },
  { id: 'invalid', label: 'Invalid' },
  { id: 'eligibility', label: 'Eligibility' },
];

export default function SchedulingBoardSection() {
  const {
    loading, canEdit, viewHistory, setViewHistory,
    programs, activeProgramId, setActiveProgramId, activeProgram,
    createProgram, updateProgramData, toggleArchive, deleteActiveProgram, renameActiveProgram, setCurrentProgram, currentZone
  } = useSchedulingBoard();

  const [activeTab, setActiveTab] = useState('schedule');
  const [showCreateProg, setShowCreateProg] = useState(false);
  const [newProgName, setNewProgName] = useState('');

  const [showEditProg, setShowEditProg] = useState(false);
  const [editProgName, setEditProgName] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [selectedWeekId, setSelectedWeekId] = useState<string>('default_week_1');
  const [selectedDayId, setSelectedDayId] = useState<string>('default_day_1');
  const [eligibilityFilter, setEligibilityFilter] = useState<'eligible' | 'ineligible'>('eligible');

  const rawWeeks = activeProgram?.weeks || [
    { id: 'default_week_1', name: 'Week 1' }
  ];

  const rawDays = activeProgram?.days || [
    { id: 'default_day_1', weekId: 'default_week_1', name: 'Day 1' }
  ];

  // Sort Current active week first
  const weeks = [...rawWeeks].sort((a, b) => {
    if (activeProgram?.currentWeekId === a.id) return -1;
    if (activeProgram?.currentWeekId === b.id) return 1;
    return 0;
  });

  // Sort Current active day first
  const days = [...rawDays].sort((a, b) => {
    if (activeProgram?.currentDayId === a.id) return -1;
    if (activeProgram?.currentDayId === b.id) return 1;
    return 0;
  });

  React.useEffect(() => {
    if (weeks.length > 0) {
      const exists = weeks.some((w: any) => w.id === selectedWeekId);
      if (!exists) {
        setSelectedWeekId(weeks[0].id);
      }
    }
  }, [weeks, selectedWeekId]);

  React.useEffect(() => {
    const weekDays = days.filter((d: any) => d.weekId === selectedWeekId);
    if (weekDays.length > 0) {
      const exists = weekDays.some((d: any) => d.id === selectedDayId);
      if (!exists) {
        setSelectedDayId(weekDays[0].id);
      }
    } else {
      setSelectedDayId('');
    }
  }, [days, selectedWeekId, selectedDayId]);

  React.useEffect(() => {
    if (activeProgram) {
      const defaultWeek = activeProgram.currentWeekId || activeProgram.weeks?.[0]?.id || 'default_week_1';
      setSelectedWeekId(defaultWeek);
      
      const weekDays = (activeProgram.days || []).filter((d: any) => d.weekId === defaultWeek);
      const defaultDay = activeProgram.currentDayId && weekDays.some((d: any) => d.id === activeProgram.currentDayId)
        ? activeProgram.currentDayId
        : (weekDays[0]?.id || 'default_day_1');
      setSelectedDayId(defaultDay);
    }
  }, [activeProgramId]);

  const handleAddWeek = () => {
    const name = prompt("Enter Week Name:", `Week ${weeks.length + 1}`);
    if (!name || !name.trim()) return;
    const newWeek = { id: `week_${Date.now()}`, name: name.trim() };
    const updatedWeeks = [...(activeProgram?.weeks || [{ id: 'default_week_1', name: 'Week 1' }]), newWeek];
    updateProgramData({ weeks: updatedWeeks });
    setSelectedWeekId(newWeek.id);
  };

  const handleRenameWeek = (week: { id: string; name: string }) => {
    const name = prompt("Rename Week:", week.name);
    if (!name || !name.trim()) return;
    const updatedWeeks = (activeProgram?.weeks || [{ id: 'default_week_1', name: 'Week 1' }]).map((w: any) => 
      w.id === week.id ? { ...w, name: name.trim() } : w
    );
    updateProgramData({ weeks: updatedWeeks });
  };

  const handleDeleteWeek = (weekId: string) => {
    if (!confirm("Are you sure you want to delete this week? All days and schedule items under this week will also be deleted.")) return;
    const updatedWeeks = (activeProgram?.weeks || []).filter((w: any) => w.id !== weekId);
    const updatedDays = (activeProgram?.days || []).filter((d: any) => d.weekId !== weekId);
    const updatedSchedules = (activeProgram?.dailySchedules || []).filter((s: any) => (s.weekId || 'default_week_1') !== weekId);
    updateProgramData({
      weeks: updatedWeeks,
      days: updatedDays,
      dailySchedules: updatedSchedules
    });
  };

  const handleAddDay = () => {
    const currentDays = days.filter((d: any) => d.weekId === selectedWeekId);
    const name = prompt("Enter Day Name:", `Day ${currentDays.length + 1}`);
    if (!name || !name.trim()) return;
    const newDay = { id: `day_${Date.now()}`, weekId: selectedWeekId, name: name.trim() };
    const updatedDays = [...(activeProgram?.days || [{ id: 'default_day_1', weekId: 'default_week_1', name: 'Day 1' }]), newDay];
    updateProgramData({ days: updatedDays });
    setSelectedDayId(newDay.id);
  };

  const handleRenameDay = (day: { id: string; name: string }) => {
    const name = prompt("Rename Day:", day.name);
    if (!name || !name.trim()) return;
    const updatedDays = (activeProgram?.days || []).map((d: any) => 
      d.id === day.id ? { ...d, name: name.trim() } : d
    );
    updateProgramData({ days: updatedDays });
  };

  const handleDeleteDay = (dayId: string) => {
    if (!confirm("Are you sure you want to delete this day? All schedule items under this day will also be deleted.")) return;
    const updatedDays = (activeProgram?.days || []).filter((d: any) => d.id !== dayId);
    const updatedSchedules = (activeProgram?.dailySchedules || []).filter((s: any) => (s.dayId || 'default_day_1') !== dayId);
    updateProgramData({
      days: updatedDays,
      dailySchedules: updatedSchedules
    });
  };

  const themeColor = currentZone?.themeColor || '#9333ea';

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;
  }

  const getArrayNameForTab = (tab: string) => {
    switch(tab) {
      case 'schedule': return 'dailySchedules';
      case 'new': return 'newSongs';
      case 'carried': return 'carriedOver';
      case 'swapped': return 'swapped';
      case 'renamed': return 'nameChanges';
      case 'invalid': return 'invalidSongs';
      case 'eligibility': return 'submitters';
      default: return '';
    }
  };

  const handleSaveItem = async () => {
    if (!activeProgram) return;
    const arrayName = getArrayNameForTab(activeTab);
    const currentArray = (activeProgram as any)[arrayName] || [];
    
    let updatedArray;
    if (editingItemId) {
      updatedArray = currentArray.map((i: any) => i.id === editingItemId ? { 
        ...i, 
        ...formData,
        weekId: activeTab === 'schedule' ? (formData.weekId || i.weekId || selectedWeekId || 'default_week_1') : undefined,
        dayId: activeTab === 'schedule' ? (formData.dayId || i.dayId || selectedDayId || 'default_day_1') : undefined
      } : i);
    } else {
      const newItem = { 
        id: Date.now().toString(), 
        ...formData,
        weekId: activeTab === 'schedule' ? (formData.weekId || selectedWeekId || 'default_week_1') : undefined,
        dayId: activeTab === 'schedule' ? (formData.dayId || selectedDayId || 'default_day_1') : undefined
      };
      updatedArray = [...currentArray, newItem];
    }
    
    await updateProgramData({ [arrayName]: updatedArray });
    setShowAddModal(false);
    setFormData({});
    setEditingItemId(null);
  };

  const handleDeleteItem = async (itemId: string, arrayName: string) => {
    if (!activeProgram || !confirm('Delete this item?')) return;
    const currentArray = (activeProgram as any)[arrayName] || [];
    await updateProgramData({ [arrayName]: currentArray.filter((i: any) => i.id !== itemId) });
  };

  const renderAddForm = () => {
    if (activeTab === 'schedule') return (
      <>
        <div className="flex flex-col sm:flex-row gap-4">
          <input className="flex-1 p-2 border rounded" placeholder="Time (e.g. 09:00)" value={formData.time || ''} onChange={e=>setFormData({...formData, time: e.target.value})} />
          <input className="flex-[2] p-2 border rounded" placeholder="Song/Event Title" value={formData.title || ''} onChange={e=>setFormData({...formData, title: e.target.value})} />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <input className="flex-1 p-2 border rounded outline-none focus:ring-1 focus:ring-purple-500" placeholder="Key (e.g. Bb)" value={formData.key || ''} onChange={e=>setFormData({...formData, key: e.target.value})} />
          <input className="flex-1 p-2 border rounded outline-none focus:ring-1 focus:ring-purple-500" type="number" placeholder="Mins (e.g. 20)" value={formData.allotment || ''} onChange={e=>setFormData({...formData, allotment: parseInt(e.target.value) || 0})} />
        </div>
        <div className="flex flex-col mt-4">
          <label className="text-xs font-bold text-slate-500 mb-1">Status</label>
          <select className="p-2 border rounded w-full outline-none focus:ring-1 focus:ring-purple-500 bg-white" value={formData.status || 'not-rehearsed'} onChange={e=>setFormData({...formData, status: e.target.value})}>
            <option value="not-rehearsed">Pending</option>
            <option value="rehearsed">Rehearsed</option>
            <option value="break">Break</option>
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1 flex flex-col">
            <label className="text-xs font-bold text-slate-500 mb-1">Week</label>
            <select 
              className="p-2 border rounded w-full outline-none focus:ring-1 focus:ring-purple-500" 
              value={formData.weekId || selectedWeekId || 'default_week_1'} 
              onChange={e => {
                const wId = e.target.value;
                const weekDays = days.filter((d: any) => d.weekId === wId);
                const firstDayId = weekDays.length > 0 ? weekDays[0].id : '';
                setFormData({ ...formData, weekId: wId, dayId: firstDayId });
              }}
            >
              {weeks.map((w: any) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 flex flex-col">
            <label className="text-xs font-bold text-slate-500 mb-1">Day</label>
            <select 
              className="p-2 border rounded w-full outline-none focus:ring-1 focus:ring-purple-500" 
              value={formData.dayId || selectedDayId || 'default_day_1'} 
              onChange={e => setFormData({ ...formData, dayId: e.target.value })}
            >
              {days.filter((d: any) => d.weekId === (formData.weekId || selectedWeekId || 'default_week_1')).map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
        <input className="w-full mt-4 p-2 border rounded" placeholder="Notes (Optional)" value={formData.note || ''} onChange={e=>setFormData({...formData, note: e.target.value})} />
      </>
    );

    if (activeTab === 'new') return (
      <>
        <input className="w-full mb-4 p-2 border rounded" placeholder="Song Title" value={formData.title || ''} onChange={e=>setFormData({...formData, title: e.target.value})} />
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <input className="flex-1 p-2 border rounded" placeholder="Key" value={formData.key || ''} onChange={e=>setFormData({...formData, key: e.target.value})} />
          <input className="flex-1 p-2 border rounded" placeholder="Duration (e.g. 4:20)" value={formData.duration || ''} onChange={e=>setFormData({...formData, duration: e.target.value})} />
        </div>
        <input className="w-full mb-4 p-2 border rounded" placeholder="Submitted By" value={formData.submittedBy || ''} onChange={e=>setFormData({...formData, submittedBy: e.target.value})} />
        <input className="w-full p-2 border rounded" type="date" value={formData.submittedOn || new Date().toISOString().split('T')[0]} onChange={e=>setFormData({...formData, submittedOn: e.target.value})} />
      </>
    );

    if (activeTab === 'carried') return (
      <>
        <input className="w-full mb-4 p-2 border rounded" placeholder="Song Title" value={formData.title || ''} onChange={e=>setFormData({...formData, title: e.target.value})} />
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <input className="flex-1 p-2 border rounded outline-none focus:ring-1 focus:ring-purple-500" placeholder="Key" value={formData.key || ''} onChange={e=>setFormData({...formData, key: e.target.value})} />
          <input className="flex-1 p-2 border rounded outline-none focus:ring-1 focus:ring-purple-500" placeholder="From Program" value={formData.originalProgram || ''} onChange={e=>setFormData({...formData, originalProgram: e.target.value})} />
        </div>
        <div className="flex flex-col mb-4">
          <label className="text-xs font-bold text-slate-500 mb-1">Prior Rehearsals</label>
          <input className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-purple-500" type="number" placeholder="Prior Rehearsals" value={formData.rehearsalCount || 1} onChange={e=>setFormData({...formData, rehearsalCount: parseInt(e.target.value) || 1})} />
        </div>
        <input className="w-full p-2 border rounded" placeholder="Reason for carry over" value={formData.reason || ''} onChange={e=>setFormData({...formData, reason: e.target.value})} />
      </>
    );

    if (activeTab === 'swapped') return (
      <>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <input className="flex-1 p-2 border rounded" placeholder="Original Song" value={formData.original || ''} onChange={e=>setFormData({...formData, original: e.target.value})} />
          <input className="flex-1 p-2 border rounded" placeholder="Replacement Song" value={formData.replacement || ''} onChange={e=>setFormData({...formData, replacement: e.target.value})} />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <input className="flex-1 p-2 border rounded" placeholder="Swapped By" value={formData.swappedBy || ''} onChange={e=>setFormData({...formData, swappedBy: e.target.value})} />
          <input className="flex-1 p-2 border rounded" type="date" value={formData.swappedOn || new Date().toISOString().split('T')[0]} onChange={e=>setFormData({...formData, swappedOn: e.target.value})} />
        </div>
        <input className="w-full p-2 border rounded" placeholder="Reason" value={formData.reason || ''} onChange={e=>setFormData({...formData, reason: e.target.value})} />
      </>
    );

    if (activeTab === 'renamed') return (
      <>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <input className="flex-1 p-2 border rounded" placeholder="Old Name" value={formData.from || ''} onChange={e=>setFormData({...formData, from: e.target.value})} />
          <input className="flex-1 p-2 border rounded" placeholder="New Name" value={formData.to || ''} onChange={e=>setFormData({...formData, to: e.target.value})} />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <input className="flex-1 p-2 border rounded" placeholder="Changed By" value={formData.changedBy || ''} onChange={e=>setFormData({...formData, changedBy: e.target.value})} />
          <input className="flex-1 p-2 border rounded" type="date" value={formData.changedOn || new Date().toISOString().split('T')[0]} onChange={e=>setFormData({...formData, changedOn: e.target.value})} />
        </div>
        <input className="w-full p-2 border rounded" placeholder="Reason" value={formData.reason || ''} onChange={e=>setFormData({...formData, reason: e.target.value})} />
      </>
    );

    if (activeTab === 'invalid') return (
      <>
        <input className="w-full mb-4 p-2 border rounded" placeholder="Song Title" value={formData.title || ''} onChange={e=>setFormData({...formData, title: e.target.value})} />
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <select className="flex-1 p-2 border rounded" value={formData.invalidatedBy || 'Swap'} onChange={e=>setFormData({...formData, invalidatedBy: e.target.value})}>
            <option value="Swap">Swap</option>
            <option value="Director">Director</option>
            <option value="Licensing">Licensing</option>
          </select>
          <input className="flex-1 p-2 border rounded" placeholder="Replaced By (Optional)" value={formData.replacedBy || ''} onChange={e=>setFormData({...formData, replacedBy: e.target.value})} />
        </div>
        <input className="w-full p-2 border rounded" type="date" value={formData.date || new Date().toISOString().split('T')[0]} onChange={e=>setFormData({...formData, date: e.target.value})} />
      </>
    );

    if (activeTab === 'eligibility') return (
      <>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <input className="flex-[2] p-2 border rounded" placeholder="Name" value={formData.name || ''} onChange={e=>setFormData({...formData, name: e.target.value})} />
          <input className="flex-1 p-2 border rounded" placeholder="Role" value={formData.role || ''} onChange={e=>setFormData({...formData, role: e.target.value})} />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <input className="flex-1 p-2 border rounded" type="number" placeholder="Quota" value={formData.quota || 2} onChange={e=>setFormData({...formData, quota: parseInt(e.target.value) || 2})} />
          <input className="flex-1 p-2 border rounded" type="number" placeholder="Used" value={formData.submissions || 0} onChange={e=>setFormData({...formData, submissions: parseInt(e.target.value) || 0})} />
        </div>
        <div className="p-4 border rounded bg-slate-50 mb-4">
          <label className="flex items-center gap-2 font-bold mb-2">
            <input type="checkbox" checked={formData.isBlocked || false} onChange={e=>setFormData({...formData, isBlocked: e.target.checked})} />
            Mark as Ineligible
          </label>
          {formData.isBlocked && (
            <>
              <input className="w-full mb-2 p-2 border rounded" placeholder="Reason" value={formData.reason || ''} onChange={e=>setFormData({...formData, reason: e.target.value})} />
              <input className="w-full p-2 border rounded" type="date" value={formData.since || new Date().toISOString().split('T')[0]} onChange={e=>setFormData({...formData, since: e.target.value})} />
            </>
          )}
        </div>
      </>
    );

    return null;
  };

  const renderDataList = () => {
    if (!activeProgram) return null;
    const arrayName = getArrayNameForTab(activeTab);
    const data = (activeProgram as any)[arrayName] || [];

    const filteredData = activeTab === 'schedule'
      ? data.filter((item: any) => {
          const itemWeekId = item.weekId || 'default_week_1';
          const itemDayId = item.dayId || 'default_day_1';
          return itemWeekId === selectedWeekId && itemDayId === selectedDayId;
        })
      : activeTab === 'eligibility'
      ? data.filter((item: any) => eligibilityFilter === 'eligible' ? !item.isBlocked : item.isBlocked)
      : data;

    if (filteredData.length === 0) {
      return (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <Clock className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">No {TABS.find(t=>t.id === activeTab)?.label.toLowerCase()} yet</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            {activeTab === 'schedule'
              ? 'No items have been scheduled for this week and day yet. Click "Add Item" to add one.'
              : 'Click the "Add Item" button above to start adding records to this section.'}
          </p>
        </div>
      );
    }

    const showStats = activeTab === 'schedule';
    const rehearsedCount = filteredData.filter((i: any) => i.status === 'rehearsed').length;
    const pendingCount = filteredData.filter((i: any) => i.status === 'not-rehearsed' || !i.status).length;
    const breakCount = filteredData.filter((i: any) => i.status === 'break').length;
    const totalMins = filteredData.filter((i: any) => i.status !== 'break').reduce((a: number, s: any) => a + (parseInt(s.allotment) || 0), 0);

    return (
      <div className="space-y-6">
        {showStats && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100 shrink-0">
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Rehearsed</span>
                <span className="text-xl font-extrabold text-slate-800 leading-none">{rehearsedCount}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center border border-rose-100 shrink-0">
                <Clock className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Pending</span>
                <span className="text-xl font-extrabold text-slate-800 leading-none">{pendingCount}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100 shrink-0">
                <Coffee className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Breaks</span>
                <span className="text-xl font-extrabold text-slate-800 leading-none">{breakCount}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100 shrink-0">
                <Hourglass className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Duration</span>
                <span className="text-xl font-extrabold text-slate-800 leading-none">{totalMins} mins</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {filteredData.map((item: any) => (
          <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-sm hover:border-slate-300 transition-colors">
            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 mb-1">
                {item.time && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-md border border-slate-200">
                    {item.time}
                  </span>
                )}
                <h4 className="font-bold text-slate-800 text-lg">
                  {item.title || item.original || item.from || item.name}
                  {item.replacement && <span className="text-emerald-600 ml-2">→ {item.replacement}</span>}
                  {item.to && <span className="text-purple-600 ml-2">→ {item.to}</span>}
                </h4>
              </div>

              <div className="flex flex-wrap gap-2 mt-2 items-center">
                {item.status && (
                  <button 
                    onClick={() => {
                      if (canEdit && !viewHistory) {
                        const currentStatus = item.status || 'not-rehearsed';
                        const newStatus = 
                          currentStatus === 'not-rehearsed' ? 'rehearsed' :
                          currentStatus === 'rehearsed' ? 'break' :
                          'not-rehearsed';
                        const currentArray = (activeProgram as any)[arrayName] || [];
                        const updatedArray = currentArray.map((i: any) => i.id === item.id ? { ...i, status: newStatus } : i);
                        updateProgramData({ [arrayName]: updatedArray });
                      }
                    }}
                    disabled={!canEdit || viewHistory}
                    title="Click to toggle status (Pending → Rehearsed → Break)"
                    className={`px-2 py-0.5 text-xs font-bold rounded-full transition-transform active:scale-95 ${
                      item.status === 'rehearsed' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
                      item.status === 'break' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' :
                      'bg-rose-100 text-rose-700 hover:bg-rose-200'
                    } ${canEdit && !viewHistory ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    {item.status === 'rehearsed' ? 'REHEARSED' : item.status === 'break' ? 'BREAK' : 'PENDING'}
                  </button>
                )}
                {item.key && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 font-bold text-xs rounded-full">
                    Key: {item.key}
                  </span>
                )}
                {item.allotment && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-bold text-xs rounded-full">
                    {item.allotment} mins
                  </span>
                )}
                {item.duration && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-bold text-xs rounded-full">
                    {item.duration}
                  </span>
                )}
                {item.isBlocked && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold text-xs rounded-full">
                    INELIGIBLE
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-500 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {item.submittedBy && <span><span className="font-medium text-slate-400">By:</span> {item.submittedBy}</span>}
                {item.swappedBy && <span><span className="font-medium text-slate-400">Swapped By:</span> {item.swappedBy}</span>}
                {item.changedBy && <span><span className="font-medium text-slate-400">Changed By:</span> {item.changedBy}</span>}
                {item.reason && <span><span className="font-medium text-slate-400">Reason:</span> {item.reason}</span>}
                {item.note && <span><span className="font-medium text-slate-400">Note:</span> {item.note}</span>}
                {item.role && <span><span className="font-medium text-slate-400">Role:</span> {item.role}</span>}
                {item.originalProgram && <span><span className="font-medium text-slate-400">From:</span> {item.originalProgram}</span>}
              </p>
            </div>
            {canEdit && !viewHistory && (
              <div className="flex items-center gap-1 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0 justify-end w-full sm:w-auto">
                <button 
                  onClick={() => { setEditingItemId(item.id); setFormData(item); setShowAddModal(true); }} 
                  className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button onClick={() => handleDeleteItem(item.id, arrayName)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-50 overflow-y-auto md:overflow-visible">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Schedule</h1>
          <p className="text-sm text-slate-500">Manage programs, daily schedules, and song submissions.</p>
        </div>
        <button 
          onClick={() => setViewHistory(!viewHistory)}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${viewHistory ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          {viewHistory ? <ArrowLeft className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
          {viewHistory ? 'Back to Active' : 'View Archive'}
        </button>
      </div>

      {/* PROGRAM PILLS */}
      <div className="px-6 py-4 flex items-center gap-3 overflow-x-auto border-b border-slate-200 bg-white shrink-0 scrollbar-hide">
        {programs.map(p => (
          <button
            key={p.id}
            onClick={() => setActiveProgramId(p.id)}
            style={{ 
              backgroundColor: activeProgramId === p.id ? themeColor : '#f1f5f9',
              color: activeProgramId === p.id ? '#ffffff' : '#475569'
            }}
            className="px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-transform active:scale-95 shadow-sm flex items-center gap-2"
          >
            <span>{p.name}</span>
            {p.isCurrent && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase ${activeProgramId === p.id ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>Current</span>
            )}
          </button>
        ))}
        {canEdit && !viewHistory && (
          <button
            onClick={() => setShowCreateProg(true)}
            className="px-5 py-2.5 rounded-full border-2 border-dashed border-slate-300 text-slate-500 hover:border-purple-500 hover:text-purple-600 text-sm font-bold flex items-center gap-1 shrink-0"
          >
            <Plus className="w-4 h-4" /> Program
          </button>
        )}
      </div>

      {activeProgram ? (
        <div className="flex-1 flex flex-col md:overflow-hidden">
          {/* TABS */}
          <div className="flex flex-nowrap border-b border-slate-200 bg-white px-2 shrink-0 overflow-x-auto scrollbar-hide w-full">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-4 text-sm font-bold border-b-[3px] transition-colors whitespace-nowrap shrink-0 ${activeTab === t.id ? 'border-purple-500 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                style={{ borderColor: activeTab === t.id ? themeColor : undefined, color: activeTab === t.id ? themeColor : undefined }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* CONTENT AREA */}
          <div className="flex-1 md:overflow-y-auto p-4 sm:p-6 custom-scrollbar">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-slate-800">{TABS.find(t=>t.id === activeTab)?.label}</h2>
              {canEdit && (
                <div className="flex flex-wrap items-center gap-3">
                  {!viewHistory && (
                    <button onClick={() => { setFormData({}); setEditingItemId(null); setShowAddModal(true); }} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 shadow-md transition-transform active:scale-95">
                      <Plus className="w-4 h-4" /> Add Item
                    </button>
                  )}
                  {!viewHistory && (
                    <button onClick={() => { setEditProgName(activeProgram.name); setShowEditProg(true); }} className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors shadow-sm bg-white border border-slate-200">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {!activeProgram.isCurrent && !viewHistory && (
                    <button onClick={() => setCurrentProgram(activeProgram.id)} className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-amber-500 hover:bg-amber-50 transition-colors shadow-sm bg-white border border-slate-200" title="Mark as Current Program">
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  {activeProgram.isCurrent && !viewHistory && (
                    <span className="px-4 py-2.5 rounded-xl text-amber-600 bg-amber-50 border border-amber-200 flex items-center justify-center" title="Current Program">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    </span>
                  )}
                  <button onClick={toggleArchive} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95 shadow-sm ${viewHistory ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>
                    {viewHistory ? 'Restore to Active' : 'Archive Program'}
                  </button>
                  <button onClick={() => { if(confirm('Are you sure you want to PERMANENTLY delete this program?')) deleteActiveProgram(); }} className="px-4 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors shadow-sm bg-white border border-red-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>


            {activeTab === 'eligibility' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Filter By Eligibility</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setEligibilityFilter('eligible')}
                    style={{ 
                      backgroundColor: eligibilityFilter === 'eligible' ? themeColor : undefined,
                    }}
                    className={`px-4 py-2 text-sm font-bold rounded-xl transition-all shadow-sm ${
                      eligibilityFilter === 'eligible' 
                        ? 'text-white' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Eligible ({(activeProgram.submitters || []).filter((s: any) => !s.isBlocked).length})
                  </button>
                  <button
                    onClick={() => setEligibilityFilter('ineligible')}
                    style={{ 
                      backgroundColor: eligibilityFilter === 'ineligible' ? themeColor : undefined,
                    }}
                    className={`px-4 py-2 text-sm font-bold rounded-xl transition-all shadow-sm ${
                      eligibilityFilter === 'ineligible' 
                        ? 'text-white' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Ineligible ({(activeProgram.submitters || []).filter((s: any) => s.isBlocked).length})
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm space-y-6">
                {/* WEEKS CONTROLLER */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Weeks</span>
                    {canEdit && !viewHistory && (
                      <button
                        onClick={handleAddWeek}
                        className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 bg-purple-50 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Week
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {weeks.map((w: any) => {
                      const isSelected = selectedWeekId === w.id;
                      const isCurrent = activeProgram.currentWeekId === w.id;
                      return (
                        <div key={w.id} className="flex items-center">
                          <button
                            onClick={() => setSelectedWeekId(w.id)}
                            style={{ 
                              backgroundColor: isSelected ? themeColor : undefined,
                            }}
                            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 ${
                              isSelected 
                                ? 'text-white' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <span>{w.name}</span>
                            {isCurrent && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold uppercase ${isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>Current</span>
                            )}
                          </button>
                          
                          {/* Action menu for week */}
                          {canEdit && !viewHistory && (
                            <div className="ml-2 flex items-center gap-1 shrink-0">
                              {!isCurrent && (
                                <button
                                  onClick={() => updateProgramData({ currentWeekId: w.id })}
                                  title="Mark as Current"
                                  className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                                >
                                  <Star className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleRenameWeek(w)}
                                title="Rename"
                                className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {w.id !== 'default_week_1' && (
                                <button
                                  onClick={() => handleDeleteWeek(w.id)}
                                  title="Delete"
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* DAYS CONTROLLER */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Days</span>
                    {canEdit && !viewHistory && (
                      <button
                        onClick={handleAddDay}
                        className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 bg-purple-50 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Day
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {days.filter((d: any) => d.weekId === selectedWeekId).map((d: any) => {
                      const isSelected = selectedDayId === d.id;
                      const isCurrent = activeProgram.currentDayId === d.id;
                      return (
                        <div key={d.id} className="flex items-center">
                          <button
                            onClick={() => setSelectedDayId(d.id)}
                            style={{ 
                              backgroundColor: isSelected ? themeColor : undefined,
                            }}
                            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 ${
                              isSelected 
                                ? 'text-white' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <span>{d.name}</span>
                            {isCurrent && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold uppercase ${isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>Current</span>
                            )}
                          </button>
                          
                          {/* Action menu for day */}
                          {canEdit && !viewHistory && (
                            <div className="ml-2 flex items-center gap-1 shrink-0">
                              {!isCurrent && (
                                <button
                                  onClick={() => updateProgramData({ currentDayId: d.id })}
                                  title="Mark as Current"
                                  className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                                >
                                  <Star className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleRenameDay(d)}
                                title="Rename"
                                className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {d.id !== 'default_day_1' && (
                                <button
                                  onClick={() => handleDeleteDay(d.id)}
                                  title="Delete"
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {days.filter((d: any) => d.weekId === selectedWeekId).length === 0 && (
                      <span className="text-sm text-slate-400 italic">No days added for this week yet.</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {renderDataList()}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400">
          <Archive className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-medium text-lg text-slate-500">
            {viewHistory ? 'No archived programs found.' : 'No active programs.'}
          </p>
          {!viewHistory && canEdit && (
             <button
               onClick={() => setShowCreateProg(true)}
               className="mt-6 px-6 py-3 rounded-full text-white text-sm font-bold shadow-lg transition-transform active:scale-95"
               style={{ backgroundColor: themeColor }}
             >
               Create First Program
             </button>
          )}
        </div>
      )}

      {/* Create Program Modal */}
      {showCreateProg && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-2">New Program</h3>
            <p className="text-sm text-slate-500 mb-6">Create a new scheduling board program.</p>
            
            <input 
              autoFocus
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:border-transparent outline-none mb-6 font-medium text-slate-800 transition-shadow"
              style={{ '--tw-ring-color': themeColor } as any}
              placeholder="e.g. Rhapsody Night 2026"
              value={newProgName}
              onChange={e => setNewProgName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newProgName.trim()) {
                  createProgram(newProgName.trim());
                  setNewProgName('');
                  setShowCreateProg(false);
                }
              }}
            />
            
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowCreateProg(false); setNewProgName(''); }} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors">Cancel</button>
              <button 
                onClick={() => {
                  if (newProgName.trim()) {
                    createProgram(newProgName.trim());
                    setNewProgName('');
                    setShowCreateProg(false);
                  }
                }}
                disabled={!newProgName.trim()}
                className="px-6 py-2.5 text-white rounded-xl font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                style={{ backgroundColor: themeColor }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Program Modal */}
      {showEditProg && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Rename Program</h3>
            <p className="text-sm text-slate-500 mb-6">Update the name of this program.</p>
            
            <input 
              autoFocus
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:border-transparent outline-none mb-6 font-medium text-slate-800 transition-shadow"
              style={{ '--tw-ring-color': themeColor } as any}
              placeholder="e.g. Rhapsody Night 2026"
              value={editProgName}
              onChange={e => setEditProgName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && editProgName.trim()) {
                  renameActiveProgram(editProgName.trim());
                  setShowEditProg(false);
                }
              }}
            />
            
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowEditProg(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors">Cancel</button>
              <button 
                onClick={() => {
                  if (editProgName.trim()) {
                    renameActiveProgram(editProgName.trim());
                    setShowEditProg(false);
                  }
                }}
                disabled={!editProgName.trim() || editProgName.trim() === activeProgram?.name}
                className="px-6 py-2.5 text-white rounded-xl font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                style={{ backgroundColor: themeColor }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md sm:max-w-xl md:max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-6">{editingItemId ? 'Edit' : 'Add'} {TABS.find(t=>t.id === activeTab)?.label}</h3>
            
            {renderAddForm()}

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => { setShowAddModal(false); setEditingItemId(null); }} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors">Cancel</button>
              <button 
                onClick={handleSaveItem}
                className="px-6 py-2.5 text-white rounded-xl font-bold shadow-md transition-all active:scale-95"
                style={{ backgroundColor: themeColor }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
