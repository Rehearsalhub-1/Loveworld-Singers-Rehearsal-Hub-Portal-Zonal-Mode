"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Tag,
  Users,
  Music,
  Bot,
  ChevronRight,
  Bell,
  BarChart3,
  MessageCircle,
  FolderOpen,
  Upload,
  X,
  Library,
  User,
  Home,
  ChevronLeft,
  Calendar,
  Activity,
  DollarSign,
  List,
  Mic,
  CalendarCheck,
  Smartphone,
  MapPin,
  Building2,
} from "lucide-react";
import { useZone } from '@/hooks/useZone';
import { isHQGroup } from '@/config/zones';

interface AdminSidebarProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  activeSection: string;
  setActiveSection: (section: string) => void;
  isHQAdmin?: boolean;
  isRestrictedAdmin?: boolean;
  allowedSections?: string[] | null;
  pendingSubGroupCount?: number;
}

const AdminSidebar = React.memo(({
  sidebarCollapsed,
  setSidebarCollapsed,
  activeSection,
  setActiveSection,
  isHQAdmin = false,
  isRestrictedAdmin = false,
  allowedSections = null,
  pendingSubGroupCount = 0
}: AdminSidebarProps) => {
  const router = useRouter();
  const { currentZone } = useZone();

  const themeColor = currentZone?.themeColor || '#9333ea';
  const isHQ = currentZone ? isHQGroup(currentZone.id) : false;
  const isZoneCoordinator = currentZone && !isHQ && !isHQAdmin;

  // Group sidebar items by category (aligned with mobile admin app)
  const mainItems = [
    { icon: Home, label: 'Dashboard', active: activeSection === 'Dashboard' },
    { icon: BarChart3, label: 'Analytics', active: activeSection === 'Analytics', hqZoneOnly: true },
  ];

  const contentItems = [
    { icon: FileText, label: 'Pages', active: activeSection === 'Pages' },
    { icon: List, label: 'Schedule Manager', active: activeSection === 'Schedule Manager' },
    { icon: Upload, label: 'Submitted Songs', active: activeSection === 'Submitted Songs' },
    { icon: Library, label: 'Master Library', active: activeSection === 'Master Library', hqZoneOnly: true },
    { icon: Tag, label: 'Categories', active: activeSection === 'Categories' },
    { icon: Music, label: 'Media', active: activeSection === 'Media' },
  ];

  const managementItems = [
    { icon: Users, label: 'Members', active: activeSection === 'Members' },
    { icon: CalendarCheck, label: 'Attendance', active: activeSection === 'Attendance' },
    { icon: Building2, label: 'Churches & Subgroups', active: activeSection === 'Churches & Subgroups' || activeSection === 'Sub-Groups', badge: pendingSubGroupCount },
    { icon: MapPin, label: 'Geofence & Venue Clock-in', active: activeSection === 'Geofence & Venue Clock-in' || activeSection === 'Geofence Config' },
    { icon: Bell, label: 'Broadcast Announcements', active: activeSection === 'Broadcast Announcements' || activeSection === 'Notifications' },
    { icon: MessageCircle, label: 'Support Chat', active: activeSection === 'Support Chat' },
    { icon: Calendar, label: 'Calendar', active: activeSection === 'Calendar', hqZoneOnly: true },
    { icon: Activity, label: 'Activity Logs', active: activeSection === 'Activity Logs', hqZoneOnly: true },
    { icon: Smartphone, label: 'App Updates', active: activeSection === 'App Updates', hqOnly: true },
  ];

  // Filter items based on role
  const filterItems = (items: any[]) => items.filter(item => {
    if (isRestrictedAdmin) {
      if (allowedSections) {
        return allowedSections.includes(item.label);
      }
      return item.label === 'Pages' || !item.restrictedAdminHidden;
    }
    if (item.hqOnly && !isHQAdmin) return false;
    if (item.hqZoneOnly && !isHQ) return false;
    if (item.zoneOnly && !isZoneCoordinator) return false;
    return true;
  });

  const filteredMainItems = filterItems(mainItems);
  const filteredContentItems = filterItems(contentItems);
  const filteredManagementItems = filterItems(managementItems);

  const renderSectionLabel = (label: string) => {
    if (sidebarCollapsed) {
      return <div className="hidden lg:block h-px bg-slate-100 my-2 mx-3" />;
    }
    return (
      <div className="hidden lg:flex items-center gap-2 px-3 pt-5 pb-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">
          {label}
        </span>
        <div className="flex-1 h-px bg-slate-100" />
      </div>
    );
  };

  const renderNavItem = (item: any, index: number) => {
    const Icon = item.icon;
    const isActive = item.active;
    const hasBadge = !!item.badge && Number(item.badge) > 0;

    return (
      <button
        key={index}
        onClick={() => {
          setActiveSection(item.label);
          if (window.innerWidth < 1024) {
            setSidebarCollapsed(true);
          }
        }}
        className={`
          relative w-full flex items-center gap-3 px-4 py-3 lg:px-3 lg:py-2.5 rounded-xl lg:rounded-lg
          transition-all duration-200 active:scale-[0.98] group
          ${isActive
            ? 'text-white'
            : 'text-slate-600 hover:bg-slate-50 active:bg-slate-100'
          }
          ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}
        `}
        style={isActive ? {
          backgroundColor: themeColor,
          boxShadow: `0 4px 12px -2px ${themeColor}40`
        } : {}}
        title={sidebarCollapsed ? item.label : undefined}
      >
        {/* Left accent bar for active state (desktop only, non-collapsed) */}
        {isActive && !sidebarCollapsed && (
          <div
            className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}
          />
        )}

        <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
          !isActive ? 'group-hover:scale-110' : ''
        } ${isActive ? 'text-white' : ''}`} />

        <span className={`font-medium text-sm ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
          {item.label}
        </span>

        {/* Badge — with pulse animation */}
        {hasBadge && !sidebarCollapsed && (
          <span className="ml-auto relative">
            <span className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-30" />
            <span className="relative px-2 py-0.5 text-[10px] font-bold bg-yellow-400 text-yellow-900 rounded-full">
              {item.badge}
            </span>
          </span>
        )}
        {hasBadge && sidebarCollapsed && (
          <span className="hidden lg:flex absolute -top-1 -right-1 relative">
            <span className="absolute inset-0 w-5 h-5 bg-yellow-400 rounded-full animate-ping opacity-30" />
            <span className="relative w-5 h-5 text-[10px] font-bold bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center">
              {item.badge}
            </span>
          </span>
        )}

        {/* Chevron for active (non-badge) items */}
        {isActive && !hasBadge && !sidebarCollapsed && (
          <ChevronRight className="w-4 h-4 ml-auto text-white/60" />
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {!sidebarCollapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[65]"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 right-0 lg:left-0 lg:right-auto z-[70] lg:z-auto
        w-[80%] max-w-[300px] bg-white border-l lg:border-l-0 lg:border-r border-slate-200/60
        transform transition-all duration-300 ease-out
        ${sidebarCollapsed ? 'translate-x-full lg:translate-x-0 lg:w-[72px]' : 'translate-x-0 lg:w-64'}
        flex flex-col
      `}>
        {/* Header */}
        <div className={`p-4 border-b border-slate-100 ${sidebarCollapsed ? 'lg:px-3' : 'lg:p-5'}`}>
          <div className="flex items-center justify-between">
            {/* Close button for mobile */}
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="lg:hidden p-2 -ml-1 hover:bg-slate-100 rounded-xl transition-colors active:scale-95"
            >
              <X className="w-6 h-6 text-slate-600" />
            </button>

            {/* Logo & Title */}
            <Link
              href="/home"
              className={`flex items-center gap-3 hover:opacity-80 transition-opacity ${sidebarCollapsed ? 'lg:justify-center lg:w-full' : ''}`}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
                style={{
                  backgroundColor: themeColor,
                  boxShadow: `0 4px 6px -1px ${themeColor}40`
                }}
              >
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="w-7 h-7 object-contain"
                />
              </div>
              <div className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                <h1 className="text-base font-bold text-slate-900 tracking-tight">Admin Panel</h1>
                <p className="text-[11px] text-slate-400 truncate max-w-[140px]">{currentZone?.name || 'Loveworld Singers'}</p>
              </div>
            </Link>

            <div className="w-10 lg:hidden" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 lg:p-2 overflow-y-auto">
          {/* Main Section */}
          <div className="space-y-0.5">
            {renderSectionLabel('Overview')}
            {filteredMainItems.map(renderNavItem)}
          </div>

          {/* Content Section */}
          <div className="space-y-0.5">
            {renderSectionLabel('Content')}
            {filteredContentItems.map(renderNavItem)}
          </div>

          {/* Management Section */}
          <div className="space-y-0.5">
            {renderSectionLabel('Management')}
            {filteredManagementItems.map(renderNavItem)}
          </div>
        </nav>

        {/* Footer */}
        <div className={`p-4 border-t border-slate-100 ${sidebarCollapsed ? 'lg:p-2' : ''}`}>
          {/* Mobile: Back to Home */}
          <Link
            href="/home"
            className="lg:hidden w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-100 active:scale-[0.98] transition-all border border-slate-200/60"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>

          {/* Desktop: Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`hidden lg:flex w-full items-center gap-2 px-3 py-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            {!sidebarCollapsed && <span className="text-xs font-medium">Collapse</span>}
          </button>
        </div>
      </div>
    </>
  );
});

export default AdminSidebar;
