"use client";

import React, { useState } from 'react';

interface SelectedHotspot {
  id: number;
  locationName: string;
  policeStation: string;
  violationCount: number;
  laneCount: number;
  highwayType: string;
  capacityLoss: number;
  bprDelay: number;
  poiType?: string;
  distanceToPatrol?: number;
  enforcementRoi?: number;
}

interface PhysicsInspectorProps {
  hotspot: SelectedHotspot | null;
  onClose: () => void;
}

export default function PhysicsInspector({ hotspot, onClose }: PhysicsInspectorProps) {
  const [clearRate, setClearRate] = useState<number>(0);

  if (!hotspot) return null;

  // Simulate BPR delay based on enforcement clear rate
  const lanes = hotspot.laneCount;
  const baseCapacity = lanes * 1000;
  const simulatedViolations = Math.max(0, Math.round(hotspot.violationCount * (1 - clearRate / 100)));
  
  // Model traffic parameters
  const volume = simulatedViolations * 7;
  const capacityObstructed = Math.max(1, lanes - (1 - clearRate / 100)) * 1000;
  
  const delayObstructed = 10.0 * (1.0 + 0.15 * Math.pow(volume / capacityObstructed, 4));
  const delayFreeflow = 10.0 * (1.0 + 0.15 * Math.pow(volume / baseCapacity, 4));
  const bprDelaySim = Math.max(0.0, delayObstructed - delayFreeflow);
  
  const savedDelay = Math.max(0, hotspot.bprDelay - bprDelaySim);
  // Estimate savings: delay saved * occupancy (1.4) * commuter VoTT (₹120/hr) * volume scaling
  const economicSavings = Math.round(savedDelay * 1.4 * (120 / 60) * Math.max(10, volume / 10));

  // Determine severity color/badge for current state
  let severityBadge = "Moderate";
  let severityColor = "text-[var(--status-blue)] border-[var(--status-blue)]/30 bg-[var(--status-blue)]/10";
  if (hotspot.bprDelay >= 15) {
    severityBadge = "Critical";
    severityColor = "text-[var(--status-red)] border-[var(--status-red)]/30 bg-[var(--status-red)]/10";
  } else if (hotspot.bprDelay >= 5) {
    severityBadge = "High";
    severityColor = "text-[var(--status-amber)] border-[var(--status-amber)]/30 bg-[var(--status-amber)]/10";
  }

  return (
    <div className="absolute right-0 top-16 h-[calc(100vh-64px)] w-[350px] bg-panel border-l border-border z-40 flex flex-col p-6 shadow-none transition-transform duration-300">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-border mb-6">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-foreground text-xl">query_stats</span>
          <h3 className="font-headline-md text-lg font-bold text-foreground">Physics Inspector</h3>
        </div>
        <button 
          onClick={onClose}
          className="text-muted hover:text-foreground cursor-pointer"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-6 text-sm pb-4">
        {/* Section 1: Location & Severity */}
        <div>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${severityColor}`}>
              {severityBadge}
            </span>
            <span className="text-[10px] text-muted font-mono">ID: HS-{hotspot.id}</span>
          </div>
          <h4 className="font-bold text-base text-foreground">{hotspot.locationName}</h4>
          <p className="text-xs text-muted mt-1">Jurisdiction: {hotspot.policeStation} Division</p>
        </div>

        {/* Section 1.5: Flipkart Enforcement Context */}
        <div className="bg-background rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-muted font-bold text-[10px] tracking-wider uppercase mb-3">
            <span className="material-symbols-outlined text-xs">local_police</span>
            <span>Enforcement Context</span>
          </div>
          <div className="flex flex-col gap-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-muted">POI Type:</span>
              <span className="text-foreground uppercase text-[10px] font-bold">
                {hotspot.poiType === 'transit' ? '🚇 Transit Spillover' : hotspot.poiType === 'event' ? '🎟️ Event Arena' : '🛍️ Commercial Hub'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Nearest Patrol:</span>
              <span className="text-foreground">{hotspot.distanceToPatrol ? `${hotspot.distanceToPatrol.toFixed(1)} km` : 'N/A'}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-muted">Clearance ROI:</span>
              <span className="text-emerald-400 font-mono">{hotspot.enforcementRoi ? `${hotspot.enforcementRoi.toFixed(1)} min/km` : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Section 2: OSM Source Data */}
        <div className="bg-background rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-muted font-bold text-[10px] tracking-wider uppercase mb-3">
            <span className="material-symbols-outlined text-xs">public</span>
            <span>OSM Ground Truth</span>
          </div>
          <div className="flex flex-col gap-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-muted">Road Class:</span>
              <span className="text-foreground capitalize">{hotspot.highwayType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Base Capacity:</span>
              <span className="text-foreground">{hotspot.laneCount} Lanes</span>
            </div>
          </div>
        </div>

        {/* Section 3: Obstruction Physics */}
        <div className="bg-background rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-muted font-bold text-[10px] tracking-wider uppercase mb-3">
            <span className="material-symbols-outlined text-xs">grid_view</span>
            <span>Obstruction Analysis</span>
          </div>
          <div className="flex flex-col gap-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-muted">Obstructions:</span>
              <span className="text-foreground">1 Lane Blocked</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Capacity Loss:</span>
              <span className="text-[var(--status-red)] font-bold">-{hotspot.capacityLoss.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Deduplicated Sweeps:</span>
              <span className="text-foreground">{hotspot.violationCount} events</span>
            </div>
          </div>
        </div>

        {/* What-If Simulation Sandbox Panel */}
        <div className="bg-background rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-muted font-bold text-[10px] tracking-wider uppercase mb-3">
            <span className="material-symbols-outlined text-xs">tune</span>
            <span>What-If Sandbox</span>
          </div>
          
          <div className="space-y-4">
            <div className="group">
              <div className="flex justify-between items-center mb-1.5 text-xs">
                <span className="text-muted">Enforcement Clearance:</span>
                <span className="font-bold text-foreground">{clearRate}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="5"
                value={clearRate} 
                onChange={(e) => setClearRate(parseInt(e.target.value))}
                className="w-full h-1 bg-border rounded appearance-none cursor-pointer accent-foreground"
              />
            </div>

            <div className="pt-2 border-t border-border space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Simulated Delay:</span>
                <span className={savedDelay > 0 ? "text-[var(--status-green)] font-bold" : "text-foreground"}>
                  {bprDelaySim.toFixed(1)} mins
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Delay Mitigated:</span>
                <span className="text-[var(--status-green)] font-bold">-{savedDelay.toFixed(1)} mins</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Economic Savings:</span>
                <span className="text-[var(--status-green)] font-bold">₹{economicSavings.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Bureau of Public Roads Delay Math */}
        <div className="bg-background rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-muted font-bold text-[10px] tracking-wider uppercase mb-2">
            <span className="material-symbols-outlined text-xs">analytics</span>
            <span>BPR delay equation</span>
          </div>
          
          <div className="bg-panel border border-border rounded p-2.5 text-center font-mono text-[10px] text-foreground mb-3">
            T_f = T_0 × (1 + 0.15 × (V/C)^4)
          </div>

          <div className="flex flex-col gap-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-muted">Free Flow T_0:</span>
              <span className="text-foreground">10.0 mins</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Original BPR Delay:</span>
              <span className="text-[var(--status-amber)] font-bold">+{hotspot.bprDelay.toFixed(1)} mins</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={onClose}
          className="w-full bg-foreground text-background font-bold py-2.5 rounded-lg hover:opacity-90 transition-all cursor-pointer text-center font-mono text-xs uppercase mt-auto"
        >
          Close Inspector
        </button>
      </div>
    </div>
  );
}
