"use client";
import React, { useState, useEffect, useRef } from 'react';
import { apiUrl } from '../lib/api';

interface Camera {
  id: string;
  name: string;
  location: string;
  police_station: string;
  lat: number;
  lng: number;
  status: string;
  lanes_total: number;
  lanes_blocked: number;
  vehicles_detected: number;
  avg_dwell_mins: number;
  congestion_severity: number;
  severity_label: string;
  highway_type: string;
  violation_count: number;
  bpr_delay: number;
  location_type?: string;
  primary_issue?: string;
  choke_factor?: number;
  last_frame_ts: string;
}

interface Detection {
  id: string;
  vehicle_type: string;
  plate: string;
  bbox: number[];
  dwell_mins: number;
  lane_occupied: number;
  confidence: number;
  status: string;
}

interface LaneStatus {
  lane: number;
  status: string;
  flow_pct: number;
  blocked_by: string | null;
}

interface SeverityBreakdown {
  dwell_score: number;
  blockage_score: number;
  frequency_score: number;
  composite: number;
}

interface DwellBucket {
  range: string;
  count: number;
}

interface TimelinePoint {
  hour: number;
  severity: number;
}

interface AnalysisData {
  camera: Camera;
  detections: Detection[];
  lane_status: LaneStatus[];
  severity_breakdown: SeverityBreakdown;
  dwell_histogram: DwellBucket[];
  severity_timeline: TimelinePoint[];
}

function sevColor(sev: number): string {
  if (sev >= 75) return '#EF4444';
  if (sev >= 50) return '#F59E0B';
  if (sev >= 25) return '#3B82F6';
  return '#10B981';
}

function sevBg(sev: number): string {
  if (sev >= 75) return 'rgba(239,68,68,0.12)';
  if (sev >= 50) return 'rgba(245,158,11,0.12)';
  if (sev >= 25) return 'rgba(59,130,246,0.12)';
  return 'rgba(16,185,129,0.12)';
}

function statusDot(status: string) {
  if (status === 'ONLINE') return '#10B981';
  if (status === 'DEGRADED') return '#F59E0B';
  return '#EF4444';
}

export default function CctvIntelTab() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamId, setSelectedCamId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [scanAngle, setScanAngle] = useState(0);
  const scanRef = useRef<number | null>(null);
  const [cvLogs, setCvLogs] = useState<string[]>([]);
  const logsContainerRef = useRef<HTMLDivElement | null>(null);

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    setAiInsight(null);
  }, [selectedCamId]);

  const fetchAiInsight = async () => {
    if (!selectedCamId) return;
    setAiLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/v1/ai/cctv/${selectedCamId}`));
      const data = await res.json();
      setAiInsight(data.response);
    } catch (err) {
      setAiInsight("Failed to connect to AI server.");
    } finally {
      setAiLoading(false);
    }
  };

  // Live CV event-stream simulation hook
  useEffect(() => {
    const initialLogs = [
      `[SYSTEM] CV Engine v2.4 initialized on GPU_EDGE_07`,
      `[SYSTEM] Target classes loaded: Sedan, SUV, Van, Auto Rickshaw, Mini Bus`,
      `[SYSTEM] Calibration successful. Processing live camera feeds...`,
    ];
    setCvLogs(initialLogs);

    const logTemplates = [
      "Detected {vehicle} on Lane {lane} - Status: {status} ({conf}%)",
      "Lane {lane} flow rate updated to {flow}%",
      "Congestion severity index calculated: {sev}/100",
      "Camera link check: OK (Ping {ping}ms)",
      "Violation alert: {status} logged at {loc}",
    ];

    const vehicles = ["Sedan", "SUV", "Delivery Van", "Auto Rickshaw", "Mini Bus"];
    const statuses = ["ILLEGAL_PARKING", "DOUBLE_PARKED", "SPILLOVER_PARKING", "MOVING"];
    
    const interval = setInterval(() => {
      if (cameras.length === 0) return;
      const cam = cameras[Math.floor(Math.random() * cameras.length)];
      const template = logTemplates[Math.floor(Math.random() * logTemplates.length)];
      
      let msg = template
        .replace("{vehicle}", vehicles[Math.floor(Math.random() * vehicles.length)])
        .replace("{lane}", Math.floor(Math.random() * cam.lanes_total + 1).toString())
        .replace("{status}", statuses[Math.floor(Math.random() * statuses.length)])
        .replace("{conf}", (85 + Math.floor(Math.random() * 14)).toString())
        .replace("{flow}", (10 + Math.floor(Math.random() * 80)).toString())
        .replace("{sev}", Math.floor(cam.congestion_severity).toString())
        .replace("{ping}", (12 + Math.floor(Math.random() * 25)).toString())
        .replace("{loc}", cam.name);

      const timestamp = new Date().toLocaleTimeString();
      const formattedLog = `[${timestamp}] ${msg}`;

      setCvLogs(prev => {
        const next = [...prev, formattedLog];
        return next.slice(-25); // keep last 25 logs
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [cameras]);

  // Auto scroll logs
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [cvLogs]);

  // Fetch camera feeds
  useEffect(() => {
    fetch(apiUrl('/api/cctv/feeds'))
      .then(r => r.json())
      .then(d => {
        setCameras(d.cameras || []);
        if (d.cameras && d.cameras.length > 0 && !selectedCamId) {
          setSelectedCamId(d.cameras[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Fetch analysis for selected camera
  useEffect(() => {
    if (!selectedCamId) return;
    setAnalysisLoading(true);
    fetch(apiUrl(`/api/cctv/analysis/${selectedCamId}`))
      .then(r => r.json())
      .then(d => setAnalysis(d))
      .catch(console.error)
      .finally(() => setAnalysisLoading(false));
  }, [selectedCamId]);

  // Scan line animation
  useEffect(() => {
    const tick = () => {
      setScanAngle(prev => (prev + 1.5) % 360);
      scanRef.current = requestAnimationFrame(tick);
    };
    scanRef.current = requestAnimationFrame(tick);
    return () => { if (scanRef.current) cancelAnimationFrame(scanRef.current); };
  }, []);

  const onlineCount = cameras.filter(c => c.status === 'ONLINE').length;
  const avgDwell = cameras.length > 0 ? (cameras.reduce((a, c) => a + c.avg_dwell_mins, 0) / cameras.length) : 0;
  const totalBlocked = cameras.reduce((a, c) => a + c.lanes_blocked, 0);
  const avgSeverity = cameras.length > 0 ? (cameras.reduce((a, c) => a + c.congestion_severity, 0) / cameras.length) : 0;

  const selectedCamera = cameras.find(c => c.id === selectedCamId);

  return (
    <div className="flex-grow space-y-6 pb-12 text-foreground">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>
            CCTV Vision Intelligence
          </h2>
          <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
            Traffic-camera computer vision · Dwell time estimation · Lane blockage detection · Congestion severity scoring
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-xs font-mono" style={{ color: 'var(--muted-text)' }}>CV ENGINE ACTIVE</span>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg p-4 border" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted-text)' }}>Cameras Online</div>
          <div className="text-3xl font-black text-foreground flex items-baseline gap-2">
            {onlineCount}
            <span className="text-sm font-normal" style={{ color: 'var(--muted-text)' }}>/ {cameras.length}</span>
          </div>
        </div>
        <div className="rounded-lg p-4 border" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderBottom: '4px solid #F59E0B' }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted-text)' }}>Avg Dwell Time</div>
          <div className="text-3xl font-black" style={{ color: '#F59E0B' }}>{avgDwell.toFixed(1)}<span className="text-sm font-normal" style={{ color: 'var(--muted-text)' }}> min</span></div>
        </div>
        <div className="rounded-lg p-4 border" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderBottom: '4px solid #EF4444' }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted-text)' }}>Lanes Blocked</div>
          <div className="text-3xl font-black" style={{ color: '#EF4444' }}>{totalBlocked}</div>
        </div>
        <div className="rounded-lg p-4 border" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderBottom: `4px solid ${sevColor(avgSeverity)}` }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted-text)' }}>Network Severity</div>
          <div className="text-3xl font-black" style={{ color: sevColor(avgSeverity) }}>{avgSeverity.toFixed(0)}<span className="text-sm font-normal" style={{ color: 'var(--muted-text)' }}>/100</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Camera Grid */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--muted-text)' }}>
            <span className="material-symbols-outlined text-[18px]">videocam</span>
            Camera Network ({cameras.length})
          </h3>
          <div className="space-y-3 max-h-[calc(100vh-340px)] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-12" style={{ color: 'var(--muted-text)' }}>
                <span className="material-symbols-outlined animate-spin text-2xl">sync</span>
                <p className="text-sm mt-2">Loading camera feeds...</p>
              </div>
            ) : cameras.map(cam => {
              const isSelected = cam.id === selectedCamId;
              return (
                <div
                  key={cam.id}
                  onClick={() => setSelectedCamId(cam.id)}
                  className="rounded-lg p-4 border cursor-pointer transition-all duration-200"
                  style={{
                    background: isSelected ? sevBg(cam.congestion_severity) : 'var(--panel-bg)',
                    borderColor: isSelected ? sevColor(cam.congestion_severity) : 'var(--panel-border)',
                    borderLeftWidth: isSelected ? '4px' : '1px',
                  }}
                >
                  {/* Camera header */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: statusDot(cam.status) }}></span>
                        <span className="font-bold text-sm text-foreground truncate">{cam.name}</span>
                      </div>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--muted-text)' }}>{cam.location}</p>
                      {cam.location_type && (
                        <div className="flex flex-col gap-1 mt-1.5">
                          <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-sm border w-fit" style={{
                            background: 'rgba(59,130,246,0.08)',
                            borderColor: 'rgba(59,130,246,0.25)',
                            color: '#3B82F6'
                          }}>
                            {cam.location_type}
                          </span>
                          <span className="text-[9px] font-bold flex items-center gap-1" style={{ color: '#F59E0B' }}>
                            ⚠️ {cam.primary_issue}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end">
                      <span className="text-lg font-black" style={{ color: sevColor(cam.congestion_severity) }}>
                        {cam.congestion_severity.toFixed(0)}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{
                        background: sevBg(cam.congestion_severity),
                        color: sevColor(cam.congestion_severity)
                      }}>
                        {cam.severity_label}
                      </span>
                    </div>
                  </div>
                  {/* Mini metrics */}
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="text-center">
                      <div className="text-[10px] uppercase" style={{ color: 'var(--muted-text)' }}>Dwell</div>
                      <div className="text-xs font-bold text-foreground">{cam.avg_dwell_mins.toFixed(0)}m</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] uppercase" style={{ color: 'var(--muted-text)' }}>Blocked</div>
                      <div className="text-xs font-bold" style={{ color: '#EF4444' }}>{cam.lanes_blocked}/{cam.lanes_total}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] uppercase" style={{ color: 'var(--muted-text)' }}>Vehicles</div>
                      <div className="text-xs font-bold text-foreground">{cam.vehicles_detected}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CV Model Parameters Card */}
          <div className="rounded-lg border p-4" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-3.5 flex items-center gap-2" style={{ color: 'var(--muted-text)' }}>
              <span className="material-symbols-outlined text-[16px]">tune</span>
              CV Engine Parameters
            </h4>
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span style={{ color: 'var(--muted-text)' }}>Model Core:</span>
                <span className="font-mono px-2 py-0.5 rounded text-[10px] font-bold border" style={{
                  background: 'rgba(16,185,129,0.08)',
                  borderColor: 'rgba(16,185,129,0.25)',
                  color: '#10B981'
                }}>
                  YOLOv8x-Traffic-v2.4
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: 'var(--muted-text)' }}>Processor Node:</span>
                <span className="font-mono text-[10px] text-foreground font-semibold">GPU-EDGE-07 (TensorRT)</span>
              </div>
              
              {/* Confidence threshold slider */}
              <div className="space-y-1.5 pt-1 border-t" style={{ borderColor: 'var(--panel-border)' }}>
                <div className="flex justify-between text-[11px]">
                  <span style={{ color: 'var(--muted-text)' }}>Confidence Threshold</span>
                  <span className="font-mono font-bold text-emerald-400">85%</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--panel-border)' }}>
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: '85%' }}></div>
                </div>
              </div>

              {/* Edge node metrics */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center text-[10px]" style={{ borderColor: 'var(--panel-border)' }}>
                <div>
                  <div style={{ color: 'var(--muted-text)' }}>Throughput</div>
                  <div className="font-bold font-mono text-foreground mt-0.5">29.97 FPS</div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted-text)' }}>Latency</div>
                  <div className="font-bold font-mono text-emerald-400 mt-0.5">● 14.2ms</div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted-text)' }}>GPU Load</div>
                  <div className="font-bold font-mono text-foreground mt-0.5">42.8%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Live CV Event Stream Logs */}
          <div className="rounded-lg border p-4" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--muted-text)' }}>
              <span className="material-symbols-outlined text-[16px]">terminal</span>
              Live Event Stream
            </h4>
            <div ref={logsContainerRef} className="rounded border font-mono text-[9px] p-2.5 max-h-[170px] overflow-y-auto space-y-1" style={{ 
              background: 'rgba(0,0,0,0.25)', 
              borderColor: 'var(--panel-border)',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: '1.4'
            }}>
              {cvLogs.map((log, idx) => {
                let color = 'text-gray-400';
                if (log.includes('Detected')) color = 'text-sky-300';
                else if (log.includes('Violation') || log.includes('alert')) color = 'text-red-400';
                else if (log.includes('flow rate') || log.includes('severity')) color = 'text-amber-400';
                else if (log.includes('[SYSTEM]')) color = 'text-emerald-400';
                return (
                  <div key={idx} className={`${color} break-all font-mono`}>
                    {log}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Analysis Panel */}
        <div className="lg:col-span-2 space-y-5">
          {analysisLoading ? (
            <div className="rounded-lg border p-12 text-center" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
              <span className="material-symbols-outlined animate-spin text-3xl" style={{ color: 'var(--accent)' }}>sync</span>
              <p className="text-sm mt-3" style={{ color: 'var(--muted-text)' }}>Analyzing camera feed...</p>
            </div>
          ) : analysis && selectedCamera ? (
            <>
              {/* CV Viewport + Lane Status */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4">
                {/* Simulated CV Feed */}
                <div className="rounded-lg border overflow-hidden relative" style={{ background: '#0a0e1a', borderColor: 'var(--panel-border)' }}>
                  <div className="flex justify-between items-center px-4 py-2 border-b" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      <span className="text-xs font-bold text-foreground">LIVE — {selectedCamera.name}</span>
                    </div>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--muted-text)' }}>
                      {selectedCamera.location}
                    </span>
                  </div>
                  {/* Road viewport */}
                  <div className="relative w-full overflow-hidden" style={{ 
                    aspectRatio: '880 / 487', 
                    backgroundImage: `url(${
                      selectedCamera.location_type?.includes('Market')
                        ? '/cctv_bg_market.png'
                        : selectedCamera.location_type?.includes('Commercial')
                        ? '/cctv_bg_commercial.png'
                        : selectedCamera.location_type?.includes('Event')
                        ? '/cctv_bg_event.png'
                        : '/cctv_bg.png'
                    })`,
                    backgroundSize: selectedCamera.location_type?.includes('Metro') || selectedCamera.location_type?.includes('Commercial') || !selectedCamera.location_type
                      ? '100% 100%'
                      : 'cover',
                    backgroundPosition: 'center',
                    borderBottom: '1px solid var(--panel-border)'
                  }}>
                    {/* Dark filter overlay + CRT scanline pattern */}
                    <div className="absolute inset-0 pointer-events-none opacity-45 z-10" style={{
                      background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
                      backgroundSize: '100% 4px, 6px 100%',
                    }}></div>

                    <div className="absolute inset-0 pointer-events-none z-10" style={{
                      background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.6) 100%)',
                    }}></div>

                    {/* Calibrated CV Grid overlays (cyber-style grid) */}
                    <div className="absolute inset-0 pointer-events-none opacity-20 z-0" style={{
                      backgroundImage: 'radial-gradient(#10B981 0.75px, transparent 0.75px), radial-gradient(#10B981 0.75px, #0a0e1a 0.75px)',
                      backgroundSize: '24px 24px',
                      backgroundPosition: '0 0, 12px 12px',
                    }}></div>

                    {/* Viewfinder corner brackets */}
                    <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-white/40 pointer-events-none z-20"></div>
                    <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-white/40 pointer-events-none z-20"></div>
                    <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-white/40 pointer-events-none z-20"></div>
                    <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-white/40 pointer-events-none z-20"></div>

                    {/* Integrated CCTV HUD Telemetry Specs (Top Right) */}
                    <div className="absolute top-4 right-6 flex flex-col items-end font-mono text-[8px] text-emerald-400 select-none z-20 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] bg-black/60 p-2 rounded border border-emerald-500/25">
                      <div className="flex items-center gap-1 mb-1 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                        <span className="text-red-400">REC [RAW_STREAM]</span>
                      </div>
                      <div>CAM: {selectedCamera.name}</div>
                      <div>FPS: 29.97 | RES: 1080P</div>
                      <div>SHUTTER: 1/120s | ISO: 640</div>
                      <div>LENS: 8.5mm f/1.6</div>
                      <div>NETWORK: ONLINE</div>
                    </div>

                    {/* Calibrated No-Parking / Encroachment Zone Overlay */}
                    <div className="absolute pointer-events-none z-10 border border-dashed border-red-500/40 bg-red-950/5 rounded-sm" style={{
                      left: '12%',
                      top: '42%',
                      width: '28%',
                      height: '48%',
                    }}>
                      <div className="absolute top-1.5 left-2 font-mono text-[7px] font-bold text-red-400/90 uppercase tracking-wider drop-shadow-[0_1px_2.5px_rgba(0,0,0,0.95)]">
                        ⚠️ Monitored Encroachment
                      </div>
                      <div className="absolute bottom-1.5 left-2 font-mono text-[6.5px] text-red-400/80 uppercase tracking-tight">
                        Choke Point: {selectedCamera.primary_issue || "Illegal Parking"}
                      </div>
                    </div>

                    {/* Vehicle detections */}
                    {analysis.detections.map((det) => {
                      const [bx, by, bw, bh] = det.bbox;
                      // Convert coordinates from 400x300 canvas to responsive percentage:
                      const pctLeft = (bx / 400) * 100;
                      const pctTop = (by / 300) * 100;
                      const pctWidth = (bw / 400) * 100;
                      const pctHeight = (bh / 300) * 100;

                      const detColor = det.status === 'DOUBLE_PARKED'
                        ? '#EF4444' 
                        : det.status === 'ILLEGAL_PARKING'
                        ? '#F59E0B' 
                        : det.status === 'SPILLOVER_PARKING'
                        ? '#EC4899' 
                        : '#10B981';

                      const statusLabel = det.status === 'DOUBLE_PARKED'
                        ? 'DOUBLE PARKED'
                        : det.status === 'ILLEGAL_PARKING'
                        ? 'ILLEGAL PARKING'
                        : det.status === 'SPILLOVER_PARKING'
                        ? 'SPILLOVER ENCROACHMENT'
                        : 'MOVING';

                      return (
                        <div key={det.id} className="absolute z-20" style={{
                          left: `${pctLeft}%`,
                          top: `${pctTop}%`,
                          width: `${pctWidth}%`,
                          height: `${pctHeight}%`,
                          transition: 'all 0.3s ease',
                        }}>
                          {/* Vehicle Bounding Box */}
                          <div className="absolute inset-0" style={{
                            border: `1.5px solid ${detColor}`,
                            background: `${detColor}15`,
                            boxShadow: `0 0 6px ${detColor}20`
                          }}>
                            {/* Corner brackets inside bounding box */}
                            <div className="absolute -top-0.5 -left-0.5 w-1.5 h-1.5 border-t border-l rounded-tl" style={{ borderColor: detColor }}></div>
                            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 border-t border-r rounded-tr" style={{ borderColor: detColor }}></div>
                            <div className="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 border-b border-l rounded-bl" style={{ borderColor: detColor }}></div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 border-b border-r rounded-br" style={{ borderColor: detColor }}></div>

                            {/* Label tag inside bounding box */}
                            <div className="absolute top-0 left-0 pointer-events-none select-none z-30">
                              <span className="text-[7.2px] font-mono font-bold px-1 py-0.2 rounded-br whitespace-nowrap block" style={{
                                background: 'rgba(0,0,0,0.85)',
                                color: detColor,
                                borderBottom: `1.2px solid ${detColor}`,
                                borderRight: `1.2px solid ${detColor}`,
                              }}>
                                {det.vehicle_type} · {statusLabel} · {(det.confidence * 100).toFixed(0)}%{det.dwell_mins > 0 ? ` (${det.dwell_mins.toFixed(0)}m)` : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Scan line laser effect */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                      <div className="absolute left-0 right-0 h-0.5 opacity-80" style={{
                        top: `${(scanAngle / 360) * 100}%`,
                        background: 'linear-gradient(90deg, transparent, #10B981, transparent)',
                        boxShadow: '0 0 10px 2px rgba(16,185,129,0.5)',
                      }}></div>
                    </div>
                  </div>
                </div>

                {/* Lane Status + Severity Breakdown */}
                <div className="space-y-4">
                  {/* Lane Flow Status */}
                  <div className="rounded-lg border p-4" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--muted-text)' }}>
                      <span className="material-symbols-outlined text-[16px]">traffic</span>
                      Lane Flow Status
                    </h4>
                    <div className="space-y-2.5">
                      {analysis.lane_status.map(ls => {
                        const barColor = ls.status === 'BLOCKED' ? '#EF4444' : ls.status === 'SLOW' ? '#F59E0B' : '#10B981';
                        return (
                          <div key={ls.lane}>
                            <div className="flex justify-between text-[10px] mb-1">
                              <span className="font-bold text-foreground">Lane {ls.lane}</span>
                              <span className="font-mono font-bold" style={{ color: barColor }}>{ls.flow_pct}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--panel-border)' }}>
                              <div className="h-full rounded-full transition-all duration-500" style={{
                                width: `${ls.flow_pct}%`,
                                background: barColor,
                                boxShadow: `0 0 8px ${barColor}66`
                              }}></div>
                            </div>
                            <div className="text-[9px] mt-0.5" style={{ color: 'var(--muted-text)' }}>
                              {ls.status === 'BLOCKED' ? `⛔ Blocked by ${ls.blocked_by}` : ls.status === 'SLOW' ? '⚠️ Reduced flow' : '✅ Normal flow'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Severity Gauge */}
                  <div className="rounded-lg border p-4" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--muted-text)' }}>
                      <span className="material-symbols-outlined text-[16px]">speed</span>
                      Congestion Severity
                    </h4>
                    {/* Circular gauge */}
                    <div className="flex justify-center mb-3">
                      <div className="relative w-24 h-24">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--panel-border)" strokeWidth="8" />
                          <circle cx="50" cy="50" r="40" fill="none"
                            stroke={sevColor(analysis.severity_breakdown.composite)}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${analysis.severity_breakdown.composite * 2.51} 251`}
                            style={{ filter: `drop-shadow(0 0 6px ${sevColor(analysis.severity_breakdown.composite)}66)` }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xl font-black" style={{ color: sevColor(analysis.severity_breakdown.composite) }}>
                            {analysis.severity_breakdown.composite.toFixed(0)}
                          </span>
                          <span className="text-[8px] uppercase font-bold" style={{ color: 'var(--muted-text)' }}>/ 100</span>
                        </div>
                      </div>
                    </div>
                    {/* Sub-scores */}
                    <div className="space-y-1.5 text-[10px]">
                      {[
                        { label: 'Dwell Time', score: analysis.severity_breakdown.dwell_score, max: 40, color: '#F59E0B' },
                        { label: 'Lane Blockage', score: analysis.severity_breakdown.blockage_score, max: 30, color: '#EF4444' },
                        { label: 'Detection Freq', score: analysis.severity_breakdown.frequency_score, max: 30, color: '#3B82F6' },
                      ].map(s => (
                        <div key={s.label} className="flex items-center gap-2">
                          <span className="w-16 truncate font-medium" style={{ color: 'var(--muted-text)' }}>{s.label}</span>
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--panel-border)' }}>
                            <div className="h-full rounded-full" style={{ width: `${(s.score / s.max) * 100}%`, background: s.color }}></div>
                          </div>
                          <span className="font-mono font-bold w-8 text-right" style={{ color: s.color }}>{s.score.toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Detections Table + Dwell Histogram + Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Detection Log */}
                <div className="md:col-span-1 rounded-lg border overflow-hidden" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                  <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--panel-border)' }}>
                    <span className="material-symbols-outlined text-[16px]" style={{ color: 'var(--accent)' }}>visibility</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-foreground">Detections ({analysis.detections.length})</span>
                  </div>
                  <div className="max-h-[220px] overflow-y-auto">
                    {analysis.detections.map(det => {
                      const dc = det.status === 'ENCROACHING' ? '#EF4444' : det.status === 'PARKED' ? '#F59E0B' : '#10B981';
                      return (
                        <div key={det.id} className="px-4 py-2.5 border-b flex items-center gap-3" style={{ borderColor: `color-mix(in srgb, var(--panel-border) 50%, transparent)` }}>
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dc }}></div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-foreground truncate">{det.vehicle_type}</span>
                              <span className="text-[9px] px-1 py-0.5 rounded font-bold" style={{ background: `${dc}22`, color: dc }}>
                                {det.status}
                              </span>
                            </div>
                            <div className="flex gap-3 text-[10px] mt-0.5" style={{ color: 'var(--muted-text)' }}>
                              <span className="font-mono">{det.plate}</span>
                              <span>L{det.lane_occupied}</span>
                              {det.dwell_mins > 0 && <span style={{ color: '#F59E0B' }}>⏱ {det.dwell_mins.toFixed(0)}m</span>}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--muted-text)' }}>{(det.confidence * 100).toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dwell Time Distribution */}
                <div className="md:col-span-1 rounded-lg border p-4" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                  <h4 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--muted-text)' }}>
                    <span className="material-symbols-outlined text-[16px]">timer</span>
                    Dwell Distribution
                  </h4>
                  <div className="space-y-3">
                    {analysis.dwell_histogram.map((b, bi) => {
                      const maxCount = Math.max(1, ...analysis.dwell_histogram.map(h => h.count));
                      const pct = (b.count / maxCount) * 100;
                      const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];
                      return (
                        <div key={b.range}>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="font-medium" style={{ color: 'var(--muted-text)' }}>{b.range}</span>
                            <span className="font-mono font-bold" style={{ color: colors[bi] }}>{b.count} vehicles</span>
                          </div>
                          <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--panel-border)' }}>
                            <div className="h-full rounded-full transition-all duration-700" style={{
                              width: `${pct}%`,
                              background: `linear-gradient(90deg, ${colors[bi]}88, ${colors[bi]})`,
                              boxShadow: `0 0 10px ${colors[bi]}44`
                            }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[9px] mt-4 italic" style={{ color: 'var(--muted-text)' }}>
                    *Longer dwell = higher congestion severity. Vehicles parked &gt;15min receive critical weighting.
                  </p>
                </div>

                {/* 24-Hour Severity Timeline */}
                <div className="md:col-span-1 rounded-lg border p-4" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                  <h4 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--muted-text)' }}>
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    24h Severity Profile
                  </h4>
                  <div className="flex items-end gap-px h-[130px]">
                    {analysis.severity_timeline.map(tp => {
                      const maxSev = Math.max(1, ...analysis.severity_timeline.map(t => t.severity));
                      const h = (tp.severity / maxSev) * 100;
                      return (
                        <div key={tp.hour} className="flex-1 flex flex-col items-center justify-end group relative">
                          <div className="w-full rounded-t transition-all duration-300 group-hover:opacity-80" style={{
                            height: `${h}%`,
                            background: sevColor(tp.severity),
                            opacity: 0.7,
                            minHeight: '2px',
                          }}></div>
                          {tp.hour % 6 === 0 && (
                            <span className="text-[8px] mt-1 font-mono" style={{ color: 'var(--muted-text)' }}>{tp.hour}h</span>
                          )}
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 hidden group-hover:block z-20">
                            <div className="text-[9px] font-mono px-2 py-1 rounded whitespace-nowrap" style={{
                              background: 'var(--panel-bg)',
                              border: '1px solid var(--panel-border)',
                              color: 'var(--foreground)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                            }}>
                              {tp.hour}:00 — Severity: {tp.severity.toFixed(0)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[9px] mt-2" style={{ color: 'var(--muted-text)' }}>
                    <span>Morning Peak ↗</span>
                    <span>Evening Peak ↗</span>
                  </div>
                </div>
              </div>

              {/* Congestion Severity Formula Card */}
              <div className="rounded-lg border p-5 relative overflow-hidden" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'var(--accent)' }}></div>
                <h4 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                  <span className="material-symbols-outlined text-[16px]">calculate</span>
                  CV → Congestion Severity Formula
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="rounded-lg border p-4" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                    <strong className="text-foreground block mb-2 text-sm font-semibold">Input Parameters (from CV)</strong>
                    <ul className="space-y-2" style={{ color: 'var(--muted-text)' }}>
                      <li className="flex justify-between border-b pb-1" style={{ borderColor: `color-mix(in srgb, var(--panel-border) 50%, transparent)` }}>
                        <span>Avg Vehicle Dwell Time:</span>
                        <span className="font-mono font-bold" style={{ color: '#F59E0B' }}>{selectedCamera.avg_dwell_mins.toFixed(1)} min</span>
                      </li>
                      <li className="flex justify-between border-b pb-1" style={{ borderColor: `color-mix(in srgb, var(--panel-border) 50%, transparent)` }}>
                        <span>Lanes Blocked / Total:</span>
                        <span className="font-mono font-bold" style={{ color: '#EF4444' }}>{selectedCamera.lanes_blocked} / {selectedCamera.lanes_total}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Vehicles Detected:</span>
                        <span className="font-mono font-bold" style={{ color: '#3B82F6' }}>{selectedCamera.vehicles_detected}</span>
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-lg border p-4 flex flex-col justify-between" style={{ background: 'var(--background)', borderColor: 'var(--panel-border)' }}>
                    <div>
                      <strong className="text-foreground block mb-2 text-sm font-semibold">Congestion Severity Equation</strong>
                      <div className="rounded-lg border text-center font-mono space-y-2 p-3" style={{ background: 'rgba(0,0,0,0.2)', borderColor: `color-mix(in srgb, var(--panel-border) 50%, transparent)` }}>
                        <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted-text)' }}>Composite Score</div>
                        <div className="text-xs font-bold" style={{ color: 'var(--accent)' }}>
                          S = min({selectedCamera.avg_dwell_mins.toFixed(1)}×1.8, 40) + ({selectedCamera.lanes_blocked}/{selectedCamera.lanes_total})×30 + min({selectedCamera.vehicles_detected}×2.5, 30)
                        </div>
                        <div className="text-xl font-black" style={{ color: sevColor(analysis.severity_breakdown.composite) }}>
                          = {analysis.severity_breakdown.composite.toFixed(1)} / 100
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] italic mt-3" style={{ color: 'var(--muted-text)' }}>
                      *Transforms static violations into dynamic congestion-severity using real-time CV dwell + blockage signals.
                    </p>
                  </div>
                </div>
              </div>

              {/* Gemini AI Insight Card */}
              <div className="rounded-lg border p-5 relative overflow-hidden mt-4" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                <div className="absolute top-0 left-0 w-full h-1" style={{ background: '#a855f7' }}></div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: '#a855f7' }}>
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                    Gemini AI Vision Analysis
                  </h4>
                  {!aiInsight && !aiLoading && (
                    <button onClick={fetchAiInsight} className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider cursor-pointer transition-all hover:bg-purple-500/20" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' }}>
                      Generate Insight
                    </button>
                  )}
                </div>
                
                {aiLoading ? (
                   <div className="flex items-center gap-3 p-4 border rounded-lg" style={{ color: '#a855f7', background: 'rgba(168,85,247,0.05)', borderColor: 'rgba(168,85,247,0.2)' }}>
                     <span className="material-symbols-outlined animate-spin">sync</span>
                     <span className="text-sm font-mono">Gemini analyzing live camera telemetry...</span>
                   </div>
                ) : aiInsight ? (
                   <div className="p-4 border rounded-lg text-sm font-mono leading-relaxed" style={{ color: '#e9d5ff', background: 'rgba(168,85,247,0.05)', borderColor: 'rgba(168,85,247,0.2)', boxShadow: 'inset 0 0 20px rgba(168,85,247,0.05)' }}>
                     {aiInsight}
                   </div>
                ) : (
                   <div className="text-xs italic" style={{ color: 'var(--muted-text)' }}>
                     Click to generate a real-time AI analysis report of the current CCTV viewport using Gemini 3.5 Flash.
                   </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-lg border p-12 text-center" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
              <span className="material-symbols-outlined text-4xl" style={{ color: 'var(--muted-text)' }}>videocam_off</span>
              <p className="text-sm mt-3" style={{ color: 'var(--muted-text)' }}>Select a camera from the network to analyze</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
