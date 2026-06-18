"use client";
import React, { useState, useEffect } from 'react';
import { apiUrl } from '../lib/api';

interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  routes_per_hour: number;
}

interface Violation {
  id: string;
  vehicle_id: string;
  stop_name: string;
  severity: number;
  severity_badge: string;
  cost_multiplier: number;
  timestamp: string;
  lat?: number;
  lng?: number;
  distance_m?: number;
}

type DetectResult =
  | { status: 'violation_detected'; violation: Violation & { distance_m: number } }
  | { status: 'ignored'; reason: string };

export default function DetectionTab() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [pingForm, setPingForm] = useState({ vehicle_id: "KA-01-AB-1234", lat: "", lng: "", speed: "0" });
  const [loading, setLoading] = useState(false);
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null);
  
  // Selection & Pipeline states
  const [selectedViolationId, setSelectedViolationId] = useState<string | null>(null);
  const [violationStatuses, setViolationStatuses] = useState<Record<string, { step: number; label: string }>>({});
  
  // Vahan registry mock data details helper
  const mockVahanDetails: Record<string, { class: string; owner: string; type: string }> = {
    "KA-01-AB-1234": { class: "Light Commercial Vehicle (LCV)", owner: "E-Commerce Delivery Fleet", type: "Commercial Transport" },
    "KA-03-MM-8899": { class: "Heavy Goods Carrier (HGV)", owner: "Logistics Freight Corp", type: "Heavy Commercial" },
    "KA-05-XY-5678": { class: "Motor Cab (Maxi)", owner: "Urban Commute Services", type: "Public Transport" },
  };

  useEffect(() => {
    const fetchViolations = () => {
      fetch(apiUrl('/api/violations/active'))
        .then(r => r.json())
        .then(d => {
          const vList = d.violations || [];
          setViolations(vList);
          if (vList.length > 0 && !selectedViolationId) {
            setSelectedViolationId(vList[0].id);
          }
          
          // Seed initial statuses for incoming entries
          setViolationStatuses(prev => {
            const next = { ...prev };
            vList.forEach((v: Violation) => {
              if (!next[v.id]) {
                next[v.id] = { step: 2, label: "🏍️ Interceptor En Route (ETA 4m)" }; // default state for older ones
              }
            });
            return next;
          });
        })
        .catch(console.error);
    };

    fetch(apiUrl('/api/stops'))
      .then(r => r.json())
      .then(d => {
        setStops(d.stops || []);
        if (d.stops && d.stops.length > 0) {
          setPingForm(prev => ({ ...prev, lat: d.stops[0].lat.toString(), lng: d.stops[0].lng.toString() }));
        }
      })
      .catch(console.error);
    
    fetchViolations();
    const interval = setInterval(fetchViolations, 10000);
    return () => clearInterval(interval);
  }, []);

  // Dispatch Status Pipeline Animation Tick
  useEffect(() => {
    const timer = setInterval(() => {
      setViolationStatuses(prev => {
        const next = { ...prev };
        let updated = false;
        Object.keys(next).forEach(id => {
          const curr = next[id];
          if (curr.step < 2) {
            updated = true;
            if (curr.step === 0) {
              next[id] = { step: 1, label: "🚨 Alert Pushed to BTP" };
            } else if (curr.step === 1) {
              next[id] = { step: 2, label: "🏍️ Interceptor En Route (ETA 3m)" };
            }
          }
        });
        return updated ? next : prev;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/detect'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: pingForm.vehicle_id,
          lat: parseFloat(pingForm.lat),
          lng: parseFloat(pingForm.lng),
          speed: parseFloat(pingForm.speed)
        })
      });
      const data = await res.json();
      setDetectResult(data);
      
      const active = await fetch(apiUrl('/api/violations/active')).then(r => r.json());
      const vList = active.violations || [];
      setViolations(vList);
      
      if (data.status === 'violation_detected') {
        const newV = data.violation;
        setSelectedViolationId(newV.id);
        
        // Start animation pipeline for this new simulation at step 0
        setViolationStatuses(prev => ({
          ...prev,
          [newV.id]: { step: 0, label: "🛰️ Analyzing Dwell Time..." }
        }));
      }
    } catch (err) {
      console.error("Detection failed", err);
    }
    setLoading(false);
  };

  const exportToCSV = () => {
    if (violations.length === 0) return;
    const headers = "Time,Location,Vehicle,Severity,Cost Impact\n";
    const csv = violations.map(v => 
      `"${new Date(v.timestamp).toLocaleString()}","${v.stop_name}","${v.vehicle_id}","${v.severity_badge}","${v.cost_multiplier}"`
    ).join("\n");
    
    const blob = new Blob([headers + csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `btp_interceptor_dispatch_${new Date().getTime()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearAllViolations = async () => {
    try {
      await fetch(apiUrl('/api/violations/clear'), { method: 'DELETE' });
      setViolations([]);
      setDetectResult(null);
      setSelectedViolationId(null);
    } catch (err) {
      console.error("Failed to clear", err);
    }
  };

  const selectedViolation = violations.find(v => v.id === selectedViolationId) || violations[0];
  const totalCost = violations.reduce((acc, v) => acc + v.cost_multiplier, 0);
  const criticalCount = violations.filter(v => v.severity_badge === 'Critical').length;

  // Selected stop data for formula inspectors
  const matchedStop = stops.find(s => s.name === selectedViolation?.stop_name) || stops[0];
  const busFrequency = matchedStop ? matchedStop.routes_per_hour : 12;
  const simulatedDelay = selectedViolation ? (selectedViolation.severity > 70 ? 2.5 : 1.2) : 1.5;
  const travelTimeCost = selectedViolation ? selectedViolation.cost_multiplier : 3510;

  // Resolved Vahan lookup details for active vehicle
  const activeVehicleId = selectedViolation?.vehicle_id || pingForm.vehicle_id;
  const vahanRegistry = mockVahanDetails[activeVehicleId] || {
    class: "Commercial Fleet Truck",
    owner: "Logistics Carrier Ltd",
    type: "Commercial Carrier"
  };

  return (
    <div className="flex-grow space-y-6 pb-12 text-on-surface">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="font-headline-md text-3xl font-bold text-accent-signal">Encroachment Detection Sandbox</h2>
          <p className="font-body-sm text-on-surface-variant">Verify spatial transit blockages, run Vahan registration sweeps, and push interceptor alerts.</p>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container border border-outline-variant rounded-lg p-4">
          <div className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">Active Violations</div>
          <div className="text-3xl font-black text-white">{violations.length}</div>
        </div>
        <div className="bg-surface-container border border-outline-variant rounded-lg p-4 border-b-4 border-b-error">
          <div className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">Critical Count</div>
          <div className="text-3xl font-black text-error">{criticalCount}</div>
        </div>
        <div className="bg-surface-container border border-outline-variant rounded-lg p-4 border-b-4 border-b-amber-500">
          <div className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">Live Economic Loss</div>
          <div className="text-3xl font-black text-amber-500">₹{totalCost.toLocaleString()}/hr</div>
        </div>
        <div className="bg-surface-container border border-outline-variant rounded-lg p-4">
          <div className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">Monitored Hotspots</div>
          <div className="text-3xl font-black text-white">{stops.length} <span className="text-sm font-normal text-on-surface-variant">stops</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: GPS Simulator and Radar / Vahan Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* GPS Ping Simulator */}
          <div className="bg-surface-container-high border border-outline-variant rounded-lg p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-accent-signal">satellite_alt</span>
              GPS Ping Simulator
            </h3>
            <p className="text-xs text-on-surface-variant mb-4">Paste coordinates from telemetry feeds to test spatial bus-stop blockages.</p>
            <form onSubmit={handleSimulate} className="space-y-4">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Vehicle ID / ANPR</label>
                <select 
                  value={pingForm.vehicle_id} 
                  onChange={e => setPingForm({...pingForm, vehicle_id: e.target.value})} 
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-sm text-white outline-none cursor-pointer"
                >
                  <option value="KA-01-AB-1234">KA-01-AB-1234 (E-Commerce LCV)</option>
                  <option value="KA-03-MM-8899">KA-03-MM-8899 (Freight HGV)</option>
                  <option value="KA-05-XY-5678">KA-05-XY-5678 (Maxi Cab)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1">Latitude</label>
                  <input type="text" value={pingForm.lat} onChange={e => setPingForm({...pingForm, lat: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-sm font-mono text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1">Longitude</label>
                  <input type="text" value={pingForm.lng} onChange={e => setPingForm({...pingForm, lng: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-sm font-mono text-white outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Speed (km/h)</label>
                <input type="number" value={pingForm.speed} onChange={e => setPingForm({...pingForm, speed: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-sm text-white outline-none" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-[#3e52ff] hover:bg-[#2f44f4] text-white font-bold py-2.5 rounded transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer shadow-lg shadow-[#3e52ff]/20">
                {loading ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">radar</span>}
                {loading ? 'Processing Ping...' : 'Check Violation'}
              </button>
            </form>

            {detectResult && (
              <div className={`mt-4 p-3 rounded text-sm shadow-inner ${detectResult.status === 'violation_detected' ? 'bg-error/20 border border-error/30 text-[#ffb4ab]' : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant'}`}>
                <div className="font-bold mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">{detectResult.status === 'violation_detected' ? 'warning' : 'info'}</span>
                  {detectResult.status === 'violation_detected' ? 'Violation Detected!' : 'Ping Ignored'}
                </div>
                {detectResult.status === 'violation_detected' ? (
                  <div className="space-y-1 mt-2 text-xs">
                    <p>Stop: <span className="font-mono text-white">{detectResult.violation.stop_name}</span></p>
                    <p>Proximity: <span className="font-mono text-white">{detectResult.violation.distance_m}m</span></p>
                    <p>Severity: <span className="font-mono text-white">{detectResult.violation.severity}/100</span></p>
                  </div>
                ) : (
                  <p className="text-xs">{detectResult.reason}</p>
                )}
              </div>
            )}
          </div>

          {/* Vahan Registry Lookup Card */}
          <div className="bg-surface-container-high border border-outline-variant rounded-lg p-5 shadow-lg relative">
            <h3 className="font-bold text-sm text-[#a6e6ff] uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              Vahan Registry Lookup
            </h3>
            <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/50 space-y-2 text-xs">
              <div className="flex justify-between border-b border-outline-variant/30 pb-1">
                <span className="text-on-surface-variant">Vehicle ID</span>
                <span className="font-mono text-white font-bold">{activeVehicleId}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/30 pb-1">
                <span className="text-on-surface-variant">Resolved Class</span>
                <span className="text-white font-semibold">{vahanRegistry.class}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/30 pb-1">
                <span className="text-on-surface-variant">Registered Owner</span>
                <span className="text-[#14d1ff] font-semibold">{vahanRegistry.owner}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Permit Scope</span>
                <span className="text-emerald-400 font-semibold">{vahanRegistry.type}</span>
              </div>
            </div>
            <p className="text-[10px] text-on-surface-variant mt-2 italic">*Resolves commercial registration properties to configure priority dispatch tiers.</p>
          </div>
        </div>

        {/* Right Column: Micro-Radar, Table & Dynamic Math Inspector */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-md items-stretch bg-surface-container border border-outline-variant rounded-lg overflow-hidden shadow-lg">
            
            {/* Dispatch Table Side */}
            <div className="flex flex-col min-w-0">
              <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-high">
                <h3 className="font-bold flex items-center gap-2 text-white">
                  <span className="material-symbols-outlined text-[#4cd6ff]">local_police</span>
                  BTP Interceptor Dispatch
                </h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={clearAllViolations} 
                    className="flex items-center gap-1 text-[11px] bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-3 py-1 rounded transition-colors cursor-pointer" 
                    disabled={violations.length === 0}
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span> Clear All
                  </button>
                  <button 
                    onClick={exportToCSV} 
                    className="flex items-center gap-1 text-[11px] bg-[#3e52ff] hover:bg-[#2f44f4] text-white px-3 py-1 rounded transition-colors cursor-pointer shadow-md shadow-[#3e52ff]/10" 
                    disabled={violations.length === 0}
                  >
                    <span className="material-symbols-outlined text-[14px]">download</span> Export Report
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#171f33] text-on-surface-variant text-[10px] uppercase tracking-widest border-b border-outline-variant sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left">Time</th>
                      <th className="px-4 py-3 text-left">Location</th>
                      <th className="px-4 py-3 text-left">Vehicle</th>
                      <th className="px-4 py-3 text-left">Pipeline Status</th>
                      <th className="px-4 py-3 text-right">Cost Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {violations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-on-surface-variant italic">No active encroachments logged. Ping a simulated telemetry report.</td>
                      </tr>
                    ) : violations.map((v) => {
                      const isSelected = selectedViolationId === v.id;
                      const status = violationStatuses[v.id] || { step: 2, label: "🏍️ Interceptor En Route (ETA 4m)" };
                      return (
                        <tr 
                          key={v.id} 
                          onClick={() => setSelectedViolationId(v.id)}
                          className={`hover:bg-surface-container-high transition-colors group cursor-pointer ${isSelected ? 'bg-primary/10 border-l-4 border-primary' : ''}`}
                        >
                          <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap text-left">{new Date(v.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</td>
                          <td className="px-4 py-3 font-medium truncate max-w-[150px] text-white text-left" title={v.stop_name}>{v.stop_name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-white/70 text-left">{v.vehicle_id}</td>
                          <td className="px-4 py-3 text-left">
                            <span className="text-[11px] text-[#14d1ff] flex items-center gap-1 font-semibold">
                              {status.step === 0 && <span className="w-2.5 h-2.5 rounded-full border-2 border-t-transparent border-[#14d1ff] animate-spin inline-block"></span>}
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[#a6e6ff] font-bold">₹{v.cost_multiplier}/hr</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Micro-Radar Radar Preview Box Side */}
            <div className="bg-[#171f33] border-l border-outline-variant p-4 flex flex-col justify-between items-center text-center">
              <div>
                <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest block mb-2">Micro-Radar Scope</span>
                <div className="w-[140px] h-[140px] rounded-full border border-outline-variant/40 relative flex items-center justify-center bg-black/40">
                  {/* Radar Circles */}
                  <div className="absolute inset-4 rounded-full border border-dashed border-[#14d1ff]/20"></div>
                  <div className="absolute inset-8 rounded-full border border-dashed border-[#14d1ff]/40"></div>
                  <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-40"></div>
                  
                  {/* Center Bus Stop */}
                  <div className="w-3 h-3 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/50 relative z-10">
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  </div>
                  
                  {/* Encroaching Dot */}
                  {selectedViolation && (
                    <div 
                      className="absolute w-3.5 h-3.5 bg-rose-500 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/80 z-20 animate-pulse"
                      style={{
                        top: '32%',
                        left: '42%',
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                    </div>
                  )}

                  {/* Sweep Line */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-[#14d1ff]/10 to-transparent animate-spin [animation-duration:4s]"></div>
                </div>
              </div>
              
              <div className="text-[10px] text-on-surface-variant mt-2 font-mono">
                {selectedViolation ? (
                  <>
                    <p className="text-white font-bold">{selectedViolation.vehicle_id}</p>
                    <p className="text-[#ffb4ab]">Encroached: {selectedViolation.distance_m || 12}m</p>
                  </>
                ) : (
                  <span className="italic">No target locked</span>
                )}
              </div>
            </div>

          </div>
          
          {/* Stop List Reference */}
          <div className="bg-[#171f33] border border-outline-variant rounded-lg p-4 shadow-inner">
             <h4 className="text-xs font-bold mb-3 flex items-center gap-2 text-white/50 uppercase tracking-widest">
                <span className="material-symbols-outlined text-[16px]">directions_bus</span>
                Dynamically Extracted Hotspots (From Dataset)
             </h4>
             <p className="text-[11px] text-white/40 mb-3">Click on any of the dataset-derived hotspots below to copy its coordinates into the GPS simulator and test the proximity logic.</p>
             <div className="flex flex-wrap gap-2">
                {stops.map(s => (
                  <div key={s.id} className="bg-surface-container-high px-2 py-1.5 rounded-md text-[11px] border border-hairline hover:border-primary/50 hover:bg-primary/10 cursor-pointer text-white/80 transition-all flex items-center gap-1" 
                       onClick={() => setPingForm({...pingForm, lat: s.lat.toString(), lng: s.lng.toString()})}
                       title="Click to copy coordinates to simulator">
                    <span className="w-1.5 h-1.5 bg-[#3e52ff] rounded-full inline-block"></span>
                    <span className="truncate max-w-[120px]">{s.name.split(',')[0]}</span>
                  </div>
                ))}
             </div>
          </div>

          {/* Dynamic Math Inspector */}
          <div className="bg-surface border border-hairline rounded-lg p-5 shadow-lg mt-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#14d1ff]"></div>
            <h4 className="text-xs font-bold mb-4 flex items-center gap-2 text-[#a6e6ff] uppercase tracking-widest">
              <span className="material-symbols-outlined text-[16px]">calculate</span>
              Live Formula Inspector (BPR Transit Impact)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-white/70">
              <div className="bg-canvas border border-hairline p-4 rounded-lg">
                <strong className="text-white block mb-2 text-sm font-semibold">Formula Parameters</strong>
                <ul className="space-y-2">
                  <li className="flex justify-between border-b border-outline-variant/20 pb-1">
                    <span>Target Intersection:</span>
                    <span className="text-[#14d1ff] font-bold font-mono truncate max-w-[150px]">{selectedViolation ? selectedViolation.stop_name.split(',')[0] : stops[0]?.name.split(',')[0]}</span>
                  </li>
                  <li className="flex justify-between border-b border-outline-variant/20 pb-1">
                    <span>Buses / Hour (Frequency):</span>
                    <span className="text-[#a6e6ff] font-bold font-mono">{busFrequency} buses/hr</span>
                  </li>
                  <li className="flex justify-between border-b border-outline-variant/20 pb-1">
                    <span>Commuter Density / Bus:</span>
                    <span className="text-white font-bold font-mono">65 Passengers</span>
                  </li>
                  <li className="flex justify-between border-b border-outline-variant/20 pb-1">
                    <span>Average Delay added:</span>
                    <span className="text-[#ffb4ab] font-bold font-mono">{simulatedDelay} mins</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Value of Travel Time (VoTT):</span>
                    <span className="text-[#4ade80] font-bold font-mono">₹180 / hr</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-canvas border border-hairline p-4 rounded-lg flex flex-col justify-between">
                <div>
                  <strong className="text-white block mb-2 text-sm font-semibold">Cascading Commuter Loss Calculation</strong>
                  <div className="bg-black/40 p-3 rounded-lg border border-outline-variant/30 text-center font-mono space-y-2">
                    <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">Operational Cost Equation</div>
                    <div className="text-[14px] font-bold text-[#14d1ff]">
                      Cost = (({busFrequency} × 65 × {simulatedDelay}) / 60) × ₹180
                    </div>
                    <div className="text-xl font-black text-emerald-400 mt-1">
                      = ₹{travelTimeCost.toLocaleString()}/hr
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-on-surface-variant italic mt-3">*Economic parameters represent actual Bengaluru commute delay calculations.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
