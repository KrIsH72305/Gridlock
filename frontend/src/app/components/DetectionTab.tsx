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

  useEffect(() => {
    const fetchViolations = () => {
      fetch(apiUrl('/api/violations/active'))
        .then(r => r.json())
        .then(d => setViolations(d.violations || []))
        .catch(console.error);
    };

    fetch(apiUrl('/api/stops'))
      .then(r => r.json())
      .then(d => {
        setStops(d.stops || []);
        if (d.stops && d.stops.length > 0) {
          // Pre-fill the form with the first dynamic stop's coordinates to make the demo easy
          setPingForm(prev => ({ ...prev, lat: d.stops[0].lat.toString(), lng: d.stops[0].lng.toString() }));
        }
      })
      .catch(console.error);
    
    fetchViolations();
    const interval = setInterval(fetchViolations, 10000);
    return () => clearInterval(interval);
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
      setViolations(active.violations || []);
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
    } catch (err) {
      console.error("Failed to clear", err);
    }
  };

  const totalCost = violations.reduce((acc, v) => acc + v.cost_multiplier, 0);
  const criticalCount = violations.filter(v => v.severity_badge === 'Critical').length;

  return (
    <div className="flex-grow space-y-6 pb-12 text-on-surface">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="font-headline-md text-3xl font-bold text-primary">Detection Engine</h2>
          <p className="font-body-sm text-on-surface-variant">BMTC bus-stop encroachment simulator with proximity scoring</p>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
          <div className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">Active Violations</div>
          <div className="text-3xl font-black text-white">{violations.length}</div>
        </div>
        <div className="bg-surface-container border border-outline-variant rounded-xl p-4 border-b-4 border-b-error">
          <div className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">Critical Count</div>
          <div className="text-3xl font-black text-error">{criticalCount}</div>
        </div>
        <div className="bg-surface-container border border-outline-variant rounded-xl p-4 border-b-4 border-b-amber-500">
          <div className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">Live Economic Loss</div>
          <div className="text-3xl font-black text-amber-500">₹{totalCost.toLocaleString()}/hr</div>
        </div>
        <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
          <div className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">Monitored Hotspots</div>
          <div className="text-3xl font-black text-white">{stops.length} <span className="text-sm font-normal text-on-surface-variant">stops</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: GPS Simulator and Queue */}
        <div className="lg:col-span-1 space-y-6">
          {/* GPS Ping Simulator */}
          <div className="bg-surface-container-high border border-outline-variant rounded-xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">satellite_alt</span>
              GPS Ping Simulator
            </h3>
            <p className="text-xs text-on-surface-variant mb-4">Paste live coordinates from a Vahan API ping below to test the Haversine detection engine.</p>
            <form onSubmit={handleSimulate} className="space-y-4">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Vehicle ID / ANPR</label>
                <input type="text" value={pingForm.vehicle_id} onChange={e => setPingForm({...pingForm, vehicle_id: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-sm text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1">Latitude</label>
                  <input type="text" value={pingForm.lat} onChange={e => setPingForm({...pingForm, lat: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-sm font-mono text-white" />
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1">Longitude</label>
                  <input type="text" value={pingForm.lng} onChange={e => setPingForm({...pingForm, lng: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-sm font-mono text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Speed (km/h)</label>
                <input type="number" value={pingForm.speed} onChange={e => setPingForm({...pingForm, speed: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-sm text-white" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-[#3e52ff] hover:bg-[#2f44f4] text-white font-bold py-2.5 rounded transition-colors flex items-center justify-center gap-2 mt-2">
                {loading ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">radar</span>}
                {loading ? 'Processing Ping...' : 'Check Violation'}
              </button>
            </form>

            {detectResult && (
              <div className={`mt-4 p-3 rounded text-sm shadow-inner ${detectResult.status === 'violation_detected' ? 'bg-error/20 border border-error text-[#ffb4ab]' : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant'}`}>
                <div className="font-bold mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">{detectResult.status === 'violation_detected' ? 'warning' : 'info'}</span>
                  {detectResult.status === 'violation_detected' ? 'Violation Detected!' : 'Ping Ignored'}
                </div>
                {detectResult.status === 'violation_detected' ? (
                  <div className="space-y-1 mt-2 text-xs">
                    <p>Stop: <span className="font-mono text-white">{detectResult.violation.stop_name.substring(0,25)}...</span></p>
                    <p>Proximity: <span className="font-mono text-white">{detectResult.violation.distance_m}m</span></p>
                    <p>Severity: <span className="font-mono text-white">{detectResult.violation.severity}/100</span></p>
                  </div>
                ) : (
                  <p className="text-xs">{detectResult.reason}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dispatch Queue & Map */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dispatch Queue */}
          <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-high">
              <h3 className="font-bold flex items-center gap-2 text-white">
                <span className="material-symbols-outlined text-[#4cd6ff]">local_police</span>
                BTP Interceptor Dispatch
              </h3>
              <div className="flex items-center gap-3">
                <button onClick={clearAllViolations} className="flex items-center gap-1 text-[11px] bg-surface-container-highest hover:bg-white/10 text-white/80 px-3 py-1 rounded transition-colors border border-white/10" disabled={violations.length === 0}>
                  <span className="material-symbols-outlined text-[14px]">delete</span> Clear All
                </button>
                <button onClick={exportToCSV} className="flex items-center gap-1 text-[11px] bg-[#3e52ff]/20 hover:bg-[#3e52ff]/40 text-[#a6e6ff] px-3 py-1 rounded transition-colors border border-[#3e52ff]/30" disabled={violations.length === 0}>
                  <span className="material-symbols-outlined text-[14px]">download</span> Export Report
                </button>
                {violations.length > 0 && <span className="text-[10px] bg-error text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-widest animate-pulse">Live</span>}
              </div>
            </div>
            <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#171f33] text-on-surface-variant text-[10px] uppercase tracking-widest border-b border-outline-variant sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3 text-right">Cost Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {violations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-on-surface-variant italic">No active bus stop encroachments logged. Try pinging a simulation.</td>
                    </tr>
                  ) : violations.map((v) => (
                    <tr key={v.id} className="hover:bg-surface-container-high transition-colors group">
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{new Date(v.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</td>
                      <td className="px-4 py-3 font-medium truncate max-w-[200px] text-white" title={v.stop_name}>{v.stop_name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-white/70 bg-white/5 rounded px-1">{v.vehicle_id}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${v.severity_badge === 'Critical' ? 'bg-[#93000a] text-[#ffdad6]' : v.severity_badge === 'High' ? 'bg-amber-900/50 text-amber-500' : 'bg-surface-container-highest text-on-surface'}`}>
                          {v.severity_badge}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#a6e6ff] font-bold">₹{v.cost_multiplier}/hr</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Stop List Reference */}
          <div className="bg-[#171f33] border border-outline-variant rounded-xl p-4 shadow-inner">
             <h4 className="text-xs font-bold mb-3 flex items-center gap-2 text-white/50 uppercase tracking-widest">
                <span className="material-symbols-outlined text-[16px]">directions_bus</span>
                Dynamically Extracted Hotspots (From Dataset)
             </h4>
             <p className="text-[11px] text-white/40 mb-3">Click on any of the dataset-derived hotspots below to copy its coordinates into the GPS simulator and test the proximity logic.</p>
             <div className="flex flex-wrap gap-2">
                {stops.map(s => (
                  <div key={s.id} className="bg-surface-container-high px-2 py-1.5 rounded-md text-[11px] border border-white/5 hover:border-primary/50 hover:bg-primary/10 cursor-pointer text-white/80 transition-all flex items-center gap-1" 
                       onClick={() => setPingForm({...pingForm, lat: s.lat.toString(), lng: s.lng.toString()})}
                       title="Click to copy coordinates to simulator">
                    <span className="w-1.5 h-1.5 bg-[#3e52ff] rounded-full inline-block"></span>
                    <span className="truncate max-w-[120px]">{s.name.split(',')[0]}</span>
                  </div>
                ))}
             </div>
          </div>

          {/* Detection Formulas Explanation */}
          <div className="bg-[#1e2025]/80 backdrop-blur-md border border-[#3e52ff]/20 rounded-xl p-4 shadow-lg mt-6">
            <h4 className="text-xs font-bold mb-3 flex items-center gap-2 text-[#a6e6ff] uppercase tracking-widest">
              <span className="material-symbols-outlined text-[16px]">calculate</span>
              Detection Scoring Formulas
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-white/70">
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <strong className="text-white block mb-1">Severity Score (0-100)</strong>
                <p className="mb-2">Calculated by weighing three dynamic factors:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><span className="text-[#ffb4ab]">Proximity:</span> Uses Haversine Distance (&lt;10m = 40pts, &lt;25m = 25pts).</li>
                  <li><span className="text-[#a6e6ff]">Dwell Time:</span> Loitering duration (Simulated 15pts).</li>
                  <li><span className="text-[#4ade80]">Route Density:</span> Stops with more buses per hour get higher severity (+25 max).</li>
                </ul>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <strong className="text-white block mb-1">Cost Impact (₹/hr)</strong>
                <p className="mb-2">Measures the cascading economic loss to the city caused by the blockage:</p>
                <div className="font-mono text-[10px] bg-black/30 p-2 rounded text-[#a6e6ff] break-words">
                  Cost = (Buses/hr × 65 Pax × 1.5 min delay / 60) × ₹100 VoTT
                </div>
                <p className="mt-2 text-[10px] italic">*VoTT = Value of Travel Time.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
