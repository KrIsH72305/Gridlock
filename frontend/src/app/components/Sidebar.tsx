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
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  isDispatchPanelOpen,
  setIsDispatchPanelOpen,
  onExportReport,
  onPrintBriefing,
  setShowSupportModal,
  setShowLogoutConfirm
}: SidebarProps) {
  const tabs = [
    { id: "Command Center", icon: "dashboard", fill: true },
    { id: "Analytics", icon: "insert_chart", fill: false },
    { id: "Economics", icon: "account_balance", fill: false },
    { id: "Enforcement", icon: "gavel", fill: false },
    { id: "Detection", icon: "radar", fill: false }
  ];

  return (
    <nav className="bg-canvas h-screen w-[280px] shrink-0 border-r border-hairline hidden md:flex flex-col py-md z-40 relative">
      {/* Header */}
      <div className="px-md pb-lg flex items-center gap-sm border-b border-hairline">
        <div className="w-10 h-10 rounded bg-accent-signal flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-canvas" style={{ fontVariationSettings: "'FILL' 1" }}>domain</span>
        </div>
        <div>
          <h1 className="font-headline-md text-headline-md font-bold text-text-primary">Urban Intel</h1>
          <p className="font-label-md text-label-md text-text-muted">City Admin</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-md flex flex-col gap-xs px-sm">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-md px-md py-sm rounded transition-colors duration-200 w-full text-left cursor-pointer border-l-4 ${
              activeTab === tab.id 
                ? 'text-accent-signal border-accent-signal font-bold bg-surface' 
                : 'text-text-muted border-transparent hover:bg-surface'
            }`}
          >
            <span className="material-symbols-outlined" style={tab.fill ? { fontVariationSettings: "'FILL' 1" } : {}}>{tab.icon}</span>
            <span className="font-body-md text-body-md">{tab.id}</span>
          </button>
        ))}
      </div>

      {/* CTA & Footer */}
      <div className="px-md pt-md border-t border-hairline flex flex-col gap-sm">
        <button 
          onClick={() => setIsDispatchPanelOpen(!isDispatchPanelOpen)}
          className={`w-full font-label-md text-label-md py-sm rounded transition-all cursor-pointer flex items-center justify-center gap-xs font-bold ${
            isDispatchPanelOpen 
              ? 'bg-accent-negative text-white' 
              : 'bg-accent-signal text-white hover:brightness-110'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">emergency_share</span>
          {isDispatchPanelOpen ? 'Close Dispatch' : 'Dispatch Plan'}
        </button>
        <button 
          onClick={onExportReport} 
          className="w-full bg-surface border border-hairline text-text-primary font-label-md text-label-md py-sm rounded hover:bg-canvas transition-all cursor-pointer flex items-center justify-center gap-xs"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Export Report
        </button>
        <button 
          onClick={onPrintBriefing} 
          className="w-full bg-surface border border-hairline text-text-primary font-label-md text-label-md py-sm rounded hover:bg-canvas transition-all cursor-pointer flex items-center justify-center gap-xs"
        >
          <span className="material-symbols-outlined text-[18px]">print</span>
          Print Briefing
        </button>
        <div className="flex flex-col gap-xs mt-sm">
          <button 
            onClick={() => setShowSupportModal(true)}
            className="flex items-center gap-md px-sm py-xs rounded text-text-muted hover:bg-surface transition-colors duration-200 w-full text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
            <span className="font-body-sm text-body-sm">Support</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
