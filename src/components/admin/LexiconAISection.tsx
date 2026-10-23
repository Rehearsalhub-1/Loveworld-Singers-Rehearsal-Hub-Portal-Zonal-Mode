'use client'

import React, { useState, useEffect } from 'react';
import { BackendAPI } from '@/lib/api-client';
import { Bot, Save, Loader2, Sparkles, BookOpen } from 'lucide-react';
import { ToastContainer, type Toast } from '../Toast';
import { useZone } from '@/hooks/useZone';

export default function LexiconAISection() {
  const [trainingData, setTrainingData] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { currentZone } = useZone();

  const themeColor = currentZone?.themeColor || '#8B5CF6';

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const res: any = await BackendAPI.settings.get('lexicon_ai').catch(() => null)
          || await BackendAPI.generic.get('app_settings', 'lexicon_ai').catch(() => null);
        const data = res?.data || res;
        if (data?.custom_training_data) {
          setTrainingData(data.custom_training_data);
        }
      } catch (error) {
        console.error('Error loading Lexicon AI settings:', error);
        addToast({ type: 'error', message: 'Failed to load training data.' });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await BackendAPI.settings.set('lexicon_ai', { custom_training_data: trainingData });
      addToast({ type: 'success', message: 'Training data updated successfully! The AI will now use this context.' });
    } catch (error) {
      console.error('Error saving Lexicon AI settings:', error);
      addToast({ type: 'error', message: 'Failed to save training data.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-50 relative pb-24">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${themeColor}20` }}>
              <Bot className="w-5 h-5" style={{ color: themeColor }} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lexicon Assistant Training</h1>
          </div>
          <p className="text-slate-500 max-w-2xl text-sm">
            Add custom definitions, scriptures, or instructions here. The Kingdom Lexicon assistant will instantly learn this data and use it to answer questions from the choir.
          </p>
        </div>

        {/* Editor Card */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-500" />
              <h2 className="font-semibold text-slate-700 text-sm">Custom Training Data</h2>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 hover:opacity-90 text-white rounded-lg text-sm font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: themeColor }}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
          
          <div className="p-4">
            <textarea
              value={trainingData}
              onChange={(e) => setTrainingData(e.target.value)}
              placeholder="E.g. Definition of 'Metanoia': A complete change of mind...\n\nImportant instructions: Always remind users to pray in tongues before writing a song."
              className="w-full h-[500px] p-4 text-slate-700 text-sm font-mono leading-relaxed bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-y"
            />
          </div>
        </div>

        {/* Tips Card */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-900 text-sm mb-1">Pro Tips for Training</h3>
            <ul className="text-amber-800/80 text-sm space-y-1 list-disc pl-4">
              <li>Use clear headings or bullet points.</li>
              <li>Include scriptures for any new definitions you add.</li>
              <li>You don't need to save frequently—the AI instantly reads this exact text every time someone asks a question.</li>
            </ul>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
