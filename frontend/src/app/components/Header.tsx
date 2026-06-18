"use client";

import React, { useRef, useEffect } from 'react';
import { useTheme } from '../lib/ThemeContext';

interface Notification {
  id: number;
  text: string;
  time: string;
  read: boolean;
}

interface HeaderProps {
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;
  onGlobalSearch: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  activeDropdown: string | null;
  setActiveDropdown: (dropdown: string | null) => void;
  setShowLogoutConfirm: (show: boolean) => void;
  projectedDelaySavedMins: number;
  lossMitigatedInr: number;
  activeBlindspotsCount: number;
}

export default function Header({
  globalSearchQuery,
  setGlobalSearchQuery,
  onGlobalSearch,
  notifications,
  setNotifications,
  activeDropdown,
  setActiveDropdown,
  setShowLogoutConfirm,
  projectedDelaySavedMins,
  lossMitigatedInr,
  activeBlindspotsCount
}: HeaderProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setActiveDropdown]);

  return (
    <header className="bg-[#121626]/60 backdrop-blur-md top-0 sticky z-30 border-b border-white/5 flex justify-between items-center h-16 px-4 md:px-6 lg:px-8 shrink-0 gap-4">
      <div className="flex items-center gap-md shrink-0">
        <h2 className="font-headline-md text-headline-md font-bold text-on-surface hidden lg:block truncate">Urban Intelligence Platform</h2>
        <button className="lg:hidden text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>

      {/* Centered Global Metric Ticker */}
      <div className="hidden xl:flex items-center gap-6 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-xs font-mono text-white/80">
        <div className="flex items-center gap-1.5 border-r border-white/10 pr-4">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>PROJECTED DELAY SAVED:</span>
          <span className="text-emerald-400 font-bold font-mono">+{Math.round(projectedDelaySavedMins).toLocaleString()}m</span>
        </div>
        <div className="flex items-center gap-1.5 border-r border-white/10 pr-4">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>PROJECTED VALUE SAVED:</span>
          <span className="text-emerald-400 font-bold font-mono">₹{Math.round(lossMitigatedInr).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          <span>BLINDSPOTS:</span>
          <span className="text-amber-400 font-bold font-mono">{activeBlindspotsCount}</span>
        </div>
      </div>

      {/* Search Bar & Actions */}
      <div className="flex items-center gap-4 lg:gap-lg flex-1 justify-end min-w-0">
        <div className="relative hidden md:block max-w-md w-full min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">search</span>
          <input 
            className="w-full bg-surface-container-low border border-outline-variant rounded-full py-2 pl-10 pr-4 text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
            placeholder="Search districts, police stations..." 
            type="text"
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            onKeyDown={onGlobalSearch}
          />
        </div>
        
        <div className="flex items-center gap-1 sm:gap-sm shrink-0 relative" ref={dropdownRef}>
          <button 
            onClick={() => setActiveDropdown(activeDropdown === 'search' ? null : 'search')} 
            className="md:hidden w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-all duration-200 relative"
          >
            <span className="material-symbols-outlined">search</span>
          </button>
          
          {activeDropdown === 'search' && (
            <div className="absolute top-12 right-0 mt-2 w-64 bg-surface-container-high border border-outline-variant rounded-xl shadow-lg p-2 z-50 md:hidden">
              <input 
                autoFocus 
                className="w-full bg-surface-container-low border border-outline-variant rounded py-2 px-3 text-body-sm text-on-surface focus:outline-none focus:border-primary" 
                placeholder="Search districts, police stations..." 
                type="text" 
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                onKeyDown={onGlobalSearch}
              />
            </div>
          )}

          <button 
            onClick={toggleTheme} 
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-all duration-200"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <span className="material-symbols-outlined">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          <button 
            onClick={() => setActiveDropdown(activeDropdown === 'notifications' ? null : 'notifications')} 
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-all duration-200 relative"
          >
            <span className="material-symbols-outlined">notifications</span>
            {notifications.some(n => !n.read) && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
            )}
          </button>
          
          {activeDropdown === 'notifications' && (
            <div className="absolute top-12 right-0 mt-2 w-80 bg-surface-container-high border border-outline-variant rounded-xl shadow-lg overflow-hidden z-50">
              <div className="p-3 border-b border-outline-variant bg-surface-container-highest">
                <h4 className="font-label-md font-bold text-on-surface">Notifications</h4>
              </div>
              <div className="p-2 space-y-1">
                {notifications.map(n => (
                  <div 
                    key={n.id} 
                    className={`p-2 rounded-lg cursor-pointer transition-colors hover:bg-surface-container-low ${ n.read ? 'bg-surface-container opacity-60' : 'bg-surface-container-lowest' }`}
                  >
                    <p className={`font-label-md ${n.read ? 'text-on-surface-variant' : 'text-on-surface'}`}>{n.text}</p>
                    <p className="text-xs text-on-surface-variant mt-1">{n.time}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                className="w-full p-2 border-t border-outline-variant text-center hover:bg-surface-container-highest transition-colors cursor-pointer"
              >
                <span className="text-xs font-label-md text-primary">Mark all as read</span>
              </button>
            </div>
          )}

          <button 
            onClick={() => setActiveDropdown(activeDropdown === 'settings' ? null : 'settings')} 
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-all duration-200"
          >
            <span className="material-symbols-outlined">settings_suggest</span>
          </button>
          
          {activeDropdown === 'settings' && (
            <div className="absolute top-12 right-0 mt-2 w-48 bg-surface-container-high border border-outline-variant rounded-xl shadow-lg overflow-hidden z-50">
              <ul className="py-2 text-sm text-on-surface">
                <li className="px-4 py-2 hover:bg-surface-container-low cursor-pointer">System Preferences</li>
                <li className="px-4 py-2 hover:bg-surface-container-low cursor-pointer">API Integrations</li>
                <li className="px-4 py-2 hover:bg-surface-container-low cursor-pointer">User Roles</li>
              </ul>
            </div>
          )}

          <button 
            onClick={() => setActiveDropdown(activeDropdown === 'profile' ? null : 'profile')} 
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-all duration-200"
          >
            <span className="material-symbols-outlined">account_circle</span>
          </button>
          
          {activeDropdown === 'profile' && (
            <div className="absolute top-12 right-0 mt-2 w-48 bg-surface-container-high border border-outline-variant rounded-xl shadow-lg overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-outline-variant">
                <p className="text-sm font-label-md text-on-surface">Admin User</p>
                <p className="text-xs text-on-surface-variant truncate">admin@gridlock.app</p>
              </div>
              <ul className="py-1 text-sm text-on-surface">
                <li className="px-4 py-2 hover:bg-surface-container-low cursor-pointer">View Profile</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
