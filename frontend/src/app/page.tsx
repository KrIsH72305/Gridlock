"use client";

import React, { useState, useEffect, useRef } from 'react';
import Map, { Source, Layer, MapRef } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AlertCircle, Navigation, Clock, Activity, ShieldAlert, X } from 'lucide-react';
import AnalyticsTab from './components/AnalyticsTab';
import EnforcementTab from './components/EnforcementTab';
import SensorsTab from './components/SensorsTab';
import EconomicCalculator from './components/EconomicCalculator';

export default function TrafficDashboard() {
  const [hotspots, setHotspots] = useState(null);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [timeframe, setTimeframe] = useState("Live Data");
  const [district, setDistrict] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [stats, setStats] = useState({ totalViolations: 0, avgSpeed: 0, busBlocks: 0, loadingZones: 0 });
  const [activeTab, setActiveTab] = useState("Command Center");
  const [mapTheme, setMapTheme] = useState('dark');
  const mapRef = useRef<MapRef>(null);

  const getMapStyleUrl = (theme: string) => {
    if (theme === 'dark') return "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
    if (theme === 'light') return "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
    if (theme === 'satellite') return {
      "version": 8,
      "sources": {
        "esri": {
          "type": "raster",
          "tiles": ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
          "tileSize": 256
        }
      },
      "layers": [{
        "id": "satellite",
        "type": "raster",
        "source": "esri",
        "minzoom": 0,
        "maxzoom": 22
      }]
    };
    return "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
  };

  const tabs = [
    { id: "Command Center", icon: "dashboard", fill: true },
    { id: "Analytics", icon: "insert_chart", fill: false },
    { id: "Economics", icon: "account_balance", fill: false },
    { id: "Enforcement", icon: "gavel", fill: false },
    { id: "Sensors", icon: "videocam", fill: false }
  ];

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:8000/api/hotspots?timeframe=${encodeURIComponent(timeframe)}&district=${encodeURIComponent(district)}`)
      .then(res => res.json())
      .then(data => {
        const hotspotArray = data.hotspots || [];
        const maxWeight = Math.max(...hotspotArray.map((h: any) => h.weight), 1);
        
        const geojsonData = {
          type: "FeatureCollection",
          features: hotspotArray.map((h: any) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [h.longitude, h.latitude] },
            properties: {
              locationName: h.location,
              violationCount: h.weight,
              severityScore: (h.weight / maxWeight) * 10
            }
          }))
        };
        
        setHotspots(geojsonData);
        
        let total = 0;
        let busBlocks = 0;
        let loadingZones = 0;
        
        hotspotArray.forEach((h: any) => {
          total += h.weight;
        });
        
        busBlocks = Math.floor(total * 0.12);
        loadingZones = Math.floor(total * 0.18);
        
        setStats({
          totalViolations: total,
          avgSpeed: 14.2,
          busBlocks,
          loadingZones
        });
      })
      .catch(err => console.error("Error fetching hotspots:", err))
      .finally(() => setLoading(false));
  }, [timeframe, district]);

  const heatmapLayer = {
    id: 'parking-heatmap',
    type: 'heatmap',
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['get', 'severityScore'], 0, 0, 10, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(0, 0, 0, 0)',
        0.2, '#3e52ff',
        0.4, '#14d1ff',
        0.6, '#bdc2ff',
        0.8, '#ffb4ab',
        1, '#93000a'
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 20],
      'heatmap-opacity': 0.8
    }
  };

  const pointLayer = {
    id: 'parking-point',
    type: 'circle',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2, 15, 8],
      'circle-color': '#ffb4ab',
      'circle-stroke-color': '#93000a',
      'circle-stroke-width': 1,
      'circle-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0, 15, 1]
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body-md overflow-hidden flex h-screen w-full">
      
      {/* SideNavBar */}
      <nav className="bg-surface-container-low h-screen w-[280px] shrink-0 border-r border-outline-variant hidden md:flex flex-col py-md z-40">
        {/* Header */}
        <div className="px-md pb-lg flex items-center gap-sm border-b border-outline-variant">
          <div className="w-10 h-10 rounded bg-primary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>domain</span>
          </div>
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-primary">Urban Intel</h1>
            <p className="font-label-md text-label-md text-on-surface-variant">City Admin</p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-md flex flex-col gap-xs px-sm">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-md px-md py-sm rounded transition-colors duration-200 w-full text-left ${
                activeTab === tab.id 
                  ? 'text-primary border-r-4 border-primary font-bold bg-surface-container-high/50' 
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined" style={tab.fill ? { fontVariationSettings: "'FILL' 1" } : {}}>{tab.icon}</span>
              <span className="font-body-md text-body-md">{tab.id}</span>
            </button>
          ))}
        </div>

        {/* CTA & Footer */}
        <div className="px-md pt-md border-t border-outline-variant flex flex-col gap-sm">
          <button className="w-full bg-primary-container text-on-primary-container font-label-md text-label-md py-sm rounded hover:brightness-110 transition-all flex items-center justify-center gap-xs">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Report
          </button>
          <div className="flex flex-col gap-xs mt-sm">
            <a className="flex items-center gap-md px-sm py-xs rounded text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200" href="#">
              <span className="material-symbols-outlined text-[20px]">help</span>
              <span className="font-body-sm text-body-sm">Support</span>
            </a>
            <a className="flex items-center gap-md px-sm py-xs rounded text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200" href="#">
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span className="font-body-sm text-body-sm">Log Out</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* TopNavBar */}
        <header className="bg-surface top-0 sticky z-30 border-b border-outline-variant flex justify-between items-center h-16 px-4 md:px-6 lg:px-8 shrink-0 gap-4">
          <div className="flex items-center gap-md shrink-0">
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface hidden lg:block truncate">Urban Intelligence Platform</h2>
            <button className="lg:hidden text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>

          {/* Search Bar & Actions */}
          <div className="flex items-center gap-4 lg:gap-lg flex-1 justify-end min-w-0">
            <div className="relative hidden md:block max-w-md w-full min-w-[200px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">search</span>
              <input 
                className="w-full bg-surface-container-low border border-outline-variant rounded-full py-2 pl-10 pr-4 text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                placeholder="Search analytics, districts..." 
                type="text"
              />
            </div>
            <div className="flex items-center gap-1 sm:gap-sm shrink-0 relative">
              <button onClick={() => setActiveDropdown(activeDropdown === 'search' ? null : 'search')} className="md:hidden w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-all duration-200 relative">
                <span className="material-symbols-outlined">search</span>
              </button>
              {activeDropdown === 'search' && (
                <div className="absolute top-12 right-0 mt-2 w-64 bg-surface-container-high border border-outline-variant rounded-xl shadow-lg p-2 z-50 md:hidden">
                  <input autoFocus className="w-full bg-surface-container-low border border-outline-variant rounded py-2 px-3 text-body-sm text-on-surface focus:outline-none focus:border-primary" placeholder="Search..." type="text" />
                </div>
              )}

              <button onClick={() => setActiveDropdown(activeDropdown === 'notifications' ? null : 'notifications')} className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-all duration-200 relative">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
              </button>
              {activeDropdown === 'notifications' && (
                <div className="absolute top-12 right-0 mt-2 w-80 bg-surface-container-high border border-outline-variant rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="p-3 border-b border-outline-variant bg-surface-container-highest">
                    <h4 className="font-label-md font-bold text-on-surface">Notifications</h4>
                  </div>
                  <div className="p-2 space-y-1">
                    <div className="p-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container-low cursor-pointer transition-colors">
                      <p className="font-label-md text-on-surface">Severe Congestion in CBD</p>
                      <p className="text-xs text-on-surface-variant mt-1">2 mins ago</p>
                    </div>
                    <div className="p-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container-low cursor-pointer transition-colors">
                      <p className="font-label-md text-on-surface">High Violation Rate: North Sector</p>
                      <p className="text-xs text-on-surface-variant mt-1">15 mins ago</p>
                    </div>
                  </div>
                  <div className="p-2 border-t border-outline-variant text-center cursor-pointer hover:bg-surface-container-highest">
                    <span className="text-xs font-label-md text-primary">Mark all as read</span>
                  </div>
                </div>
              )}

              <button onClick={() => setActiveDropdown(activeDropdown === 'settings' ? null : 'settings')} className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-all duration-200">
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

              <button onClick={() => setActiveDropdown(activeDropdown === 'profile' ? null : 'profile')} className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-all duration-200">
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
                    <li className="px-4 py-2 hover:bg-surface-container-low cursor-pointer text-error">Sign out</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Dashboard Canvas */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background flex flex-col">
          
          {activeTab === "Command Center" && (
            <>
              {/* Page Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
                <div>
              <div className="flex items-center gap-xs text-on-surface-variant font-label-md mb-xs">
                <span className="material-symbols-outlined text-[16px]">analytics</span>
                <span>TRAFFIC FLOW</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                <span className="text-primary">IMPACT ANALYTICS</span>
              </div>
              <h2 className="font-headline-lg text-2xl md:text-3xl font-bold text-on-surface">Traffic Impact & Violations</h2>
              <p className="font-body-md text-on-surface-variant mt-1">Real-time mapping of parking violations and average sector speed.</p>
            </div>
            
            <div className="flex gap-sm w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <select 
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full md:w-auto appearance-none bg-surface-container border border-outline-variant rounded py-2 pl-3 pr-8 text-body-sm focus:outline-none focus:border-primary text-on-surface"
                >
                  <option value="Live Data">Live Data</option>
                  <option value="Last 24 Hours">Last 24 Hours</option>
                  <option value="Last 7 Days">Last 7 Days</option>
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
              </div>
              <button className="bg-surface-container border border-outline-variant hover:border-primary text-on-surface px-md py-sm rounded transition-colors flex items-center gap-xs">
                <span className="material-symbols-outlined text-[18px]">filter_list</span>
                <span className="font-label-md hidden sm:inline">Filters</span>
              </button>
            </div>
          </div>

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-auto min-h-0 flex-1">
            
            {/* Left Column: Map & Metrics (Spans 2 columns on XL) */}
            <div className="xl:col-span-2 flex flex-col gap-6">
              
              {/* Top Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-surface-container-low border border-outline-variant rounded-lg p-sm relative overflow-hidden group">
                  <div className="flex items-center gap-xs text-on-surface-variant font-label-md mb-xs">
                    <span className="material-symbols-outlined text-[16px]">report</span>
                    <span>TOTAL VIOLATIONS</span>
                  </div>
                  <div className="font-display-lg text-3xl font-bold text-on-surface">{stats.totalViolations.toLocaleString()}</div>
                  <div className="flex items-center gap-xs mt-1 text-error font-body-sm text-xs">
                    <span className="material-symbols-outlined text-[16px]">trending_up</span>
                    <span>Live Tracking</span>
                  </div>
                </div>

                <div className="bg-surface-container-low border border-outline-variant rounded-lg p-sm relative overflow-hidden group">
                  <div className="flex items-center gap-xs text-on-surface-variant font-label-md mb-xs">
                    <span className="material-symbols-outlined text-[16px]">speed</span>
                    <span>AVG SPEED (CBD)</span>
                  </div>
                  <div className="font-display-lg text-3xl font-bold text-on-surface">{stats.avgSpeed} <span className="text-body-md text-on-surface-variant text-base">mph</span></div>
                  <div className="flex items-center gap-xs mt-1 text-error font-body-sm text-xs">
                    <span className="material-symbols-outlined text-[16px]">trending_down</span>
                    <span>-2.4 mph avg</span>
                  </div>
                </div>

                <div className="bg-surface-container-low border border-outline-variant rounded-lg p-sm relative overflow-hidden group">
                  <div className="flex items-center gap-xs text-on-surface-variant font-label-md mb-xs">
                    <span className="material-symbols-outlined text-[16px]">bus_alert</span>
                    <span>BUS LANE BLOCKS</span>
                  </div>
                  <div className="font-display-lg text-3xl font-bold text-on-surface">{stats.busBlocks.toLocaleString()}</div>
                  <div className="flex items-center gap-xs mt-1 text-on-surface-variant font-body-sm text-xs w-full">
                    <span className="w-full bg-surface-variant h-1 rounded-full overflow-hidden inline-block">
                      <div className="bg-error h-full" style={{ width: '65%' }}></div>
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container-low border border-outline-variant rounded-lg p-sm relative overflow-hidden group">
                  <div className="flex items-center gap-xs text-on-surface-variant font-label-md mb-xs">
                    <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                    <span>LOADING ZONES</span>
                  </div>
                  <div className="font-display-lg text-3xl font-bold text-on-surface">{stats.loadingZones.toLocaleString()}</div>
                  <div className="flex items-center gap-xs mt-1 text-on-surface-variant font-body-sm text-xs w-full">
                    <span className="w-full bg-surface-variant h-1 rounded-full overflow-hidden inline-block">
                      <div className="bg-secondary h-full" style={{ width: '82%' }}></div>
                    </span>
                  </div>
                </div>
              </div>

              {/* Map Area */}
              <div className="bg-surface-container-low border border-outline-variant rounded-lg flex-1 flex flex-col relative overflow-hidden min-h-[400px]">
                <div className="flex justify-between items-center px-4 py-3 border-b border-outline-variant shrink-0 bg-surface-container">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">map</span>
                    <h3 className="font-headline-md text-lg font-bold">Live Traffic Heatmap</h3>
                  </div>
                  <div className="flex items-center gap-2 font-label-md text-xs text-on-surface-variant">
                    <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
                    <span>LIVE STREAM</span>
                  </div>
                </div>
                
                <div className="flex-1 relative w-full h-full">
                  <Map
                    ref={mapRef}
                    initialViewState={{
                      longitude: 77.5946,
                      latitude: 12.9716,
                      zoom: 11
                    }}
                    style={{ width: "100%", height: "100%" }}
                    mapStyle={getMapStyleUrl(mapTheme) as any}
                  >
                    {hotspots && (
                      <Source type="geojson" data={hotspots}>
                        <Layer {...(heatmapLayer as any)} />
                        <Layer {...(pointLayer as any)} />
                      </Source>
                    )}
                  </Map>
                  
                  {/* Map Style Switcher Overlay */}
                  <div className="absolute top-4 left-4 bg-[#1e2025]/90 backdrop-blur-md border border-white/10 rounded-2xl p-1.5 shadow-xl z-10 flex items-center gap-4">
                    <div className="flex items-center gap-2 pl-3 hidden sm:flex">
                      <div className="w-2 h-2 rounded-full bg-error animate-pulse"></div>
                      <span className="font-bold text-white text-xs tracking-widest">MAP</span>
                      <span className="text-[9px] font-bold text-error border border-error/30 bg-error/10 px-1.5 py-0.5 rounded uppercase tracking-wider">Live</span>
                    </div>
                    
                    <div className="w-[1px] h-6 bg-white/10 hidden sm:block"></div>
                    
                    <div className="flex bg-black/40 rounded-xl p-1">
                      <button 
                        onClick={() => setMapTheme('dark')}
                        className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${mapTheme === 'dark' ? 'bg-[#3e52ff] text-white shadow-md' : 'text-white/60 hover:text-white'}`}
                      >
                        DARK
                      </button>
                      <button 
                        onClick={() => setMapTheme('light')}
                        className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${mapTheme === 'light' ? 'bg-[#3e52ff] text-white shadow-md' : 'text-white/60 hover:text-white'}`}
                      >
                        LIGHT
                      </button>
                      <button 
                        onClick={() => setMapTheme('satellite')}
                        className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${mapTheme === 'satellite' ? 'bg-[#3e52ff] text-white shadow-md' : 'text-white/60 hover:text-white'}`}
                      >
                        SATELLITE
                      </button>
                    </div>
                  </div>
                  
                  {/* Recenter Button */}
                  <button 
                    onClick={() => mapRef.current?.flyTo({ center: [77.5946, 12.9716], zoom: 11, duration: 1500 })}
                    className="absolute top-4 right-4 bg-surface-container-high/95 backdrop-blur-md border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary p-2 rounded-xl shadow-lg transition-all flex items-center justify-center group z-10"
                    title="Recenter Map"
                  >
                    <span className="material-symbols-outlined text-[20px] group-active:scale-90 transition-transform">my_location</span>
                  </button>
                  
                  {/* Map Legend Overlay */}
                  <div className="absolute bottom-6 left-4 md:bottom-8 md:left-6 bg-surface-container-high/95 backdrop-blur-md border border-outline-variant rounded-xl p-3 shadow-xl z-10 pointer-events-none">
                    <h4 className="font-label-md font-bold text-on-surface mb-3 text-[10px] uppercase tracking-wider text-on-surface-variant">Map Legend</h4>
                    
                    <div className="flex flex-col gap-3 text-xs text-on-surface font-label-md">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border-[1.5px] border-[#93000a] flex items-center justify-center relative">
                          <div className="w-1 h-1 rounded-full bg-[#93000a]"></div>
                        </div>
                        <span>Reported Violation</span>
                      </div>
                      
                      <div className="flex flex-col gap-1 mt-1">
                        <span className="mb-0.5">Violation Density Area</span>
                        <div className="w-32 h-2.5 rounded-full bg-gradient-to-r from-transparent via-[#14d1ff] to-[#93000a] border border-outline-variant/30"></div>
                        <div className="flex justify-between text-[10px] text-on-surface-variant px-0.5 mt-0.5">
                          <span>Sparse</span>
                          <span>Severe</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Sidebar: Active Hotspots */}
            <div className="bg-surface-container-low border border-outline-variant rounded-lg flex flex-col overflow-hidden">
              <div className="p-4 border-b border-outline-variant bg-surface-container flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-error text-xl">warning</span>
                  <h3 className="font-headline-md text-lg font-bold">Active Hotspots</h3>
                </div>
                <span className="text-xs bg-surface-variant px-2 py-1 rounded text-on-surface-variant">{hotspots?.features?.length || 0} Zones</span>
              </div>
              
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
                ) : hotspots?.features && hotspots.features.length > 0 ? hotspots.features.map((feature: any, idx: number) => (
                  <div 
                    key={idx} 
                    onClick={() => mapRef.current?.flyTo({ center: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]], zoom: 15, duration: 1500 })}
                    className="p-3 hover:bg-surface-container rounded cursor-pointer border-b border-outline-variant/50 last:border-0 transition-colors group flex items-start justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                        <h4 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{feature.properties.locationName}</h4>
                      </div>
                      <p className="text-xs text-on-surface-variant ml-3.5 mb-1">Severity: <span className="text-on-surface">{feature.properties.severityScore.toFixed(1)}/10</span></p>
                      <p className="text-xs text-on-surface-variant ml-3.5">Violations: <span className="text-on-surface">{feature.properties.violationCount} active</span></p>
                    </div>
                    {feature.properties.severityScore >= 8 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-error/20 text-error border border-error/30 mt-1 uppercase">Critical</span>
                    ) : feature.properties.severityScore >= 4 ? (
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
            </div>

          </div>
            </>
          )}

          {activeTab === "Analytics" && <AnalyticsTab />}
          {activeTab === "Economics" && <EconomicCalculator />}
          {activeTab === "Enforcement" && <EnforcementTab />}
          {activeTab === "Sensors" && <SensorsTab />}
        </main>
      </div>
    </div>
  );
}
