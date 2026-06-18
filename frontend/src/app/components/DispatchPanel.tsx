import React, { useState, useEffect } from 'react';
import { X, Truck, CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import { apiUrl } from '../lib/api';

interface DispatchTarget {
  id: string;
  latitude: number;
  longitude: number;
  location: string;
  violations: number;
  criticality: number;
  eta_mins: number;
  roi_score: number;
  action: string;
}

export default function DispatchPanel({ isOpen, onClose, district }: { isOpen: boolean, onClose: () => void, district: string }) {
  const [queue, setQueue] = useState<DispatchTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [dispatchedTargets, setDispatchedTargets] = useState<DispatchTarget[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetch(apiUrl(`/api/dispatch?district=${encodeURIComponent(district)}`))
        .then(res => res.json())
        .then(data => setQueue(data.dispatch_queue || []))
        .catch(err => console.error("Error fetching dispatch queue:", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, district]);

  const handleDispatch = (target: DispatchTarget) => {
    setDispatchedTargets(prev => [...prev, target]);
    // Simulate moving it to bottom or removing after 2 seconds
    setTimeout(() => {
      setQueue(prev => prev.filter(item => item.id !== target.id));
    }, 2000);
  };

  const handleExportDispatched = () => {
    if (dispatchedTargets.length === 0) {
      alert("No dispatched vehicles to export.");
      return;
    }
    const headers = ["Dispatch ID", "Action", "Location", "Violations", "ROI Score", "ETA (mins)"];
    const rows = dispatchedTargets.map(t => 
      `${t.id},"${t.action}","${t.location}",${t.violations},${t.roi_score},${t.eta_mins}`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dispatch_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-4 right-4 bottom-4 w-96 bg-[#1e2025]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-right-8 duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <Truck size={18} />
          </div>
          <div>
            <h3 className="font-bold text-white tracking-wide">Dispatch Priority Queue</h3>
            <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Priority-Based ROI Routing</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Stats row & Export */}
      <div className="flex flex-col border-b border-white/10 bg-black/10">
        <div className="grid grid-cols-2 divide-x divide-white/10">
          <div className="p-3 flex flex-col items-center">
            <span className="text-2xl font-black text-white">{queue.length}</span>
            <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Active Targets</span>
          </div>
          <div className="p-3 flex flex-col items-center">
            <span className="text-2xl font-black text-emerald-400">{dispatchedTargets.length}</span>
            <span className="text-[10px] text-emerald-400/50 uppercase tracking-widest font-bold">Dispatched</span>
          </div>
        </div>
        {dispatchedTargets.length > 0 && (
          <div className="px-4 pb-3">
            <button 
              onClick={handleExportDispatched}
              className="w-full bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider py-2 rounded-lg border border-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <Truck size={14} /> Export Dispatch Log CSV
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white/50 space-y-4">
            <Activity className="animate-spin" size={32} />
            <p className="text-sm font-medium animate-pulse">Calculating ROI network constraints...</p>
          </div>
        ) : queue.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white/50 text-center px-4">
            <CheckCircle2 size={48} className="mb-4 text-emerald-500/50" />
            <p className="text-lg font-bold text-white mb-1">Queue Clear</p>
            <p className="text-sm">No actionable parking violations detected in {district || 'the network'}.</p>
          </div>
        ) : (
          queue.map((target, index) => {
            const isDispatched = dispatchedTargets.some(t => t.id === target.id);
            const isTopPriority = index === 0 && !isDispatched;
            
            return (
              <div 
                key={target.id}
                className={`relative shrink-0 overflow-hidden rounded-xl border transition-all duration-300 ${
                  isDispatched 
                    ? 'border-emerald-500/30 bg-emerald-500/5 opacity-50' 
                    : isTopPriority 
                      ? 'border-[#f44336] bg-[#f44336]/10 shadow-[0_0_15px_rgba(244,67,54,0.15)]' 
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                {isTopPriority && (
                  <div className="absolute top-0 right-0 bg-[#f44336] text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-bl-lg">
                    Highest ROI
                  </div>
                )}
                
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className={`font-bold text-sm ${isDispatched ? 'text-emerald-400' : 'text-white'}`}>{target.location}</h4>
                      <p className="text-xs text-white/60">ID: {target.id} • {target.violations} Vehicles</p>
                    </div>
                    
                    {/* ROI Badge */}
                    <div className="flex flex-col items-end">
                      <div className="flex items-end gap-1">
                        <span className={`text-xl font-black leading-none ${
                          target.roi_score >= 15 ? 'text-[#f44336]' : 
                          target.roi_score >= 10 ? 'text-[#ff9800]' : 'text-white'
                        }`}>
                          {target.roi_score}
                        </span>
                        <span className="text-[10px] text-white/50 font-bold mb-0.5">ROI</span>
                      </div>
                      <span className="text-[10px] text-white/40 mt-1">{target.eta_mins}m ETA</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button 
                    onClick={() => handleDispatch(target)}
                    disabled={isDispatched}
                    className={`w-full mt-3 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                      isDispatched 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                        : isTopPriority
                          ? 'bg-[#f44336] text-white hover:bg-[#d32f2f] shadow-lg shadow-[#f44336]/20'
                          : 'bg-[#3e52ff] text-white hover:bg-[#3e52ff]/90'
                    }`}
                  >
                    {isDispatched ? (
                      <>
                        <CheckCircle2 size={14} />
                        Unit En Route
                      </>
                    ) : (
                      <>
                        <Truck size={14} />
                        {target.action}
                        <ChevronRight size={14} className="opacity-50" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
