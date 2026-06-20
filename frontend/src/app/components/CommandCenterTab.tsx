"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MapRef } from 'react-map-gl/maplibre';
import MapComponent from './MapComponent';
import AiAssistantModal from './AiAssistantModal';

type Timeframe = 'Recent Dataset Window' | 'Most Recent Day' | 'Most Recent Week';
type MapTheme = 'dark' | 'light' | 'satellite';

interface HotspotProperties {
  id: number;
  locationName: string;
  policeStation: string;
  violationCount: number;
  laneCount: number;
  highwayType: string;
  capacityLoss: number;
  bprDelay: number;
  centerLat: number;
  centerLng: number;
  poiType?: string;
  distanceToPatrol?: number;
  enforcementRoi?: number;
}

interface PolygonFeature<TProperties> {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  properties: TProperties;
}

interface FeatureCollection<TProperties> {
  type: 'FeatureCollection';
  features: PolygonFeature<TProperties>[];
}

interface Blindspot {
  id: number;
  locationName: string;
  lat: number;
  lng: number;
  observedCount: number;
  expectedCount: number;
  uniquePatrols: number;
  patrolBiasRatio: number;
}

interface CommandCenterTabProps {
  timeframe: Timeframe;
  setTimeframe: (timeframe: Timeframe) => void;
  district: string;
  setDistrict: (district: string) => void;
  availableDistricts: string[];
  stats: { totalViolations: number; avgSpeed: number; busBlocks: number; loadingZones: number };
  hotspots: FeatureCollection<HotspotProperties> | null;
  blindspots: Blindspot[];
  loading: boolean;
  mapRef: React.RefObject<MapRef | null>;
  mapTheme: MapTheme;
  setMapTheme: (theme: MapTheme) => void;
  isPredictiveMode: boolean;
  setIsPredictiveMode: (predictive: boolean) => void;
  forecastData: any;
  isDispatchPanelOpen: boolean;
  setIsDispatchPanelOpen: (open: boolean) => void;
  onSelectHotspot: (hotspot: any) => void;
  selectedHour: number;
  setSelectedHour: (hour: number) => void;
  isPriorityDispatchMode: boolean;
  setIsPriorityDispatchMode: (mode: boolean) => void;
}

export default function CommandCenterTab({
  timeframe,
  setTimeframe,
  district,
  setDistrict,
  availableDistricts,
  stats,
  hotspots,
  blindspots,
  loading,
  mapRef,
  mapTheme,
  setMapTheme,
  isPredictiveMode,
  setIsPredictiveMode,
  forecastData,
  isDispatchPanelOpen,
  setIsDispatchPanelOpen,
  onSelectHotspot,
  selectedHour,
  setSelectedHour,
  isPriorityDispatchMode,
  setIsPriorityDispatchMode
}: CommandCenterTabProps) {
  const [activeDropdown, setActiveDropdown] = useState<'filters' | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'hotspots' | 'blindspots'>('hotspots');
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Flipkart Gridlock Hackathon States
  const [poiFilter, setPoiFilter] = useState<'all' | 'transit' | 'commercial' | 'event'>('all');
  const [sortKey, setSortKey] = useState<'violations' | 'roi' | 'delay'>('violations');

  // Proactive Alerts State
  const [currentAlertIdx, setCurrentAlertIdx] = useState(0);
  const proactiveAlerts = [
    { text: "Potential Encroachment forming near Indiranagar Metro Station. Speed degraded by 18%. Preemptive patrol queued.", type: "transit" },
    { text: "Systemic commercial choke point building on Commercial Street. Commuter delay threshold exceeded.", type: "commercial" },
    { text: "Spillover capacity loss detected near Chinnaswamy Stadium. Towing dispatch recommended.", type: "event" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAlertIdx(prev => (prev + 1) % proactiveAlerts.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {/* Page Header */}
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
          <div className="flex items-center gap-xs text-on-surface-variant font-label-md mb-xs">
            <span className="material-symbols-outlined text-[16px]">analytics</span>
            <span>TRAFFIC FLOW</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-primary">IMPACT PHYSICS</span>
          </div>
          <h2 className="font-headline-lg text-2xl md:text-3xl font-bold text-on-surface">Traffic Impact & Violations</h2>
          <p className="font-body-md text-on-surface-variant mt-1">DBSCAN clusters enriched with OSM lane counts and BPR delay models.</p>
        </div>
        
        <div className="flex gap-sm w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <select 
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as Timeframe)}
              className="w-full md:w-auto appearance-none bg-surface-container border border-outline-variant rounded py-2 pl-3 pr-8 text-body-sm focus:outline-none focus:border-primary text-on-surface cursor-pointer"
            >
              <option value="Recent Dataset Window">All Available Records</option>
              <option value="Most Recent Day">Last 24 Hours Analysis</option>
              <option value="Most Recent Week">Last 7 Days Trend</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
          </div>
          
          <div className="relative" ref={filterDropdownRef}>
            <button 
              onClick={() => setActiveDropdown(activeDropdown === 'filters' ? null : 'filters')}
              className={`bg-surface-container border hover:border-primary text-on-surface px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2 h-[38px] cursor-pointer ${activeDropdown === 'filters' ? 'border-primary' : 'border-outline-variant'}`}
            >
              <span className="material-symbols-outlined text-[18px] leading-none">filter_list</span>
              <span className="font-label-md hidden sm:inline leading-none font-medium mt-[1px]">Filters {district && '(1)'}</span>
            </button>

            {activeDropdown === 'filters' && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-[#1e2025]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 p-2 text-body-sm max-h-[320px] overflow-y-auto">
                <div className="font-bold text-white/50 mb-2 px-2 text-[10px] uppercase tracking-wider">Police Station</div>
                <button 
                  onClick={() => { setDistrict(""); setActiveDropdown(null); }} 
                  className={`w-full text-left px-2 py-1.5 rounded hover:bg-white/5 transition-colors cursor-pointer ${district === "" ? 'text-[#3e52ff] font-bold bg-[#3e52ff]/10' : 'text-white/80'}`}
                >
                  All Districts
                </button>
                {availableDistricts.map(dist => (
                  <button 
                    key={dist} 
                    onClick={() => { setDistrict(dist); setActiveDropdown(null); }} 
                    className={`w-full text-left px-2 py-1.5 rounded hover:bg-white/5 transition-colors cursor-pointer ${district === dist ? 'text-[#3e52ff] font-bold bg-[#3e52ff]/10' : 'text-white/80'}`}
                  >
                    {dist}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AI Traffic Officer Assistant Button */}
          <button 
            onClick={() => setIsAiAssistantOpen(true)}
            className="bg-primary hover:opacity-90 border border-primary text-on-primary px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 h-[38px] cursor-pointer shadow-lg shadow-primary/20"
            title="Ask AI Traffic Assistant"
          >
            <span className="material-symbols-outlined text-[18px] leading-none animate-pulse">mic</span>
            <span className="font-label-md hidden sm:inline leading-none font-medium mt-[1px]">AI Officer</span>
          </button>
        </div>
      </div>

      {/* Proactive Dispatch Queue Banner */}
      <div className="bg-panel border border-[var(--status-red)]/10 rounded-xl p-3 mb-6 flex items-center justify-between gap-3 text-xs z-10 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="material-symbols-outlined text-[var(--status-red)] animate-pulse text-[18px]">campaign</span>
          <span className="font-bold text-[var(--status-red)] font-mono tracking-wide uppercase shrink-0 bg-[var(--status-red)]/10 px-2 py-0.5 rounded border border-[var(--status-red)]/20">PROACTIVE ALERT</span>
          <p className="text-foreground font-normal truncate transition-all duration-500 font-mono">
            {proactiveAlerts[currentAlertIdx].text}
          </p>
        </div>
        <span className="text-[10px] font-mono text-muted shrink-0 bg-background px-2 py-0.5 rounded border border-border">Auto-Predicting</span>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-auto min-h-0 flex-1">
        
        {/* Left Column: Map & Metrics (Spans 3 columns on XL) */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          
          {/* Top Summary Metric Cards */}
          <div className="bg-panel border border-border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border gap-4 sm:gap-0">
            
            {/* Metric 1 */}
            <div className="sm:px-4 sm:first:pl-0 sm:last:pr-0 flex flex-col justify-between min-w-0">
              <div className="flex items-center gap-2 text-muted font-semibold text-xs mb-2">
                <span className="material-symbols-outlined text-[16px] text-muted">report</span>
                <span className="truncate">Total Violations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-[6px] h-[22px] bg-[var(--status-red)] rounded-full shrink-0"></div>
                <div className="font-display-lg text-3xl font-bold text-foreground tracking-tight">{stats.totalViolations.toLocaleString()}</div>
              </div>
              <div className="text-muted text-[11px] mt-2">
                Dataset Window
              </div>
            </div>

            {/* Metric 2 */}
            <div className="sm:px-4 sm:first:pl-0 sm:last:pr-0 pt-4 sm:pt-0 flex flex-col justify-between min-w-0">
              <div className="flex items-center gap-2 text-muted font-semibold text-xs mb-2">
                <span className="material-symbols-outlined text-[16px] text-muted">speed</span>
                <span className="truncate">Average Speed (CBD)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-[6px] h-[22px] bg-[var(--status-blue)] rounded-full shrink-0"></div>
                <div className="font-display-lg text-3xl font-bold text-foreground tracking-tight">{stats.avgSpeed} <span className="text-muted text-base font-medium">km/h</span></div>
              </div>
              <div className="text-muted text-[11px] mt-2">
                Estimated
              </div>
            </div>

            {/* Metric 3 */}
            <div className="sm:px-4 sm:first:pl-0 sm:last:pr-0 pt-4 sm:pt-0 flex flex-col justify-between min-w-0">
              <div className="flex items-center gap-2 text-muted font-semibold text-xs mb-2">
                <span className="material-symbols-outlined text-[16px] text-muted">bus_alert</span>
                <span className="truncate">Bus Lane Blocks</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-[6px] h-[22px] bg-[var(--status-amber)] rounded-full shrink-0"></div>
                <div className="font-display-lg text-3xl font-bold text-foreground tracking-tight">{stats.busBlocks.toLocaleString()}</div>
              </div>
              <div className="text-muted text-[11px] mt-2">
                Active
              </div>
            </div>

            {/* Metric 4 */}
            <div className="sm:px-4 sm:first:pl-0 sm:last:pr-0 pt-4 sm:pt-0 flex flex-col justify-between min-w-0">
              <div className="flex items-center gap-2 text-muted font-semibold text-xs mb-2">
                <span className="material-symbols-outlined text-[16px] text-muted">local_shipping</span>
                <span className="truncate">Main Road Blocks</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-[6px] h-[22px] bg-[var(--status-green)] rounded-full shrink-0"></div>
                <div className="font-display-lg text-3xl font-bold text-foreground tracking-tight">{stats.loadingZones.toLocaleString()}</div>
              </div>
              <div className="text-muted text-[11px] mt-2">
                Monitored
              </div>
            </div>
          </div>

          {/* Map Area */}
          <MapComponent 
            mapRef={mapRef}
            mapTheme={mapTheme}
            setMapTheme={setMapTheme}
            isPredictiveMode={isPredictiveMode}
            setIsPredictiveMode={setIsPredictiveMode}
            hotspots={hotspots}
            forecastData={forecastData}
            isDispatchPanelOpen={isDispatchPanelOpen}
            setIsDispatchPanelOpen={setIsDispatchPanelOpen}
            district={district}
            onSelectHotspot={onSelectHotspot}
            selectedHour={selectedHour}
            setSelectedHour={setSelectedHour}
            blindspots={blindspots}
            timeframe={timeframe}
            isPriorityDispatchMode={isPriorityDispatchMode}
          />
        </div>

        {/* Right Sidebar: Active Hotspots & Blindspots Tabs */}
        <div className="bg-panel border border-border rounded-xl flex flex-col overflow-hidden">
          {/* Tab buttons */}
          <div className="flex border-b border-border shrink-0 bg-background/50">
            <button 
              onClick={() => setActiveSidebarTab('hotspots')}
              className={`flex-1 py-3 text-center text-xs font-bold border-b-2 cursor-pointer transition-all ${activeSidebarTab === 'hotspots' ? 'border-foreground text-foreground font-semibold' : 'border-transparent text-muted hover:text-foreground'}`}
            >
              Impact Hotspots
            </button>
            <button 
              onClick={() => setActiveSidebarTab('blindspots')}
              className={`flex-1 py-3 text-center text-xs font-bold border-b-2 cursor-pointer transition-all ${activeSidebarTab === 'blindspots' ? 'border-foreground text-foreground font-semibold' : 'border-transparent text-muted hover:text-foreground'}`}
            >
              Blindspot Radar
            </button>
          </div>


          {activeSidebarTab === 'hotspots' ? (
            <>
              <div className="p-3 border-b border-border shrink-0 flex flex-col gap-2.5">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-muted text-[18px] pointer-events-none">filter_alt</span>
                  <input 
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-all text-foreground" 
                    placeholder="Filter district..." 
                    type="text"
                  />
                </div>

                {/* POI Categorization Tabs */}
                <div className="flex gap-1 border-b border-border/40 pb-2 flex-wrap">
                  <button 
                    onClick={() => setPoiFilter('all')}
                    className={`px-2 py-0.5 rounded text-[10px] font-black cursor-pointer transition-colors ${poiFilter === 'all' ? 'bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/30' : 'text-muted hover:text-foreground'}`}
                  >
                    ALL
                  </button>
                  <button 
                    onClick={() => setPoiFilter('transit')}
                    className={`px-2 py-0.5 rounded text-[10px] font-black cursor-pointer transition-colors ${poiFilter === 'transit' ? 'bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/30' : 'text-muted hover:text-foreground'}`}
                  >
                    TRANSIT (METRO)
                  </button>
                  <button 
                    onClick={() => setPoiFilter('commercial')}
                    className={`px-2 py-0.5 rounded text-[10px] font-black cursor-pointer transition-colors ${poiFilter === 'commercial' ? 'bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/30' : 'text-muted hover:text-foreground'}`}
                  >
                    COMMERCIAL
                  </button>
                  <button 
                    onClick={() => setPoiFilter('event')}
                    className={`px-2 py-0.5 rounded text-[10px] font-black cursor-pointer transition-colors ${poiFilter === 'event' ? 'bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/30' : 'text-muted hover:text-foreground'}`}
                  >
                    EVENTS
                  </button>
                </div>



                {/* Priority Dispatch Toggle Button */}
                <button 
                  onClick={() => setIsPriorityDispatchMode(!isPriorityDispatchMode)}
                  className={`w-full py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${isPriorityDispatchMode ? 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/40 hover:bg-[#ef4444]/30 shadow-lg shadow-red-500/10' : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'}`}
                >
                  <span className="material-symbols-outlined text-[12px] leading-none">emergency_share</span>
                  {isPriorityDispatchMode ? "SHOW ALL HOTSPOTS" : "GENERATE PRIORITY DISPATCH QUEUE"}
                </button>
              </div>

              <div key={`${sortKey}-${poiFilter}-${isPriorityDispatchMode}`} className="flex-1 overflow-y-auto p-2">
                {loading ? (
                  <div className="p-4 text-center text-on-surface-variant text-sm flex flex-col items-center">
                    <span className="material-symbols-outlined animate-spin text-2xl mb-2">sync</span>
                    <p>Loading Hotspots...</p>
                  </div>
                ) : (() => {
                  let processed = hotspots?.features ? [...hotspots.features] : [];
                  
                  if (isPriorityDispatchMode) {
                    // Filter to top 5 worst hotspots sorted by delay
                    processed = [...(hotspots?.features || [])]
                      .sort((a, b) => Number(b.properties.bprDelay || 0) - Number(a.properties.bprDelay || 0))
                      .slice(0, 5);
                  } else {
                    if (poiFilter !== 'all') {
                      processed = processed.filter(f => f.properties.poiType === poiFilter);
                    }
                    processed.sort((a, b) => {
                      if (sortKey === 'roi') {
                        return Number(b.properties.enforcementRoi || 0) - Number(a.properties.enforcementRoi || 0);
                      }
                      if (sortKey === 'delay') {
                        return Number(b.properties.bprDelay || 0) - Number(a.properties.bprDelay || 0);
                      }
                      return Number(b.properties.violationCount || 0) - Number(a.properties.violationCount || 0);
                    });
                  }

                  if (processed.length === 0) {
                    return (
                      <div className="p-4 text-center text-muted text-xs">
                        <p>No hotspots found matching criteria.</p>
                      </div>
                    );
                  }

                  if (isPriorityDispatchMode) {
                    return processed.map((feature, idx: number) => {
                      const name = feature.properties.locationName || "";
                      const shortName = name.split(',')[0];
                      const roi = feature.properties.enforcementRoi || 0;
                      const delay = feature.properties.bprDelay || 0;
                      const dist = feature.properties.distanceToPatrol || 1.0;
                      const timeSaved = delay * 0.35; // Projected ROI
                      
                      let poiLabel = "🚇 Transit Spillover";
                      let customName = `${shortName} Transit Hub`;
                      if (name.toLowerCase().includes("kamaraj") || name.toLowerCase().includes("nagamma")) {
                        poiLabel = "🛍️ Commercial Choke";
                        customName = "Kamaraj Commercial Corridor";
                      } else if (name.toLowerCase().includes("80 feet") || name.toLowerCase().includes("orion")) {
                        poiLabel = "🛍️ Mall Spillover";
                        customName = "Orion Mall Junction";
                      } else if (feature.properties.poiType === 'event') {
                        poiLabel = "🎟️ Event Spillover";
                        customName = `${shortName} Arena`;
                      } else if (feature.properties.poiType === 'commercial') {
                        poiLabel = "🛍️ Commercial Choke";
                        customName = `${shortName} Corridor`;
                      }

                      return (
                        <div 
                          key={feature.properties.id || idx}
                          onClick={() => {
                            mapRef.current?.flyTo({ center: [feature.properties.centerLng, feature.properties.centerLat], zoom: 15, duration: 1500 });
                            onSelectHotspot(feature.properties);
                          }}
                          className="mb-3 p-3 bg-red-950/20 hover:bg-red-950/30 border border-red-500/20 rounded-xl cursor-pointer transition-all flex flex-col gap-2 relative group"
                        >
                          {/* Rank and Title Header */}
                          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-mono font-black text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                RANK #{idx + 1}
                              </span>
                              <h4 className="font-bold text-xs text-white truncate">{customName}</h4>
                            </div>
                            <span className="text-[8px] font-bold text-white/50">{poiLabel}</span>
                          </div>

                          {/* Detail Grid */}
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                            <div className="flex flex-col">
                              <span className="text-white/40 text-[8px] uppercase tracking-wider">Delta-Impact Saved</span>
                              <span className="text-rose-400 font-bold">-{timeSaved.toFixed(0)} min delay</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-white/40 text-[8px] uppercase tracking-wider">Projected ROI</span>
                              <span className="text-emerald-400 font-bold">{roi.toFixed(1)} min/km</span>
                            </div>
                          </div>

                          <div className="text-[9px] text-white/30 font-light truncate">
                            Address: {name}
                          </div>

                          {/* ACTION BUTTON */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              alert(`🚨 ENFORCEMENT DISPATCH SECTOR ACTION 🚨\n\nCommand Center dispatched nearest Warden Unit to ${customName} (${shortName})!\n\nMetrics Mitigation Details:\n- Projected Delay Mitigation: -35% (-${timeSaved.toFixed(0)} minutes)\n- Warden Proximity: ${dist} km (ETA ${Math.round(dist * 2.5)} mins)\n- GPS tracker locked. Clear-down active.`);
                            }}
                            className="mt-1 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 rounded-lg text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-md shadow-red-600/15 group-hover:scale-[1.01] active:scale-95 text-center flex items-center justify-center gap-1"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                            DISPATCH NEAREST WARDEN
                          </button>
                        </div>
                      );
                    });
                  }

                  return processed.map((feature, idx: number) => (
                    <div 
                      key={feature.properties.id || idx} 
                      onClick={() => {
                        mapRef.current?.flyTo({ center: [feature.properties.centerLng, feature.properties.centerLat], zoom: 15, duration: 1500 });
                        onSelectHotspot(feature.properties);
                      }}
                      className="p-3 hover:bg-foreground/[0.02] rounded-lg cursor-pointer border-b border-border/50 last:border-0 transition-colors group flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-red)] shrink-0"></span>
                          <h4 className="font-bold text-sm text-foreground group-hover:text-foreground/90 transition-colors truncate">{feature.properties.locationName}</h4>
                        </div>
                        
                        <div className="flex gap-1 items-center flex-wrap mb-1 ml-3.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-muted uppercase">
                            {feature.properties.poiType === 'transit' ? '🚇 Transit Spillover' : feature.properties.poiType === 'event' ? '🎟️ Event Arena' : '🛍️ Commercial'}
                          </span>
                          {feature.properties.enforcementRoi !== undefined && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                              ROI: {feature.properties.enforcementRoi.toFixed(1)}m/km
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted ml-3.5 mb-1 font-light">OSM Road: <span className="text-foreground font-normal capitalize">{feature.properties.highwayType} ({feature.properties.laneCount}L)</span></p>
                        <p className="text-xs text-muted ml-3.5 mb-1 font-light">BPR Delay: <span className="text-foreground font-normal font-mono">+{feature.properties.bprDelay.toFixed(1)} mins</span></p>
                        <p className="text-xs text-muted ml-3.5 font-light">Warden Proximity: <span className="text-foreground font-normal font-mono">{feature.properties.distanceToPatrol ? `${feature.properties.distanceToPatrol.toFixed(1)} km` : 'N/A'}</span></p>
                      </div>
                      
                      <div className="shrink-0 flex flex-col items-end gap-1 mt-1">
                        {feature.properties.bprDelay >= 15 ? (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[var(--status-red)]/10 text-[var(--status-red)] border border-[var(--status-red)]/20 uppercase">Critical</span>
                        ) : feature.properties.bprDelay >= 5 ? (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[var(--status-amber)]/10 text-[var(--status-amber)] border border-[var(--status-amber)]/20 uppercase">High</span>
                        ) : (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[var(--status-blue)]/10 text-[var(--status-blue)] border border-[var(--status-blue)]/20 uppercase">Moderate</span>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-2">
              {blindspots && blindspots.length > 0 ? blindspots.map((b, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    mapRef.current?.flyTo({ center: [b.lng, b.lat], zoom: 15, duration: 1500 });
                  }}
                  className="p-3 hover:bg-foreground/[0.02] rounded-lg cursor-pointer border-b border-border/50 last:border-0 transition-colors group flex items-start justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-amber)]"></span>
                      <h4 className="font-bold text-sm text-foreground group-hover:text-foreground/90 transition-colors">{b.locationName}</h4>
                    </div>
                    <p className="text-xs text-muted ml-3.5 mb-1">Observed vs Expected: <span className="text-foreground">{b.observedCount} / {b.expectedCount}</span></p>
                    <p className="text-xs text-muted ml-3.5">Unique Patrols: <span className="text-foreground">{b.uniquePatrols} officers</span></p>
                  </div>
                  <div className="text-right mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--status-amber)]/10 text-[var(--status-amber)] border border-[var(--status-amber)]/20 uppercase">
                      {b.patrolBiasRatio.toFixed(1)}x Bias
                    </span>
                  </div>
                </div>
              )) : (
                <div className="p-4 text-center text-on-surface-variant text-sm">
                  <p>No patrol bias blindspots found.</p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      <AiAssistantModal 
        isOpen={isAiAssistantOpen} 
        onClose={() => setIsAiAssistantOpen(false)} 
      />
    </>
  );
}
