"use client";

import React, { useState } from 'react';
import { ChevronDown, Calculator, IndianRupee, Clock, TrendingUp, Activity, CarFront, Users, AlertTriangle, HelpCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function EconomicCalculator() {
  const [laneWidth, setLaneWidth] = useState<number>(3.5);
  const [carWidth, setCarWidth] = useState<number>(1.8);
  const [arrivingFlow, setArrivingFlow] = useState<number>(1400);
  const [durationMin, setDurationMin] = useState<number>(45);
  const [occupancy, setOccupancy] = useState<number>(1.4);
  const [vott, setVott] = useState<number>(100);
  const [showBreakdown, setShowBreakdown] = useState<boolean>(true);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  const BASE_CAPACITY = 1800;
  const effectiveWidth = Math.max(0, laneWidth - carWidth);
  const blockedCapacity = Math.floor(BASE_CAPACITY * (effectiveWidth / laneWidth));
  const capacityDrop = BASE_CAPACITY - blockedCapacity;
  const excessDemand = Math.max(0, arrivingFlow - blockedCapacity);
  const durationHours = durationMin / 60;
  const totalDelayVehHours = 0.5 * excessDemand * Math.pow(durationHours, 2);
  const totalDelayVehMin = Math.round(totalDelayVehHours * 60);
  const personHoursLost = totalDelayVehHours * occupancy;
  const economicCost = personHoursLost * vott;
  const queueGrowthPerMin = excessDemand / 60;

  // Chart 1: Exponential Delay Data
  const delayData = [];
  const maxMins = Math.max(durationMin, 15);
  for (let m = 0; m <= maxMins; m += Math.max(1, Math.floor(maxMins / 10))) {
    const dHours = m / 60;
    const vehHours = 0.5 * excessDemand * Math.pow(dHours, 2);
    const cost = Math.round(vehHours * occupancy * vott);
    delayData.push({ minute: m, cost: cost });
  }

  // Chart 2: Capacity Comparison Data
  const capacityData = [
    { name: 'Base Cap', value: BASE_CAPACITY, fill: '#3b82f6' },
    { name: 'Effective Cap', value: blockedCapacity, fill: '#ef4444' }
  ];

  return (
    <div className="w-full text-white font-sans pb-20">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header section with gradient */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-8 md:p-10 shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600"></div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  <Activity className="w-6 h-6" />
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                  Congestion Cost Engine
                </h1>
              </div>
              <p className="text-gray-400 max-w-2xl text-sm md:text-base leading-relaxed">
                Translate physical traffic blockages into real-world economic damage. Adjust the parameters below to simulate how a single illegally parked vehicle cascades into massive financial losses using <span className="text-blue-400 font-semibold">LWR Shockwave Theory</span>.
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col items-end min-w-[200px]">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Live Damage Estimate</span>
              <div className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-400">
                ₹{Math.round(economicCost).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Guide */}
        <div className="bg-[#121212] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
          <button 
            onClick={() => setShowGuide(!showGuide)}
            className="w-full p-5 flex justify-between items-center bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
          >
            <div className="font-bold text-base flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-400" />
              How to use this Calculator
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showGuide ? 'rotate-180' : ''}`} />
          </button>
          
          <div className={`transition-all duration-500 ease-in-out ${showGuide ? 'max-h-[800px] opacity-100 border-t border-white/5' : 'max-h-0 opacity-0'}`}>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300">
              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <p className="mb-2"><strong className="text-white flex items-center gap-2"><Activity size={16} className="text-blue-400"/> 1. The Physics (LWR Theory)</strong></p>
                <p>This tool uses Lighthill-Whitham-Richards (LWR) shockwave theory. It calculates the financial damage of a single illegally parked car by modeling how a physical bottleneck creates a backward-propagating queue of delayed vehicles.</p>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <p className="mb-2"><strong className="text-white flex items-center gap-2"><CarFront size={16} className="text-red-400"/> 2. Physical Limits</strong></p>
                <p>Adjust the lane width and the parked car's width. A wider parked vehicle blocks more of the lane, which drastically drops the road's <strong>Effective Capacity</strong> (the maximum number of cars that can pass per hour).</p>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <p className="mb-2"><strong className="text-white flex items-center gap-2"><TrendingUp size={16} className="text-amber-400"/> 3. Traffic Conditions</strong></p>
                <p>If the "Arriving Flow" of traffic is higher than the new restricted "Effective Capacity", a shockwave queue forms. The longer the violation lasts, the exponentially worse the cumulative delay gets for the network.</p>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <p className="mb-2"><strong className="text-white flex items-center gap-2"><IndianRupee size={16} className="text-emerald-400"/> 4. Economic Cost</strong></p>
                <p>We take the total vehicle delay and multiply it by the "Avg Occupancy" (people per car) and the "Value of Time" (local hourly wage) to calculate the final real-world Fiscal Damage caused by the violation.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Sliders */}
          <div className="lg:col-span-7 bg-[#121212] border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            {/* Subtle glow effect in background */}
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-400" />
              <span>Simulation Parameters</span>
            </h3>

            <div className="space-y-8 relative z-10">
              {/* Slider Group 1: Physical Limits */}
              <div className="space-y-6">
                <div className="group">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">Total Lane Width</label>
                    <span className="text-sm font-bold bg-white/10 px-3 py-1 rounded-full text-blue-300 border border-white/5">{laneWidth.toFixed(1)} m</span>
                  </div>
                  <input type="range" min="2.5" max="5.0" step="0.1" value={laneWidth} onChange={(e) => setLaneWidth(parseFloat(e.target.value))} className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all" />
                </div>

                <div className="group">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">Parked Vehicle Obstruction</label>
                    <span className="text-sm font-bold bg-white/10 px-3 py-1 rounded-full text-red-300 border border-white/5">{carWidth.toFixed(1)} m</span>
                  </div>
                  <input type="range" min="1.0" max="2.5" step="0.1" value={carWidth} onChange={(e) => setCarWidth(parseFloat(e.target.value))} className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer accent-red-500 hover:accent-red-400 transition-all" />
                </div>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

              {/* Slider Group 2: Traffic Conditions */}
              <div className="space-y-6">
                <div className="group">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">Arriving Traffic Flow</label>
                    <span className="text-sm font-bold bg-white/10 px-3 py-1 rounded-full text-amber-300 border border-white/5">{arrivingFlow} PCU/hr</span>
                  </div>
                  <input type="range" min="500" max="2500" step="50" value={arrivingFlow} onChange={(e) => setArrivingFlow(parseInt(e.target.value))} className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 transition-all" />
                </div>

                <div className="group">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">Duration of Violation</label>
                    <span className="text-sm font-bold bg-white/10 px-3 py-1 rounded-full text-purple-300 border border-white/5">{durationMin} min</span>
                  </div>
                  <input type="range" min="5" max="180" step="5" value={durationMin} onChange={(e) => setDurationMin(parseInt(e.target.value))} className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all" />
                </div>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

              {/* Slider Group 3: Economic Variables */}
              <div className="grid grid-cols-2 gap-6">
                <div className="group">
                  <div className="flex flex-col gap-2 mb-3">
                    <label className="text-xs font-medium text-gray-400">Avg Occupancy</label>
                    <span className="text-sm font-bold text-gray-200">{occupancy.toFixed(1)} pax/veh</span>
                  </div>
                  <input type="range" min="1.0" max="4.0" step="0.1" value={occupancy} onChange={(e) => setOccupancy(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-full appearance-none cursor-pointer accent-emerald-500 transition-all" />
                </div>

                <div className="group">
                  <div className="flex flex-col gap-2 mb-3">
                    <label className="text-xs font-medium text-gray-400">Value of Time (VoTT)</label>
                    <span className="text-sm font-bold text-gray-200">₹{vott} / hr</span>
                  </div>
                  <input type="range" min="50" max="300" step="10" value={vott} onChange={(e) => setVott(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-full appearance-none cursor-pointer accent-emerald-500 transition-all" />
                </div>
              </div>
            </div>

            {/* Chart Explanations Box (Fills empty space) */}
            <div className="mt-12 pt-8 border-t border-white/10 relative z-10">
              <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-blue-400" /> Chart Legend & Physics Engine
              </h4>
              <div className="space-y-4 text-xs leading-relaxed text-gray-400">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="mb-1"><strong className="text-red-400 flex items-center gap-1.5"><TrendingUp size={14}/> Exponential Economic Loss</strong></p>
                  <p>As the blockage duration increases, traffic doesn't just build up linearly. Delayed vehicles slow down the cars behind them, causing a cascading "shockwave" queue. The line chart visualizes how fast this financial damage curve bends upward.</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="mb-1"><strong className="text-blue-400 flex items-center gap-1.5"><Activity size={14}/> Road Capacity Bottleneck</strong></p>
                  <p>The Bar Chart simulates the physical road. The blue bar is the road's natural capacity. The red bar is what's left after the parked car takes up lane space. If the <strong className="text-amber-400">Yellow Dotted Line</strong> (Arrival Flow) overtakes the red bar, a traffic jam begins forming.</p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Results & Breakdown */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-white/20 transition-all">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <CarFront className="w-12 h-12" />
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Effective Capacity</div>
                <div className="text-3xl font-bold text-white">{blockedCapacity}</div>
                <div className="text-xs text-gray-500 mt-1">PCU/hr</div>
              </div>

              <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-white/20 transition-all">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Clock className="w-12 h-12" />
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Network Delay</div>
                <div className="text-3xl font-bold text-white">{totalDelayVehMin.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1">Vehicle-minutes lost</div>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="bg-[#121212] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
              <button 
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="w-full p-5 flex justify-between items-center bg-white/[0.02] hover:bg-white/[0.04] transition-colors border-b border-white/5"
              >
                <div className="font-bold text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                  Shockwave Analysis
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showBreakdown ? 'rotate-180' : ''}`} />
              </button>
              
              <div className={`transition-all duration-500 ease-in-out ${showBreakdown ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-2 space-y-1">
                  
                  <div className="flex justify-between items-center py-3 px-4 rounded-xl hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <span className="text-sm text-gray-300">Capacity Drop</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-gray-300">{BASE_CAPACITY} <span className="text-gray-600">→</span> {blockedCapacity}</div>
                      <div className="text-xs font-mono text-red-400 mt-0.5">-{capacityDrop} PCU/hr</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-3 px-4 rounded-xl hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <span className="text-sm text-gray-300">Excess Demand</span>
                    </div>
                    <div className="text-sm font-mono text-gray-300">
                      {excessDemand > 0 ? <span className="text-amber-400">+{excessDemand} PCU/hr</span> : <span className="text-emerald-400">0 (Flow &lt; Cap)</span>}
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-3 px-4 rounded-xl hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <Clock className="w-4 h-4" />
                      </div>
                      <span className="text-sm text-gray-300">Vehicle Delay</span>
                    </div>
                    <div className="text-sm font-mono text-blue-300">{totalDelayVehHours.toFixed(1)} hrs</div>
                  </div>

                  <div className="flex justify-between items-center py-3 px-4 rounded-xl hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="text-sm text-gray-300">Human Time Lost</span>
                    </div>
                    <div className="text-sm font-mono text-purple-300">{personHoursLost.toFixed(1)} hrs</div>
                  </div>

                  <div className="mt-2 p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-t border-red-500/20 flex justify-between items-center">
                    <span className="font-bold text-red-200">Total Fiscal Damage</span>
                    <span className="font-mono text-xl font-bold text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]">
                      ₹{Math.round(economicCost).toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-black/40 p-4 text-center text-xs text-gray-500">
                    {excessDemand > 0 
                      ? `Traffic queue is growing at a rate of ${(queueGrowthPerMin).toFixed(1)} vehicles per minute.` 
                      : 'No queue is actively forming under these conditions.'}
                  </div>

                </div>
              </div>
            </div>

            {/* CHARTS SECTION */}
            <div className="space-y-6">
              <div className="bg-[#121212] p-6 rounded-3xl border border-white/10 shadow-xl">
                <h4 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <TrendingUp size={16} className="text-red-400" /> Exponential Economic Loss
                </h4>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={delayData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="minute" stroke="#ffffff40" fontSize={11} tickFormatter={(val) => `${val}m`} />
                      <YAxis stroke="#ffffff40" fontSize={11} tickFormatter={(val) => `₹${val}`} width={55} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#1e2025', borderColor: '#ffffff20', fontSize: '13px', borderRadius: '8px' }}
                        formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Fiscal Damage']}
                        labelFormatter={(label) => `Minute ${label}`}
                      />
                      <Line type="monotone" dataKey="cost" stroke="#f87171" strokeWidth={3} dot={{ r: 3, fill: '#f87171', strokeWidth: 0 }} activeDot={{ r: 6 }} animationDuration={500} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#121212] p-6 rounded-3xl border border-white/10 shadow-xl">
                <h4 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Activity size={16} className="text-blue-400" /> Road Capacity Bottleneck
                </h4>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={capacityData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                      <XAxis type="number" stroke="#ffffff40" fontSize={11} />
                      <YAxis dataKey="name" type="category" stroke="#ffffff70" fontSize={11} width={90} />
                      <RechartsTooltip 
                        cursor={{fill: '#ffffff05'}}
                        contentStyle={{ backgroundColor: '#1e2025', borderColor: '#ffffff20', fontSize: '13px', borderRadius: '8px' }}
                        formatter={(value: any) => [`${value} PCU/hr`, 'Capacity']}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={500} />
                      <ReferenceLine x={arrivingFlow} stroke="#fbbf24" strokeDasharray="3 3" label={{ position: 'top', value: 'Arrival Flow', fill: '#fbbf24', fontSize: 11 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
