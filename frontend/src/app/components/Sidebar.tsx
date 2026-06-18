"use client";

import React from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDispatchPanelOpen: boolean;
  setIsDispatchPanelOpen: (open: boolean) => void;
  onExportReport: () => void;
  onPrintBriefing: () => void;
  setShowSupportModal: (show: boolean) => void;
  setShowLogoutConfirm: (show: boolean) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  isDispatchPanelOpen,
  setIsDispatchPanelOpen,
  onExportReport,
  onPrintBriefing,
  setShowSupportModal,
  setShowLogoutConfirm,
  isCollapsed,
  onToggleCollapse
}: SidebarProps) {
  const tabs = [
    { id: "Command Center", icon: "dashboard", fill: true },
    { id: "Analytics", icon: "insert_chart", fill: false },
    { id: "Economics", icon: "account_balance", fill: false },
    { id: "Enforcement", icon: "gavel", fill: false },
    { id: "Detection", icon: "radar", fill: false }
  ];

  return (
    <nav className={`bg-background h-screen shrink-0 border-r border-border hidden md:flex flex-col py-md z-40 relative transition-all duration-300 ${isCollapsed ? 'w-[70px]' : 'w-[280px]'}`}>
      {/* Header */}
      <div className="px-md pb-lg flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-sm overflow-hidden">
          <div className="w-10 h-10 rounded bg-panel border border-border flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-foreground" style={{ fontVariationSettings: "'FILL' 1" }}>domain</span>
          </div>
          {!isCollapsed && (
            <div className="transition-opacity duration-300">
              <h1 className="font-headline-md text-sm font-bold text-foreground truncate">Urban Intel</h1>
              <p className="font-label-md text-xs text-muted">City Admin</p>
            </div>
          )}
        </div>
        <button 
          onClick={onToggleCollapse} 
          className="text-muted hover:text-foreground cursor-pointer flex items-center justify-center w-8 h-8 rounded-full hover:bg-panel shrink-0"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <span className="material-symbols-outlined text-sm">
            {isCollapsed ? 'chevron_right' : 'chevron_left'}
          </span>
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-md flex flex-col gap-xs px-sm">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-md px-md py-sm rounded transition-colors duration-200 w-full text-left cursor-pointer ${
              activeTab === tab.id 
                ? 'text-foreground font-bold bg-[var(--accent-tint)]' 
                : 'text-muted hover:bg-panel'
            }`}
            title={isCollapsed ? tab.id : undefined}
          >
            <span className="material-symbols-outlined text-[18px] shrink-0" style={tab.fill ? { fontVariationSettings: "'FILL' 1" } : {}}>{tab.icon}</span>
            {!isCollapsed && <span className="font-body-md text-body-md truncate">{tab.id}</span>}
          </button>
        ))}
      </div>

      {/* CTA & Footer */}
      <div className="px-md pt-md border-t border-border flex flex-col gap-sm">
        <button 
          onClick={() => setIsDispatchPanelOpen(!isDispatchPanelOpen)}
          className={`w-full font-label-md text-label-md py-sm rounded transition-all cursor-pointer flex items-center justify-center gap-xs ${
            isDispatchPanelOpen 
              ? 'bg-[var(--status-red)] text-white hover:opacity-90' 
              : 'bg-primary text-on-primary font-semibold hover:opacity-90'
          }`}
          title={isCollapsed ? (isDispatchPanelOpen ? 'Close Dispatch' : 'Dispatch Plan') : undefined}
        >
          <span className="material-symbols-outlined text-[18px] shrink-0">emergency_share</span>
          {!isCollapsed && <span className="truncate">{isDispatchPanelOpen ? 'Close Dispatch' : 'Dispatch Plan'}</span>}
        </button>
        <button 
          onClick={onExportReport} 
          className="w-full bg-panel text-foreground border border-border font-label-md text-label-md py-sm rounded hover:bg-foreground/5 transition-all cursor-pointer flex items-center justify-center gap-xs"
          title={isCollapsed ? "Export Report" : undefined}
        >
          <span className="material-symbols-outlined text-[18px] shrink-0">download</span>
          {!isCollapsed && <span className="truncate">Export Report</span>}
        </button>
        <button 
          onClick={onPrintBriefing} 
          className="w-full bg-panel text-foreground border border-border font-label-md text-label-md py-sm rounded hover:bg-foreground/5 transition-all cursor-pointer flex items-center justify-center gap-xs"
          title={isCollapsed ? "Print Briefing" : undefined}
        >
          <span className="material-symbols-outlined text-[18px] shrink-0">print</span>
          {!isCollapsed && <span className="truncate">Print Briefing</span>}
        </button>
        <div className="flex flex-col gap-xs mt-sm">
          <button 
            onClick={() => setShowSupportModal(true)}
            className="flex items-center gap-md px-sm py-xs rounded text-muted hover:bg-panel transition-colors duration-200 w-full text-left cursor-pointer"
            title={isCollapsed ? "Support" : undefined}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">help</span>
            {!isCollapsed && <span className="font-body-sm text-body-sm truncate">Support</span>}
          </button>
        </div>
      </div>
    </nav>
  );
}
