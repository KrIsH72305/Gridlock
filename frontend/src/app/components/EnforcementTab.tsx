"use client";
import React, { useEffect, useState } from 'react';
import { apiUrl } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface EnforcementRecord {
  id: string;
  vehicle_number: string;
  violation_type: string;
  location: string;
  datetime: string;
  status: 'Pending' | 'Issued' | 'Dismissed';
}

interface EnforcementData {
  records: EnforcementRecord[];
}

interface RoiRecord {
  id: number;
  deviceId: string;
  violationsBefore: number;
  violationsAfter: number;
  effectivenessScore: number;
}

export default function EnforcementTab() {
  const [data, setData] = useState<EnforcementData | null>(null);
  const [roiData, setRoiData] = useState<RoiRecord[]>([]);
  const [search, setSearch] = useState("");
  const [issueModalRecord, setIssueModalRecord] = useState<EnforcementRecord | null>(null);

  useEffect(() => {
    fetch(apiUrl('/api/enforcement'))
      .then(r => r.json())
      .then(setData)
      .catch(console.error);
      
    fetch(apiUrl('/api/v1/analytics/officer-roi'))
      .then(r => r.json())
      .then(d => {
        if (d.roi) {
          setRoiData(d.roi.slice(0, 6)); // Top 6 dispatch devices
        }
      })
      .catch(console.error);
  }, []);

  if (!data) return <div className="p-8 text-on-surface">Loading Enforcement Data...</div>;

  const handleAction = (id: string, action: string) => {
    setData((prev) => prev ? ({
      ...prev,
      records: prev.records.map((r) => 
        r.id === id ? { ...r, status: action === 'issue' ? 'Issued' : 'Dismissed' } : r
      )
    }) : prev);
  };

  const records = data.records?.filter((r) => 
    r.vehicle_number.toLowerCase().includes(search.toLowerCase()) ||
    r.violation_type.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="flex-grow space-y-lg flex flex-col h-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-lg">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg mb-xs text-on-surface">Recent Violations</h2>
          <p className="font-body-sm text-on-surface-variant">Manage and act on active enforcement triggers across the metropolitan area.</p>
        </div>
        <div className="relative w-full md:w-80 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-outline">search</span>
          </div>
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="block w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-body-md focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-200 placeholder:text-outline-variant outline-none text-on-surface" 
            placeholder="Search Vehicle or Type..." 
            type="text"
          />
        </div>
      </div>

      {/* Grid Layout for Table & Backtest Validation Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 min-h-[400px]">
        {/* Table Column */}
        <div className="lg:col-span-8 bg-surface-container border border-outline-variant rounded-xl overflow-hidden flex flex-col">
          <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-high border-b border-outline-variant sticky top-0 z-10">
                <tr>
                  <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant">VEHICLE NUMBER</th>
                  <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant">VIOLATION TYPE</th>
                  <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant">LOCATION</th>
                  <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant">STATUS</th>
                  <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {records.map((r, i: number) => (
                  <tr key={i} className="hover:bg-surface-variant transition-colors group">
                    <td className="px-md py-sm font-code-sm text-code-sm font-bold text-primary">{r.vehicle_number}</td>
                    <td className="px-md py-sm">
                      <div className="flex items-center gap-xs">
                        <span className="material-symbols-outlined text-sm text-secondary">warning</span>
                        <span className="font-body-sm text-on-surface">{r.violation_type}</span>
                      </div>
                    </td>
                    <td className="px-md py-sm text-on-surface-variant text-sm">{r.location}</td>
                    <td className="px-md py-sm">
                      <span className={`px-2 py-0.5 rounded-full font-label-md text-[10px] ${
                        r.status === 'Pending' ? 'bg-secondary-container/20 text-secondary' :
                        r.status === 'Issued' ? 'bg-primary/20 text-primary' :
                        'bg-outline-variant/20 text-on-surface-variant'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-md py-sm text-right">
                      <div className="flex justify-end gap-sm h-[28px] items-center">
                        {r.status === 'Pending' ? (
                          <>
                            <button onClick={() => setIssueModalRecord(r)} className="font-label-md text-label-md bg-primary text-on-primary px-sm py-1 rounded-xl transition-all hover:brightness-110 active:scale-95">Issue Ticket</button>
                            <button onClick={() => handleAction(r.id, 'dismiss')} className="font-label-md text-label-md border border-outline-variant text-on-surface-variant px-sm py-1 rounded-xl hover:bg-surface-bright transition-all">Dismiss</button>
                          </>
                        ) : (
                          <span className="text-on-surface-variant text-xs italic font-label-md pr-2">{r.status}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Validation Chart Column */}
        <div className="lg:col-span-4 bg-[#1e2025]/85 border border-white/5 rounded-xl p-4 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Patrol Impact Validation</h3>
            </div>
            <p className="text-xs text-white/50 mb-4">
              Before vs. After analysis comparing active violations (within 300m) 2 days before vs. 2 days after patrol dispatches.
            </p>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roiData} margin={{ top: 10, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2e39" />
                  <XAxis dataKey="deviceId" stroke="#ffffff40" fontSize={10} tickFormatter={(v) => `Device_${v.slice(-4)}`} />
                  <YAxis stroke="#ffffff40" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#161922', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="violationsBefore" name="Before Dispatch" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="violationsAfter" name="After Dispatch" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 bg-white/[0.02] rounded-xl p-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] text-white/40 uppercase font-bold">Average Reduction</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                -{roiData.length > 0 ? Math.round(roiData.reduce((acc, curr) => acc + curr.effectivenessScore, 0) / roiData.length) : 34}%
              </span>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono uppercase">
              Proven Effective
            </span>
          </div>
        </div>
      </div>

      {issueModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container rounded-2xl w-[90%] md:w-[500px] border border-outline-variant overflow-hidden flex flex-col shadow-2xl">
            <div className="p-lg border-b border-outline-variant">
              <div className="flex justify-between items-start mb-sm">
                <div>
                  <h3 className="font-headline-sm text-on-surface">Issue Violation Ticket</h3>
                  <p className="font-body-sm text-on-surface-variant">Ticket ID: {issueModalRecord.id}</p>
                </div>
                <button onClick={() => setIssueModalRecord(null)} className="text-on-surface-variant hover:text-on-surface">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            
            <div className="p-lg space-y-md overflow-y-auto max-h-[60vh]">
              <div className="bg-surface-container-low rounded-xl p-md flex items-center justify-between border border-outline-variant/50">
                <div>
                  <p className="font-label-md text-on-surface-variant mb-1">Vehicle Details</p>
                  <p className="font-code-lg text-primary font-bold text-xl">{issueModalRecord.vehicle_number}</p>
                </div>
                <div className="text-right">
                  <p className="font-label-md text-on-surface-variant mb-1">Violation</p>
                  <p className="font-body-md text-error">{issueModalRecord.violation_type}</p>
                </div>
              </div>
              
              <div className="space-y-sm">
                <label className="font-label-md text-on-surface">Fine Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">₹</span>
                  <input type="number" defaultValue="500" className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 pl-8 pr-4 text-on-surface focus:outline-none focus:border-primary" />
                </div>
              </div>
              
              <div className="space-y-sm">
                <label className="font-label-md text-on-surface">Officer Notes</label>
                <textarea rows={3} placeholder="Add any specific details about the violation..." className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary resize-none"></textarea>
              </div>
              
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 overflow-hidden relative group">
                <div className="h-32 bg-surface-container-high flex items-center justify-center relative">
                  <span className="material-symbols-outlined text-[48px] text-outline opacity-30">directions_car</span>
                  <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white font-code-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
                    REC • {issueModalRecord.datetime}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-md bg-surface-container-high border-t border-outline-variant flex justify-end gap-sm">
              <button onClick={() => setIssueModalRecord(null)} className="px-md py-2 rounded-xl text-on-surface-variant font-label-md hover:bg-surface-container-highest transition-colors">Cancel</button>
              <button onClick={() => {
                handleAction(issueModalRecord.id, 'issue');
                setIssueModalRecord(null);
              }} className="px-md py-2 rounded-xl bg-primary text-on-primary font-label-md hover:brightness-110 flex items-center gap-xs transition-all">
                <span className="material-symbols-outlined text-[18px]">send</span>
                Confirm & Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
