"use client";
import React, { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiUrl } from '../lib/api';

interface BreakdownItem {
  type: string;
  count: number;
}

interface AnalyticsData {
  violation_breakdown: BreakdownItem[];
  vehicle_breakdown: BreakdownItem[];
  time_distribution: { day: number; hour: number; count: number }[];
  trend: { period: string; count: number }[];
  metrics?: {
    totalViolations?: number;
    estimatedClearanceTime?: string;
    revenueImpact?: string;
    periodLabel?: string;
    datasetEnd?: string;
  };
}

export default function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeframe, setTimeframe] = useState('Last 30 Days');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(apiUrl(`/api/analytics?timeframe=${encodeURIComponent(timeframe)}`))
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [timeframe]);

  if (!data) return <div className="p-8 text-on-surface">Loading Analytics...</div>;

  const totalBreakdown = data.violation_breakdown.reduce((sum, item) => sum + item.count, 0);
  const chartColors = ["#bdc2ff", "#14d1ff", "#7d37ff", "#ffb95f", "#ffb4ab"];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const heatmap = new Map(data.time_distribution.map(item => [`${item.day}-${item.hour}`, item.count]));
  const maxHeat = Math.max(1, ...data.time_distribution.map(item => item.count));
  const peakTrend = Math.max(0, ...data.trend.map(item => item.count));

  return (
    <div className="flex-grow space-y-lg">
      <div className="flex flex-col gap-xs">
        <div className="flex justify-between items-end">
          <h2 className="font-headline-md text-headline-md-mobile text-on-surface">Violation Analytics</h2>
          <label className="flex items-center gap-xs px-sm py-xs bg-surface-container-high rounded-lg border border-outline-variant text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            <select className="bg-transparent font-label-md text-label-md outline-none cursor-pointer" value={timeframe} onChange={(event) => { setLoading(true); setTimeframe(event.target.value); }} aria-label="Analytics period">
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>All Dataset Records</option>
            </select>
          </label>
        </div>
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <div className="glass-card p-md rounded-xl flex justify-between items-center bg-surface-container/50 border border-outline-variant">
          <div className="space-y-xs">
            <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Total Violations</p>
            <h3 className="font-headline-lg text-headline-lg-mobile text-on-surface">{loading ? '...' : data.metrics?.totalViolations?.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[28px]" style={{fontVariationSettings: "'FILL' 1"}}>gavel</span>
          </div>
        </div>
        
        <div className="flex gap-md pb-xs">
          <div className="glass-card p-md rounded-xl flex-1 bg-surface-container/50 border border-outline-variant">
            <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-sm">Est. Clearance Time</p>
            <div className="flex items-baseline gap-xs">
              <span className="font-headline-md text-headline-md text-secondary">{data.metrics?.estimatedClearanceTime}</span>
            </div>
          </div>
          <div className="glass-card p-md rounded-xl flex-1 bg-surface-container/50 border border-outline-variant">
            <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-sm">Revenue Impact · {data.metrics?.periodLabel}</p>
            <div className="flex items-baseline gap-xs">
              <span className="font-headline-md text-headline-md text-tertiary">{data.metrics?.revenueImpact}</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">EST.</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-md">
        {/* Violation Breakdown */}
        <section className="glass-card rounded-xl p-md bg-surface-container/50 border border-outline-variant">
          <h3 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-widest mb-md">Violation Share</h3>
          <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-md items-center">
            <div className="h-[220px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.violation_breakdown} dataKey="count" nameKey="type" innerRadius={62} outerRadius={92} paddingAngle={2} stroke="none">
                    {data.violation_breakdown.map((item, index) => <Cell key={item.type} fill={chartColors[index % chartColors.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => Number(value).toLocaleString()} contentStyle={{ background: '#171a28', border: '1px solid #444656', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-headline-md text-on-surface">{totalBreakdown.toLocaleString()}</span>
                <span className="text-xs text-on-surface-variant uppercase">Top 5 total</span>
              </div>
            </div>
            <div className="space-y-sm min-w-0">
              {data.violation_breakdown.map((item, index) => (
                <div key={item.type} className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-sm text-sm">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                  <span className="text-on-surface-variant truncate" title={item.type}>{item.type}</span>
                  <span className="font-mono text-on-surface tabular-nums">{item.count.toLocaleString()} · {totalBreakdown ? ((item.count / totalBreakdown) * 100).toFixed(1) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trend */}
        <section className="glass-card rounded-xl p-md bg-surface-container/50 border border-outline-variant">
          <div className="flex justify-between items-start mb-md gap-md">
            <h3 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-widest">Violation Trend</h3>
            <span className="text-xs text-on-surface-variant">Peak {peakTrend.toLocaleString()}</span>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#14d1ff" stopOpacity={0.4}/><stop offset="100%" stopColor="#14d1ff" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid stroke="#444656" strokeOpacity={0.35} vertical={false} />
                <XAxis dataKey="period" tick={{ fill: '#aeb0bf', fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis tick={{ fill: '#aeb0bf', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => [Number(value).toLocaleString(), 'Violations']} contentStyle={{ background: '#171a28', border: '1px solid #444656', borderRadius: 8 }} />
                <Area type="monotone" dataKey="count" stroke="#14d1ff" strokeWidth={2} fill="url(#trendFill)" activeDot={{ r: 5, fill: '#ffb95f' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Time distribution */}
      <section className="glass-card rounded-xl p-md bg-surface-container/50 border border-outline-variant overflow-x-auto">
        <div className="flex justify-between items-start gap-md mb-md">
          <div>
            <h3 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-widest">Peak-Time Distribution</h3>
            <p className="text-xs text-on-surface-variant mt-xs">Violations by weekday and hour</p>
          </div>
          <div className="flex items-center gap-xs text-[10px] text-on-surface-variant"><span>Low</span><span className="w-16 h-2 rounded-full bg-gradient-to-r from-[#252838] to-[#7d37ff]"/><span>High</span></div>
        </div>
        <div className="min-w-[720px] grid grid-cols-[38px_repeat(24,minmax(20px,1fr))] gap-1 items-center">
          <span />
          {Array.from({ length: 24 }, (_, hour) => <span key={hour} className="text-[9px] text-on-surface-variant text-center">{hour % 3 === 0 ? hour.toString().padStart(2, '0') : ''}</span>)}
          {dayNames.flatMap((day, dayIndex) => [
            <span key={`${day}-label`} className="text-[10px] text-on-surface-variant">{day}</span>,
            ...Array.from({ length: 24 }, (_, hour) => {
              const count = heatmap.get(`${dayIndex}-${hour}`) || 0;
              const intensity = count / maxHeat;
              return <div key={`${day}-${hour}`} title={`${day} ${hour.toString().padStart(2, '0')}:00 · ${count.toLocaleString()} violations`} className="aspect-square min-h-5 rounded-[3px] border border-white/5" style={{ backgroundColor: count ? `rgba(125, 55, 255, ${0.18 + intensity * 0.82})` : '#252838' }} />;
            })
          ])}
        </div>
      </section>

      {/* Vehicle Breakdown */}
      <section className="space-y-md pb-12">
        <h3 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-widest">Vehicle Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          {data.vehicle_breakdown?.map((v, i: number) => {
            const icons = ["directions_car", "local_shipping", "two_wheeler", "airport_shuttle", "directions_bus"];
            const iconCols = ["text-primary", "text-secondary", "text-tertiary", "text-outline", "text-error"];
            return (
              <div key={i} className="glass-card p-md rounded-xl flex flex-col gap-sm bg-surface-container/50 border border-outline-variant">
                <div className="flex justify-between items-start">
                  <span className={`material-symbols-outlined ${iconCols[i % iconCols.length]}`}>{icons[i % icons.length]}</span>
                  <span className="text-on-surface font-bold font-body-md text-body-md">{v.count}</span>
                </div>
                <p className="font-label-md text-[11px] text-on-surface-variant">{v.type}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
