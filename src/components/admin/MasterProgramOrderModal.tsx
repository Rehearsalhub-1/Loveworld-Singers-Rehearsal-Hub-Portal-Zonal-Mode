"use client";

import React, { useState, useEffect } from 'react';
import { X, Save, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { MasterProgram } from '@/types/master-library';

interface MasterProgramOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    programs: MasterProgram[];
    onUpdate: (updatedPrograms: MasterProgram[]) => Promise<void>;
}

export default function MasterProgramOrderModal({
    isOpen,
    onClose,
    programs,
    onUpdate
}: MasterProgramOrderModalProps) {
    const [orderedPrograms, setOrderedPrograms] = useState<MasterProgram[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Initialize programs based on existing order
    useEffect(() => {
        if (!programs) return;
        setOrderedPrograms([...programs]);
    }, [programs, isOpen]);

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newPrograms = [...orderedPrograms];
        if (direction === 'up') {
            if (index === 0) return;
            [newPrograms[index - 1], newPrograms[index]] = [newPrograms[index], newPrograms[index - 1]];
        } else {
            if (index === newPrograms.length - 1) return;
            [newPrograms[index + 1], newPrograms[index]] = [newPrograms[index], newPrograms[index + 1]];
        }
        setOrderedPrograms(newPrograms);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onUpdate(orderedPrograms);
            onClose();
        } catch (error) {
 console.error("Failed to save order", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh] overflow-hidden transform transition-all duration-300 scale-100">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Reorder Programs</h3>
                        <p className="text-sm text-slate-500">Arrange how programs appear in the library</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    {orderedPrograms.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-slate-500">No programs found.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {orderedPrograms.map((program, index) => (
                                <div
                                    key={program.id}
                                    className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl group hover:border-violet-300 hover:shadow-md transition-all duration-200"
                                >
                                    <div className="text-slate-400">
                                        <GripVertical className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="block font-semibold text-slate-800 truncate">{program.name}</span>
                                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">{program.songIds?.length || 0} Songs</span>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-40 sm:group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => moveItem(index, 'up')}
                                            disabled={index === 0}
                                            className="p-2 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg disabled:opacity-20 disabled:hover:bg-transparent transform transition-transform active:scale-90"
                                            title="Move Up"
                                        >
                                            <ArrowUp className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => moveItem(index, 'down')}
                                            disabled={index === orderedPrograms.length - 1}
                                            className="p-2 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg disabled:opacity-20 disabled:hover:bg-transparent transform transition-transform active:scale-90"
                                            title="Move Down"
                                        >
                                            <ArrowDown className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-100 flex gap-3 bg-slate-50">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`flex-1 px-4 py-2.5 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 shadow-lg shadow-violet-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:active:scale-100`}
                    >
                        {isSaving ? (
                            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Order
                    </button>
                </div>
            </div>
        </div>
    );
}
