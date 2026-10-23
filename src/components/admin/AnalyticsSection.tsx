'use client'

import { Users, Activity, Eye, Download, RefreshCw, ChevronLeft, ChevronRight, Database, Zap, Monitor, Smartphone, Tablet, UserCheck, Music } from 'lucide-react'
import { useZone } from '@/hooks/useZone'
import SimplifiedAnalyticsDashboard from './SimplifiedAnalyticsDashboard'

export default function AnalyticsSection() {
  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <SimplifiedAnalyticsDashboard />
      </div>
    </div>
  );
}
