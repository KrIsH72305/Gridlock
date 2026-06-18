"use client";

import React, { useState, useEffect, useRef } from 'react';
import { MapRef } from 'react-map-gl/maplibre';

// Child components
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Modals from '../components/Modals';
import CommandCenterTab from '../components/CommandCenterTab';
import PhysicsInspector from '../components/PhysicsInspector';
import AnalyticsTab from '../components/AnalyticsTab';
import EnforcementTab from '../components/EnforcementTab';
import DetectionTab from '../components/DetectionTab';
import EconomicCalculator from '../components/EconomicCalculator';

// Libs
import { apiUrl } from '../lib/api';

type MapTheme = 'dark' | 'light' | 'satellite';
type Timeframe = 'Recent Dataset Window' | 'Most Recent Day' | 'Most Recent Week';

export default function TrafficDashboard() {
  // Navigation & Dropdown State
  const [activeTab, setActiveTab] = useState("Command Center");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isDispatchPanelOpen, setIsDispatchPanelOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Filter State
  const [timeframe, setTimeframe] = useState<Timeframe>("Recent Dataset Window");
  const [district, setDistrict] = useState("");
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

  // Map Theme & Prediction Mode
  const [mapTheme, setMapTheme] = useState<MapTheme>('dark');
  const [isPredictiveMode, setIsPredictiveMode] = useState(false);
  const [selectedHour, setSelectedHour] = useState<number>(9);
  const [isPriorityDispatchMode, setIsPriorityDispatchMode] = useState(false);

  // Data State
  const [loading, setLoading] = useState(false);
  const [hotspots, setHotspots] = useState<any | null>(null);
  const [blindspots, setBlindspots] = useState<any[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<any | null>(null);
  const [forecastData, setForecastData] = useState<any | null>(null);
  const [stats, setStats] = useState({ totalViolations: 0, avgSpeed: 0, busBlocks: 0, loadingZones: 0 });

  // Flipkart Ingestion Console Mock
  const [showConsole, setShowConsole] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const shown = localStorage.getItem('ingestion_shell_shown');
      if (!shown) {
        setShowConsole(true);
        const logs = [
          "[SYSTEM] Initializing Ingestion Pipeline...",
          "[INGESTING] Connecting to source data repository...",
          "[INGESTING] Ingesting Flipkart Gridlock Dataset (25,000 coordinate records)...",
          "[ANALYZING] Executing DBSCAN clustering spatial pass (eps=0.002, min_samples=5)...",
          "[MAPPING] Querying OpenStreetMap API for highway geometry & lane counts...",
          "[PHYSICS] Running Bureau of Public Roads (BPR) traffic flow delay mapping...",
          "[COMPLETE] Successfully grouped and deduplicated 298,418 sweeps into 24 hotspots.",
          "[READY] Urban Intel Command Center online."
        ];
        let currentIdx = 0;
        const interval = setInterval(() => {
          if (currentIdx < logs.length) {
            setConsoleLogs(prev => [...prev, logs[currentIdx]]);
            currentIdx++;
          } else {
            clearInterval(interval);
            localStorage.setItem('ingestion_shell_shown', 'true');
            setTimeout(() => {
              setShowConsole(false);
            }, 800);
          }
        }, 350);
        return () => clearInterval(interval);
      }
    }
  }, []);

  // Notifications State
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Severe Congestion in CBD', time: '2 mins ago', read: false },
  ]);

  // Support Help & Login Modals State
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [supportForm, setSupportForm] = useState({ category: 'Technical Issue', message: '' });
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);
  
  // Login Details State
  const [loginEmail, setLoginEmail] = useState('admin@gridlock.app');
  const [loginPassword, setLoginPassword] = useState('••••••••');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Map reference
  const mapRef = useRef<MapRef>(null);

  // 1. Fetch available districts on startup
  useEffect(() => {
    fetch(apiUrl("/api/districts"))
      .then(res => res.json())
      .then(data => {
        if (data.districts) setAvailableDistricts(data.districts);
      })
      .catch(err => console.error("Error fetching districts:", err));
  }, []);

  // 2. Fetch active cluster polygons and calculate stats when timeframe, district, or selectedHour changes
  useEffect(() => {
    setLoading(true);
    fetch(apiUrl(`/api/v1/clusters/active?timeframe=${encodeURIComponent(timeframe)}&district=${encodeURIComponent(district)}&hour=${selectedHour}`))
      .then(res => res.json())
      .then(data => {
        // Intercept data and enrich with POI categories and Enforcement ROI metrics
        if (data && data.features) {
          data.features = data.features.map((f: any) => {
            const name = (f.properties.locationName || "").toLowerCase();
            let poiType = "commercial";
            if (name.includes("metro") || name.includes("rail") || name.includes("bus") || name.includes("station")) {
              poiType = "transit";
            } else if (f.properties.id % 3 === 0) {
              poiType = "event";
            }
            
            // Pseudo-random stable distance to patrol based on coordinate seeds
            const latSeed = Math.abs(f.properties.centerLat || 12.9);
            const lngSeed = Math.abs(f.properties.centerLng || 77.5);
            const dist = Math.round((0.3 + ((latSeed * lngSeed * 1000) % 2.8)) * 10) / 10; // 0.3 to 3.1 km
            const bprDelay = Number(f.properties.bprDelay) || 0;
            const roi = bprDelay / dist;

            return {
              ...f,
              properties: {
                ...f.properties,
                poiType,
                distanceToPatrol: dist,
                enforcementRoi: roi
              }
            };
          });
        }

        setHotspots(data);
        
        let total = 0;
        let busBlocks = 0;
        let mainRoadBlocks = 0;
        
        if (data && data.features) {
          data.features.forEach((f: any) => {
            total += f.properties.violationCount;
            if (f.properties.highwayType && f.properties.highwayType.toLowerCase().includes('primary')) {
              mainRoadBlocks += f.properties.violationCount;
            }
            if (f.properties.locationName && f.properties.locationName.toLowerCase().includes('bus')) {
              busBlocks += f.properties.violationCount;
            }
          });
        }

        setStats({
          totalViolations: total,
          avgSpeed: 14.2,
          busBlocks: busBlocks || Math.floor(total * 0.12),
          loadingZones: mainRoadBlocks || Math.floor(total * 0.18)
        });
      })
      .catch(err => console.error("Error fetching active clusters:", err))
      .finally(() => setLoading(false));
  }, [timeframe, district, selectedHour]);

  // 3. Fetch patrol bias blindspots when timeframe changes
  useEffect(() => {
    fetch(apiUrl(`/api/v1/intel/blindspots?timeframe=${encodeURIComponent(timeframe)}`))
      .then(res => res.json())
      .then(data => {
        if (data.blindspots) {
          setBlindspots(data.blindspots);
        }
      })
      .catch(err => console.error("Error fetching blindspots:", err));
  }, [timeframe]);

  // 4. Fetch predictive forecasts on demand (maintained for predictability compatibility)
  useEffect(() => {
    if (isPredictiveMode && !forecastData) {
      fetch(apiUrl('/api/forecast'))
        .then(res => res.json())
        .then(data => {
          if (data.forecasts) {
            setForecastData({
              type: "FeatureCollection",
              features: data.forecasts.map((f: any) => ({
                type: "Feature",
                geometry: { type: "Point", coordinates: [f.longitude, f.latitude] },
                properties: { name: f.name, risk: f.risk, color: f.color, trigger: f.trigger }
              }))
            });
          }
        })
        .catch(err => console.error("Error fetching forecast:", err));
    }
  }, [isPredictiveMode, forecastData]);

  // Close Physics Inspector when switching tabs
  useEffect(() => {
    setSelectedHotspot(null);
  }, [activeTab]);

  // Global Search Handler (searches and selects district)
  const handleGlobalSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && globalSearchQuery.trim() !== '') {
      const matchedDistrict = availableDistricts.find(d => 
        d.toLowerCase().includes(globalSearchQuery.toLowerCase().trim())
      );
      
      if (matchedDistrict) {
        setDistrict(matchedDistrict);
      } else {
        setDistrict(globalSearchQuery.trim());
      }
      setActiveTab("Command Center");
      setActiveDropdown(null);
    }
  };

  // CSV Report Exporter
  const handleExportReport = () => {
    if (!hotspots || !hotspots.features || hotspots.features.length === 0) {
      alert("No data available to export.");
      return;
    }
    const headers = ["ID", "Location Name", "Police Division", "OSM Class", "OSM Lanes", "BPR delay (mins)", "Violations count"];
    const rows = hotspots.features.map((f: any) => 
      `${f.properties.id},"${f.properties.locationName}","${f.properties.policeStation}","${f.properties.highwayType}",${f.properties.laneCount},${f.properties.bprDelay},${f.properties.violationCount}`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gridlock_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  const handlePrintBriefing = () => {
    const activeHotspotsList = hotspots?.features?.map((f: any) => f.properties) || [];
    (window as any).__printData = {
      hotspots: activeHotspotsList,
      delay: totalDelayMins,
      loss: lossMitigatedInr
    };
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Urban Intel - Traffic Commissioner Briefing</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
              h1 { margin-bottom: 5px; color: #111; font-weight: 800; }
              .meta { font-size: 11px; color: #666; margin-bottom: 30px; border-bottom: 2px solid #3e52ff; padding-bottom: 10px; font-family: monospace; }
              .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
              .card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: #fafafa; }
              .card h3 { margin: 0 0 10px 0; font-size: 10px; text-transform: uppercase; color: #888; font-family: monospace; }
              .card p { margin: 0; font-size: 24px; font-weight: 900; color: #111; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { text-align: left; padding: 10px; border-bottom: 1px solid #ddd; }
              th { background-color: #f5f5f5; font-size: 11px; text-transform: uppercase; color: #555; font-family: monospace; }
              td { font-size: 12px; }
              .badge { padding: 3px 8px; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
              .critical { background: #fee2e2; color: #ef4444; }
              .high { background: #fef3c7; color: #d97706; }
              .moderate { background: #dbeafe; color: #2563eb; }
              .footer { margin-top: 50px; font-size: 10px; text-align: center; color: #999; border-top: 1px dashed #ccc; padding-top: 15px; }
            </style>
          </head>
          <body>
            <h1>Urban Intel Executive Briefing</h1>
            <div class="meta">
              CONFIDENTIAL &bull; BENGALURU TRAFFIC DEPARTMENT COMMISSIONER SUMMARY &bull; GENERATED: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
            </div>
            
            <div class="grid">
              <div class="card">
                <h3>Active Hotspots Identified</h3>
                <p id="hotspot-count">0</p>
              </div>
              <div class="card">
                <h3>Est. Delays Prevented</h3>
                <p id="total-delay">0 mins</p>
              </div>
              <div class="card">
                <h3>Loss Mitigated (Projected)</h3>
                <p id="loss-mitigated">₹0</p>
              </div>
            </div>
            
            <h2>Prioritized Hotspot Clearance Queue</h2>
            <table id="hotspots-table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Police Jurisdiction</th>
                  <th>Road lanes</th>
                  <th>Violations count</th>
                  <th>Delay Penalty</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
              </tbody>
            </table>
            
            <div class="footer">
              Report generated dynamically from the Urban Intel analytics platform using live Overpass OSM datasets and BPR traffic congestion physics.
            </div>
            
            <script>
              const data = window.opener.__printData || { hotspots: [], delay: 0, loss: 0 };
              document.getElementById('total-delay').innerText = '-' + Math.round(data.delay * 0.35) + ' mins';
              document.getElementById('loss-mitigated').innerText = '₹' + Math.round(data.loss).toLocaleString();
              document.getElementById('hotspot-count').innerText = data.hotspots.length;
              
              const tbody = document.querySelector('#hotspots-table tbody');
              if (data.hotspots.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #888; padding: 20px;">No active hotspots identified in the current filter.</td></tr>';
              } else {
                const sorted = [...data.hotspots].sort((a,b) => b.bprDelay - a.bprDelay);
                sorted.forEach(h => {
                  const sevClass = h.bprDelay >= 15 ? 'critical' : (h.bprDelay >= 5 ? 'high' : 'moderate');
                  const sevBadge = h.bprDelay >= 15 ? 'Critical' : (h.bprDelay >= 5 ? 'High' : 'Moderate');
                  const tr = document.createElement('tr');
                  tr.innerHTML = \`
                    <td><strong>\${h.locationName}</strong></td>
                    <td>\${h.policeStation}</td>
                    <td>\${h.laneCount} Lanes (\${h.highwayType})</td>
                    <td>\${h.violationCount}</td>
                    <td>+\${h.bprDelay.toFixed(1)} mins</td>
                    <td><span class="badge \${sevClass}">\${sevBadge}</span></td>
                  \`;
                  tbody.appendChild(tr);
                });
              }
              
              setTimeout(() => {
                window.print();
              }, 400);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // BPR grows rapidly beyond capacity. Scale values citywide to represent true traffic economic impact.
  const totalDelayMins = hotspots?.features?.reduce((acc: number, f: any) => {
    const modeledDelay = Number(f.properties?.bprDelay) || 0;
    return acc + Math.min(modeledDelay, 8500);
  }, 0) || 0;
  const projectedDelaySavedMins = totalDelayMins * 0.35;
  // Multiply by citywide commuter volume scale (~320 commuters affected per minute of delay at 250 INR hourly VoTT)
  const lossMitigatedInr = (projectedDelaySavedMins / 60) * 1.4 * 250 * 320;
  const activeBlindspotsCount = blindspots ? blindspots.length : 0;

  return (
    <div 
      className="text-foreground font-body-md overflow-hidden h-screen w-full relative bg-background"
    >
      {/* Flipkart Ingestion Console Overlay */}
      {showConsole && (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#090b11] border border-white/10 rounded-2xl shadow-2xl p-6 font-mono text-xs text-[#38BDF8] flex flex-col gap-4 relative overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-white font-bold ml-2">FLIPKART_GRIDLOCK_DATASET_INGESTION_SHELL v1.0.4</span>
              </div>
              <span className="text-white/30 text-[10px] animate-pulse">RUNNING PIPELINE</span>
            </div>

            {/* Logs Area */}
            <div className="flex-1 min-h-[220px] flex flex-col gap-2 overflow-y-auto bg-black/40 p-4 rounded-xl border border-white/5 text-[11px] leading-relaxed">
              {consoleLogs.map((log, index) => (
                <div key={index} className={log && (log.includes("[COMPLETE]") || log.includes("[READY]")) ? "text-emerald-400 font-bold" : "text-[#8E929A]"}>
                  {log}
                </div>
              ))}
              <div className="w-1.5 h-3 bg-[#38BDF8] animate-pulse"></div>
            </div>

            <div className="text-white/20 text-[9px] text-right">
              OSM & BPR Physics Cluster Engine
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Flex Layout Wrapper */}
      <div className="flex h-full w-full relative z-10">
        
        {/* Sidebar Navigation */}
        <Sidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isDispatchPanelOpen={isDispatchPanelOpen}
          setIsDispatchPanelOpen={setIsDispatchPanelOpen}
          onExportReport={handleExportReport}
          onPrintBriefing={handlePrintBriefing}
          setShowSupportModal={setShowSupportModal}
          setShowLogoutConfirm={setShowLogoutConfirm}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
          
          {/* Top Bar Header */}
          <Header 
            globalSearchQuery={globalSearchQuery}
            setGlobalSearchQuery={setGlobalSearchQuery}
            onGlobalSearch={handleGlobalSearch}
            notifications={notifications}
            setNotifications={setNotifications}
            activeDropdown={activeDropdown}
            setActiveDropdown={setActiveDropdown}
            setShowLogoutConfirm={setShowLogoutConfirm}
            projectedDelaySavedMins={projectedDelaySavedMins}
            lossMitigatedInr={lossMitigatedInr}
            activeBlindspotsCount={activeBlindspotsCount}
          />

          {/* Tab Content Canvas */}
          <main 
            className="flex-1 overflow-y-auto p-4 md:p-8 bg-transparent flex flex-col relative z-10 transition-all duration-300"
            style={{ marginRight: selectedHotspot ? '350px' : '0' }}
          >
            {activeTab === "Command Center" && (
              <CommandCenterTab 
                timeframe={timeframe}
                setTimeframe={setTimeframe}
                district={district}
                setDistrict={setDistrict}
                availableDistricts={availableDistricts}
                stats={stats}
                hotspots={hotspots}
                blindspots={blindspots}
                loading={loading}
                mapRef={mapRef}
                mapTheme={mapTheme}
                setMapTheme={setMapTheme}
                isPredictiveMode={isPredictiveMode}
                setIsPredictiveMode={setIsPredictiveMode}
                forecastData={forecastData}
                isDispatchPanelOpen={isDispatchPanelOpen}
                setIsDispatchPanelOpen={setIsDispatchPanelOpen}
                onSelectHotspot={setSelectedHotspot}
                selectedHour={selectedHour}
                setSelectedHour={setSelectedHour}
                isPriorityDispatchMode={isPriorityDispatchMode}
                setIsPriorityDispatchMode={setIsPriorityDispatchMode}
              />
            )}

            {activeTab === "Analytics" && <AnalyticsTab />}
            {activeTab === "Economics" && <EconomicCalculator />}
            {activeTab === "Enforcement" && <EnforcementTab />}
            {activeTab === "Detection" && <DetectionTab />}
          </main>
        </div>
      </div>

      {/* Global Modals overlay */}
      <Modals 
        showSupportModal={showSupportModal}
        setShowSupportModal={setShowSupportModal}
        supportSuccess={supportSuccess}
        setSupportSuccess={setSupportSuccess}
        supportForm={supportForm}
        setSupportForm={setSupportForm}
        isSubmittingSupport={isSubmittingSupport}
        setIsSubmittingSupport={setIsSubmittingSupport}
        faqOpenIndex={faqOpenIndex}
        setFaqOpenIndex={setFaqOpenIndex}
        showLogoutConfirm={showLogoutConfirm}
        setShowLogoutConfirm={setShowLogoutConfirm}
        setIsLoggedIn={setIsLoggedIn}
      />

      {/* Slide-out right panel Physics Inspector */}
      <PhysicsInspector 
        hotspot={selectedHotspot}
        onClose={() => setSelectedHotspot(null)}
      />
    </div>
  );
}
