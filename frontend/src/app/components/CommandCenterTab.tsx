"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MapRef } from 'react-map-gl/maplibre';
import MapComponent from './MapComponent';

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
  setSelectedHour
}: CommandCenterTabProps) {
  const [activeDropdown, setActiveDropdown] = useState<'filters' | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'hotspots' | 'blindspots'>('hotspots');
  const filterDropdownRef = useRef<HTMLDivElement>(null);


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
              <option value="Recent Dataset Window">Recent Dataset Window</option>
              <option value="Most Recent Day">Most Recent Day</option>
              <option value="Most Recent Week">Most Recent Week</option>
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
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-auto min-h-0 flex-1">
        
        {/* Left Column: Map & Metrics (Spans 2 columns on XL) */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          
          {/* Top Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#1e2025]/80 backdrop-blur-md border border-white/5 border-t-[3px] border-t-[#f44336] rounded-xl p-4 relative overflow-hidden group hover:border-white/20 transition-all shadow-lg">
              <div className="flex items-center gap-2 text-white/50 font-bold text-[10px] tracking-widest uppercase mb-3">
                <span className="material-symbols-outlined text-[14px]">report</span>
                <span className="truncate">TOTAL VIOLATIONS</span>
              </div>
              <div className="font-display-lg text-3xl font-black text-white tracking-tight mb-2">{stats.totalViolations.toLocaleString()}</div>
              <div className="flex items-center gap-1.5 text-[#f44336] font-bold text-[10px] uppercase tracking-wider">
                <span className="material-symbols-outlined text-[14px] animate-pulse">trending_up</span>
                <span>Dataset Window</span>
              </div>
            </div>

            <div className="bg-[#1e2025]/80 backdrop-blur-md border border-white/5 border-t-[3px] border-t-[#3e52ff] rounded-xl p-4 relative overflow-hidden group hover:border-white/20 transition-all shadow-lg">
              <div className="flex items-center gap-2 text-white/50 font-bold text-[10px] tracking-widest uppercase mb-3">
                <span className="material-symbols-outlined text-[14px]">speed</span>
                <span className="truncate">AVG SPEED (CBD)</span>
              </div>
              <div className="font-display-lg text-3xl font-black text-white tracking-tight mb-2">{stats.avgSpeed} <span className="text-white/40 text-base font-semibold">km/h</span></div>
              <div className="flex items-center gap-1.5 text-[#f44336] font-bold text-[10px] uppercase tracking-wider">
                <span className="material-symbols-outlined text-[14px]">trending_down</span>
                <span>estimated</span>
              </div>
            </div>

            <div className="bg-[#1e2025]/80 backdrop-blur-md border border-white/5 border-t-[3px] border-t-amber-500 rounded-xl p-4 relative overflow-hidden group hover:border-white/20 transition-all shadow-lg">
              <div className="flex items-center gap-2 text-white/50 font-bold text-[10px] tracking-widest uppercase mb-3">
                <span className="material-symbols-outlined text-[14px]">bus_alert</span>
                <span className="truncate">BUS LANE BLOCKS</span>
              </div>
              <div className="font-display-lg text-3xl font-black text-white tracking-tight mb-3">{stats.busBlocks.toLocaleString()}</div>
              <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>

            <div className="bg-[#1e2025]/80 backdrop-blur-md border border-white/5 border-t-[3px] border-t-emerald-500 rounded-xl p-4 relative overflow-hidden group hover:border-white/20 transition-all shadow-lg">
              <div className="flex items-center gap-2 text-white/50 font-bold text-[10px] tracking-widest uppercase mb-3">
                <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                <span className="truncate">MAIN ROAD BLOCKS</span>
              </div>
              <div className="font-display-lg text-3xl font-black text-white tracking-tight mb-3">{stats.loadingZones.toLocaleString()}</div>
              <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full" style={{ width: '82%' }}></div>
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
          />
        </div>

        {/* Right Sidebar: Active Hotspots & Blindspots Tabs */}
        <div className="bg-surface-container-low border border-outline-variant rounded-lg flex flex-col overflow-hidden">
          {/* Tab buttons */}
          <div className="flex border-b border-outline-variant shrink-0 bg-surface-container">
            <button 
              onClick={() => setActiveSidebarTab('hotspots')}
              className={`flex-1 py-3 text-center text-xs font-bold border-b-2 cursor-pointer transition-all ${activeSidebarTab === 'hotspots' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-white'}`}
            >
              Impact Hotspots
            </button>
            <button 
              onClick={() => setActiveSidebarTab('blindspots')}
              className={`flex-1 py-3 text-center text-xs font-bold border-b-2 cursor-pointer transition-all ${activeSidebarTab === 'blindspots' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-white'}`}
            >
              Blindspot Radar
            </button>
          </div>


          {activeSidebarTab === 'hotspots' ? (
            <>
              <div className="p-3 border-b border-outline-variant shrink-0">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">filter_alt</span>
                  <input 
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                    placeholder="Filter district..." 
                    type="text"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {loading ? (
                  <div className="p-4 text-center text-on-surface-variant text-sm flex flex-col items-center">
                    <span className="material-symbols-outlined animate-spin text-2xl mb-2">sync</span>
                    <p>Loading Hotspots...</p>
                  </div>
                ) : hotspots?.features && hotspots.features.length > 0 ? hotspots.features.map((feature, idx: number) => (
                  <div 
                    key={idx} 
                    onClick={() => {
                      mapRef.current?.flyTo({ center: [feature.properties.centerLng, feature.properties.centerLat], zoom: 15, duration: 1500 });
                      onSelectHotspot(feature.properties);
                    }}
                    className="p-3 hover:bg-surface-container rounded cursor-pointer border-b border-outline-variant/50 last:border-0 transition-colors group flex items-start justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                        <h4 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{feature.properties.locationName}</h4>
                      </div>
                      <p className="text-xs text-on-surface-variant ml-3.5 mb-1">OSM Road: <span className="text-on-surface capitalize">{feature.properties.highwayType} ({feature.properties.laneCount}L)</span></p>
                      <p className="text-xs text-on-surface-variant ml-3.5 mb-1">BPR Delay: <span className="text-on-surface">+{feature.properties.bprDelay.toFixed(1)} mins</span></p>
                      <p className="text-xs text-on-surface-variant ml-3.5">Violations: <span className="text-on-surface">{feature.properties.violationCount} reported</span></p>
                    </div>
                    {feature.properties.bprDelay >= 15 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-error/20 text-error border border-error/30 mt-1 uppercase">Critical</span>
                    ) : feature.properties.bprDelay >= 5 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary-container/20 text-secondary-container border border-secondary-container/30 mt-1 uppercase">High</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 mt-1 uppercase">Moderate</span>
                    )}
                  </div>
                )) : (
                  <div className="p-4 text-center text-on-surface-variant text-sm">
                    <p>No hotspots found matching criteria.</p>
                  </div>
                )}
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
                  className="p-3 hover:bg-surface-container rounded cursor-pointer border-b border-outline-variant/50 last:border-0 transition-colors group flex items-start justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      <h4 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{b.locationName}</h4>
                    </div>
                    <p className="text-xs text-on-surface-variant ml-3.5 mb-1">Observed vs Expected: <span className="text-on-surface">{b.observedCount} / {b.expectedCount}</span></p>
                    <p className="text-xs text-on-surface-variant ml-3.5">Unique Patrols: <span className="text-on-surface">{b.uniquePatrols} officers</span></p>
                  </div>
                  <div className="text-right mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30 uppercase">
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
    </>
  );
}
