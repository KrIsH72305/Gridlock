"use client";

import React, { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [activeMockHotspot, setActiveMockHotspot] = useState<number | null>(0);

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const mockHotspotsData = [
    { id: 1, name: "Subedar Chatram Road", lanes: 2, delay: 18.4, violations: 4188, capLoss: "50%" },
    { id: 2, name: "Kamaraj Road", lanes: 3, delay: 12.2, violations: 1449, capLoss: "33%" },
    { id: 3, name: "80 Feet Ring Road", lanes: 2, delay: 5.6, violations: 1114, capLoss: "50%" },
  ];

  return (
    <div className="h-screen w-screen overflow-y-auto scroll-smooth bg-[#060a16] text-[#dae2fd] font-sans selection:bg-[#7C5CFF]/30 selection:text-white relative">
      
      {/* Injecting CSS Keyframe Animations directly for the road grid */}
      <style jsx global>{`
        @keyframes subtle-fade {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.35; }
        }
        .road-grid-container {
          animation: subtle-fade 8s ease-in-out infinite;
        }
      `}</style>

      {/* Dynamic Traffic Light Trails Live Wallpaper */}
      <div className="absolute top-0 inset-x-0 h-screen overflow-hidden pointer-events-none z-0 bg-[#060a16]">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[150px]"></div>
        <div className="absolute bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-[150px]"></div>

        <svg 
          className="absolute w-full h-full opacity-45 mix-blend-screen" 
          viewBox="0 0 1440 600" 
          preserveAspectRatio="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Animating Gradients along the paths */}
            <linearGradient id="blue-trail-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <animate attributeName="x1" from="-100%" to="100%" dur="12s" repeatCount="indefinite" />
              <animate attributeName="x2" from="0%" to="200%" dur="12s" repeatCount="indefinite" />
              <stop offset="0%" stopColor="#3e52ff" stopOpacity="0" />
              <stop offset="45%" stopColor="#3e52ff" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#4cd6ff" stopOpacity="1" />
              <stop offset="55%" stopColor="#3e52ff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3e52ff" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="violet-trail-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <animate attributeName="x1" from="100%" to="-100%" dur="16s" repeatCount="indefinite" />
              <animate attributeName="x2" from="200%" to="0%" dur="16s" repeatCount="indefinite" />
              <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0" />
              <stop offset="45%" stopColor="#7C5CFF" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#ffb4ab" stopOpacity="1" />
              <stop offset="55%" stopColor="#7C5CFF" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="orange-trail-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <animate attributeName="x1" from="-100%" to="100%" dur="20s" repeatCount="indefinite" />
              <animate attributeName="x2" from="0%" to="200%" dur="20s" repeatCount="indefinite" />
              <stop offset="0%" stopColor="#ff9800" stopOpacity="0" />
              <stop offset="45%" stopColor="#ff9800" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#f44336" stopOpacity="0.9" />
              <stop offset="55%" stopColor="#ff9800" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ff9800" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Blue Bundle: Main flowing artery (left-to-right) */}
          <path d="M -100,240 C 400,360 900,210 1540,290" fill="none" stroke="url(#blue-trail-grad)" strokeWidth="1.5" className="blur-[0.5px]" />
          <path d="M -100,250 C 400,380 900,220 1540,300" fill="none" stroke="url(#blue-trail-grad)" strokeWidth="4" className="blur-[3px]" />
          <path d="M -100,265 C 400,400 900,230 1540,315" fill="none" stroke="url(#blue-trail-grad)" strokeWidth="12" className="blur-[8px] opacity-60" />
          <path d="M -100,250 C 400,380 900,220 1540,300" fill="none" stroke="url(#blue-trail-grad)" strokeWidth="40" className="blur-[24px] opacity-30" />

          {/* Violet Bundle: Counter-flow traffic (right-to-left) */}
          <path d="M 1540,390 C 1000,470 500,290 -100,340" fill="none" stroke="url(#violet-trail-grad)" strokeWidth="2" className="blur-[0.5px]" />
          <path d="M 1540,400 C 1000,480 500,300 -100,350" fill="none" stroke="url(#violet-trail-grad)" strokeWidth="5" className="blur-[4px]" />
          <path d="M 1540,415 C 1000,495 500,315 -100,365" fill="none" stroke="url(#violet-trail-grad)" strokeWidth="15" className="blur-[10px] opacity-50" />
          <path d="M 1540,400 C 1000,480 500,300 -100,350" fill="none" stroke="url(#violet-trail-grad)" strokeWidth="50" className="blur-[30px] opacity-25" />

          {/* Orange Bundle: Slow lane / outer road (left-to-right) */}
          <path d="M -100,175 C 400,295 900,115 1540,215" fill="none" stroke="url(#orange-trail-grad)" strokeWidth="1" className="blur-[0.5px]" />
          <path d="M -100,180 C 400,300 900,120 1540,220" fill="none" stroke="url(#orange-trail-grad)" strokeWidth="3" className="blur-[3px]" />
          <path d="M -100,180 C 400,300 900,120 1540,220" fill="none" stroke="url(#orange-trail-grad)" strokeWidth="15" className="blur-[12px] opacity-40" />

          {/* Lower purple bundle to balance the lower vertical space */}
          <path d="M -100,450 C 400,520 900,420 1540,480" fill="none" stroke="url(#violet-trail-grad)" strokeWidth="2.5" className="blur-[1px]" />
          <path d="M -100,450 C 400,520 900,420 1540,480" fill="none" stroke="url(#violet-trail-grad)" strokeWidth="10" className="blur-[8px] opacity-40" />
        </svg>

        {/* Faint road grid pattern overlay for structure */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      {/* Header / Navigation */}
      <header className="sticky top-0 z-50 w-full bg-[#060a16]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-6 md:px-12 w-full">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#7C5CFF] flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[20px]">traffic</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-white font-mono uppercase">Urban Intel</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#c5c5d9]">
            <a href="#how-it-works" onClick={(e) => handleScrollTo(e, 'how-it-works')} className="hover:text-white transition-colors">How It Works</a>
            <a href="#problem" onClick={(e) => handleScrollTo(e, 'problem')} className="hover:text-white transition-colors">The Problem</a>
            <a href="#bias" onClick={(e) => handleScrollTo(e, 'bias')} className="hover:text-white transition-colors">Patrol Bias</a>
            <a href="https://github.com/Drifting-Moon/locklock" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
              GitHub <span className="material-symbols-outlined text-sm">open_in_new</span>
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="bg-[#7C5CFF] hover:bg-[#6c4be0] text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-[8px] transition-all active:scale-[0.98]">
              View Live Demo
            </Link>
          </div>
        </div>
      </header>

      {/* 1. HERO SECTION */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 min-h-[calc(100vh-64px)] flex items-center py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
          {/* Left Column: Text & CTAs */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 bg-[#7C5CFF]/15 border border-[#7C5CFF]/30 px-3.5 py-1 rounded-md text-xs font-semibold text-[#bdc2ff] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C5CFF]"></span>
              Flipkart Gridlock Hackathon Project
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.15] max-w-2xl">
              We Don't Count Tickets.<br />
              <span className="text-[#7C5CFF]">
                We Measure Gridlock.
              </span>
            </h1>

            <p className="mt-6 text-sm sm:text-base md:text-lg text-[#c5c5d9] max-w-xl font-light leading-relaxed">
              Urban Intel integrates live <span className="text-white font-medium">OpenStreetMap (OSM)</span> lane profiles and 
              <span className="text-white font-medium"> BPR traffic physics</span> to quantify exactly how illegal parking capacity losses translate into commuter delay minutes.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link href="/dashboard" className="w-full sm:w-auto bg-[#7C5CFF] hover:bg-[#6c4be0] hover:shadow-md hover:shadow-[#7C5CFF]/25 text-white font-bold text-sm tracking-wide px-6 py-3 rounded-[8px] transition-all text-center">
                View Live Demo
              </Link>
              <a href="#how-it-works" onClick={(e) => handleScrollTo(e, 'how-it-works')} className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white font-bold text-sm border border-white/10 px-6 py-3 rounded-[8px] transition-all hover:border-white/20 text-center">
                How It Works
              </a>
            </div>

            {/* Proof element */}
            <div className="mt-12 pt-6 border-t border-white/5 w-full flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#c5c5d9]/40">
              <span>298k violations processed</span>
              <span className="text-white/20">·</span>
              <span>125k deduplicated</span>
              <span className="text-white/20">·</span>
              <span>Real OSM lane data</span>
            </div>
          </div>

          {/* Right Column: Visual Dashboard Mockup Card */}
          <div className="lg:col-span-5 flex justify-center w-full">
            <div className="bg-[#121626]/80 backdrop-blur-xl border border-white/10 rounded-xl p-5 w-full max-w-md shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[10px] font-mono font-bold text-white/50 uppercase tracking-widest">LWR Capacity Analysis</span>
                </div>
                <span className="text-[9px] font-mono text-[#7C5CFF] font-bold">Live Model</span>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[9px] text-white/40 block font-mono">LOCATION</span>
                  <span className="text-xs font-bold text-white">Kamaraj Road Bottleneck</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-lg p-2.5 border border-white/5">
                    <span className="text-[9px] text-white/40 block font-mono">BASE LANES</span>
                    <span className="text-xs font-mono font-bold text-[#bdc2ff]">3 Lanes (OSM)</span>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2.5 border border-white/5">
                    <span className="text-[9px] text-white/40 block font-mono">CAPACITY LOSS</span>
                    <span className="text-xs font-mono font-bold text-[#f44336]">-33.3%</span>
                  </div>
                </div>

                <div className="p-3 bg-black/30 rounded-lg border border-white/5 font-mono text-[9px] text-white/70">
                  <div className="text-white/35 font-bold mb-1">DELAY PENALTY (BPR FORMULA):</div>
                  <div className="text-[#bdc2ff] text-[10px] font-bold mt-1">t = 10.0 × [ 1 + 0.15 × (V/C)⁴ ]</div>
                  <div className="mt-2 text-emerald-400 font-bold">Result: +12.2 min delay per commuter</div>
                </div>

                {/* Micro Bar Graph */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] text-white/40 font-mono">
                    <span>Capacity Blocked</span>
                    <span className="text-white font-bold">1 / 3 Lanes</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                    <div className="bg-[#7C5CFF] h-full rounded-full w-[33%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE PROBLEM (Light Section) */}
      <section id="problem" className="bg-[#f0f2fa] text-[#131b2e] py-20 md:py-28 relative z-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Side: Mock Hotspot Map */}
          <div className="lg:col-span-6 bg-[#0b1326] rounded-2xl p-4 md:p-6 shadow-2xl border border-[#c5c5d9]/30 relative overflow-hidden h-[420px] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-widest">Live Violations Hotspot Map</span>
              </div>
              <span className="text-[10px] font-mono text-[#7C5CFF] font-bold">11,810 Violations</span>
            </div>
            
            {/* Stylized Canvas mockup */}
            <div className="flex-1 rounded-xl bg-[#060a16] relative overflow-hidden border border-white/5">
              {/* Grid Lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px]"></div>
              
              {/* Bengaluru Road Network Mimic */}
              <svg className="absolute inset-0 w-full h-full opacity-25" xmlns="http://www.w3.org/2000/svg">
                <path d="M 0,100 L 400,120 M 100,0 L 120,400 M 50,300 C 150,250 250,350 400,280 M 300,0 C 280,200 350,300 200,400" stroke="#ffffff" strokeWidth="2" fill="none"/>
                <path d="M 0,220 C 150,220 200,100 400,100" stroke="#7C5CFF" strokeWidth="1" strokeDasharray="4 4" fill="none"/>
              </svg>

              {/* Flat DBSCAN Hotspots */}
              <div className="absolute top-[28%] left-[45%] -translate-x-1/2 -translate-y-1/2">
                <div className="absolute inset-0 w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 -translate-x-1/2 -translate-y-1/2"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 -translate-x-1/2 -translate-y-1/2"></div>
              </div>

              <div className="absolute top-[65%] left-[28%] -translate-x-1/2 -translate-y-1/2">
                <div className="absolute inset-0 w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 -translate-x-1/2 -translate-y-1/2"></div>
                <div className="w-2 h-2 rounded-full bg-amber-500 -translate-x-1/2 -translate-y-1/2"></div>
              </div>

              <div className="absolute top-[48%] left-[72%] -translate-x-1/2 -translate-y-1/2">
                <div className="absolute inset-0 w-6 h-6 rounded-full bg-yellow-400/10 border border-yellow-400/30 -translate-x-1/2 -translate-y-1/2"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-400 -translate-x-1/2 -translate-y-1/2"></div>
              </div>

              {/* Mini Overlay Map Label */}
              <div className="absolute bottom-3 left-3 bg-[#121626]/90 border border-white/10 rounded-lg p-2 font-mono text-[9px] text-[#bdc2ff]">
                <div className="font-bold text-white uppercase tracking-wider mb-1">DBSCAN Hotspots</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-red-500"></span> Delay &gt; 15m</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-amber-500"></span> Delay 5-15m</div>
              </div>
            </div>
          </div>
          
          {/* Right Side: Copy */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#060a16] leading-tight">
              Reactive Patrols Mask the Real Impact
            </h2>
            <div className="w-16 h-1.5 bg-[#7C5CFF] rounded-full mt-4 mb-6"></div>
            
            <p className="text-[#3c485e] text-base md:text-lg leading-relaxed mb-6">
              Traditional city traffic operations treat parking enforcement reactively. Traffic wardens write tickets where they are scheduled to go, creating an enforcement loop that ignores massive parts of the city.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#7C5CFF] text-[22px] mt-0.5">warning</span>
                <div>
                  <h4 className="font-bold text-[#060a16] text-base">The Patrol Bias Blindspot</h4>
                  <p className="text-xs text-[#3c485e]">Hotspots in standard databases only highlight regions where wardens are frequently dispatched, not where the network is actually suffering the most.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#7C5CFF] text-[22px] mt-0.5">safety_check</span>
                <div>
                  <h4 className="font-bold text-[#060a16] text-base">Unquantified Congestion Costs</h4>
                  <p className="text-xs text-[#3c485e]">A single delivery truck blocking a primary lane degrades road capacity by 33%, but standard analytics fail to compute the minute-delay impact this causes.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS (Violet Numbered Cards) */}
      <section id="how-it-works" className="py-20 md:py-28 relative z-10 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">The 4-Step Pipeline</h2>
          <p className="text-[#c5c5d9] mt-3 text-sm md:text-base font-light">From raw ticketing sweeps to physics-grounded commute-delay mapping.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1 */}
          <div className="bg-[#7C5CFF] text-white rounded-2xl p-6 shadow-xl relative flex flex-col justify-between h-72 hover:scale-[1.03] transition-all duration-300">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-mono font-black text-lg">01</div>
              <span className="material-symbols-outlined text-white/60 text-[24px]">filter_alt</span>
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight mb-2">Deduplicate</h3>
              <p className="text-white/80 text-xs leading-relaxed font-light">
                Sweep deduplication collapses officer ticket-spam (occurring within 15 minutes and 50 meters of a single device ID) into real events, filtering 298k records to 125k.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#7C5CFF] text-white rounded-2xl p-6 shadow-xl relative flex flex-col justify-between h-72 hover:scale-[1.03] transition-all duration-300">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-mono font-black text-lg">02</div>
              <span className="material-symbols-outlined text-white/60 text-[24px]">group_work</span>
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight mb-2">Cluster</h3>
              <p className="text-white/80 text-xs leading-relaxed font-light">
                DBSCAN spatial clustering groups nearby parking violations to extract true congestion hotspots and shapes boundaries using geometric convex hulls.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#7C5CFF] text-white rounded-2xl p-6 shadow-xl relative flex flex-col justify-between h-72 hover:scale-[1.03] transition-all duration-300">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-mono font-black text-lg">03</div>
              <span className="material-symbols-outlined text-white/60 text-[24px]">map</span>
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight mb-2">Ground Truth</h3>
              <p className="text-white/80 text-xs leading-relaxed font-light">
                Hotspots are mapped against real OpenStreetMap road classes and actual lane counts, ensuring capacity formulas use real physical data.
              </p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-[#7C5CFF] text-white rounded-2xl p-6 shadow-xl relative flex flex-col justify-between h-72 hover:scale-[1.03] transition-all duration-300">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-mono font-black text-lg">04</div>
              <span className="material-symbols-outlined text-white/60 text-[24px]">calculate</span>
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight mb-2">Quantify</h3>
              <p className="text-white/80 text-xs leading-relaxed font-light">
                The Bureau of Public Roads (BPR) traffic physics model converts capacity degradation into the exact minute-delay costs added to traffic streams.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 4. DASHBOARD PREVIEW (Dark Mockup) */}
      <section className="bg-[#0b1326] border-y border-white/5 py-20 md:py-28 relative z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Interactive Command Center</h2>
            <p className="text-[#c5c5d9] mt-3 text-sm md:text-base font-light">Every number on this map traces back to a real road and a real formula.</p>
          </div>

          {/* Large Interactive CSS Mockup */}
          <div className="bg-[#060a16] border border-white/10 rounded-2xl p-3 md:p-5 shadow-2xl relative flex flex-col h-[550px] overflow-hidden">
            {/* Header of Mock */}
            <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">map</span>
                <span className="text-xs font-bold text-white">Urban Intel Dashboard</span>
              </div>
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
              </div>
            </div>

            <div className="flex-1 flex gap-4 overflow-hidden relative">
              {/* Left Side: Mock Map */}
              <div className="flex-1 rounded-xl bg-black/40 border border-white/5 relative overflow-hidden flex flex-col">
                {/* SVG Map mockup */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:32px_32px]"></div>
                
                {/* Hotspot Polygons (Convex Hulls) */}
                <div className="absolute inset-0 p-4">
                  {mockHotspotsData.map((hotspot, idx) => {
                    const positions = [
                      "top-[35%] left-[30%]",
                      "top-[55%] left-[58%]",
                      "top-[25%] left-[70%]"
                    ];
                    return (
                      <div 
                        key={hotspot.id} 
                        onClick={() => setActiveMockHotspot(idx)}
                        className={`absolute ${positions[idx]} p-3 rounded-lg border cursor-pointer transition-all duration-300 flex items-center gap-2 group ${
                          activeMockHotspot === idx 
                            ? 'bg-[#7C5CFF]/20 border-[#7C5CFF] scale-[1.05]' 
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-[#ffeb3b]"></span>
                        <div className="font-mono text-[9px]">
                          <div className="font-bold text-white">{hotspot.name}</div>
                          <div className="text-white/40">Delay: +{hotspot.delay}m</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Floating Map Legend (bottom-left) */}
                <div className="absolute bottom-4 left-4 bg-[#121626]/90 border border-white/10 rounded-xl p-3 w-44 pointer-events-none font-mono text-[8px]">
                  <div className="font-bold text-white mb-1.5 uppercase tracking-wider">Live Map Legend</div>
                  <div className="flex justify-between mb-1"><span>Active Hotspots:</span> <span className="text-white font-bold">{mockHotspotsData.length}</span></div>
                  <div className="flex justify-between mb-2"><span>Total Delay:</span> <span className="text-[#f44336] font-bold">+36.2m</span></div>
                  <div className="w-full h-1 bg-gradient-to-r from-yellow-300 via-orange-500 to-red-500 rounded"></div>
                </div>

                {/* Scrubber at Bottom Center */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#121626]/90 border border-white/10 rounded-xl px-4 py-2 w-56 font-mono text-[8px] flex flex-col gap-1 pointer-events-none">
                  <div className="flex justify-between items-center text-white/50">
                    <span>Scrubber</span>
                    <span className="text-[#bdc2ff] font-bold">09:00 (AM Peak)</span>
                  </div>
                  <div className="w-full bg-white/10 h-1 rounded relative">
                    <div className="absolute left-[38%] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#3e52ff] border border-white"></div>
                  </div>
                </div>
              </div>

              {/* Right Side: Mock Physics Inspector (Reacts to Map clicks!) */}
              <div className="w-64 bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between overflow-y-auto">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-4">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[16px]">analytics</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Physics Inspector</span>
                    </div>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  </div>

                  {activeMockHotspot !== null ? (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[9px] text-white/40 block">OSM ROAD SEGMENT</span>
                        <span className="text-xs font-bold text-white">{mockHotspotsData[activeMockHotspot].name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] text-white/40 block">ACTUAL LANES</span>
                          <span className="text-xs font-mono font-bold text-[#bdc2ff]">{mockHotspotsData[activeMockHotspot].lanes} Lanes</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-white/40 block">CAPACITY LOSS</span>
                          <span className="text-xs font-mono font-bold text-[#f44336]">{mockHotspotsData[activeMockHotspot].capLoss}</span>
                        </div>
                      </div>
                      <div className="p-3 bg-black/40 rounded-lg border border-white/5 font-mono text-[9px] text-white/75 leading-relaxed">
                        <div className="text-white/40 font-bold mb-1">BPR DELAY FORMULA:</div>
                        <span className="text-white">t = t₀ [ 1 + α(V/C)⁴ ]</span>
                        <div className="mt-1.5 text-[#bdc2ff]">Calculated Delay: +{mockHotspotsData[activeMockHotspot].delay} mins</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-white/40 text-xs">
                      Click any map hotspot to inspect its capacity calculations.
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-white/10 mt-4 text-[9px] text-white/40 text-center font-mono">
                  Click on map pins to switch zones
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PATROL BIAS CALLOUT (High Contrast Standalone Section) */}
      <section id="bias" className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-[#7C5CFF] to-[#3e52ff] rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
          {/* Abstract decorative graphic */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none hidden md:block">
            <span className="material-symbols-outlined text-[300px] text-white absolute right-[-50px] top-1/2 -translate-y-1/2">radar</span>
          </div>

          <div className="max-w-2xl relative z-10">
            <span className="text-xs font-mono font-black uppercase tracking-widest text-[#bdc2ff] bg-white/10 px-3 py-1 rounded-full">Exposing Patrol Blindspots</span>
            
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mt-6 leading-tight">
              "The zones we are NOT watching may be worse than the ones we are."
            </h2>
            
            <p className="mt-4 text-white/80 text-sm md:text-base leading-relaxed font-light">
              Unlike static camera platforms that require massive capital investment, our **Blindspot Radar** parses spatial ticketing logs to pinpoint where expectations diverge from reality. By calculating Expected vs Observed violations, we expose the exact enforcement vacuums where patrols have created a feedback bias.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/dashboard" className="bg-white text-[#7C5CFF] hover:bg-[#dfe0ff] font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-[8px] transition-all active:scale-[0.98]">
                Open Blindspot Radar
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="bg-[#03060f] border-t border-white/5 py-12 relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#7C5CFF] text-xl">traffic</span>
              <span className="font-bold text-white font-mono uppercase tracking-wider text-sm">Urban Intel</span>
            </div>
            <span className="text-[10px] text-white/30 uppercase tracking-widest font-mono">Theme 1: Parking-Induced Congestion</span>
          </div>

          <div className="flex gap-8 text-xs font-semibold text-[#c5c5d9] font-mono">
            <a href="#how-it-works" onClick={(e) => handleScrollTo(e, 'how-it-works')} className="hover:text-white transition-colors">How It Works</a>
            <Link href="/dashboard" className="hover:text-white transition-colors">Live Demo</Link>
            <a href="https://github.com/Drifting-Moon/locklock" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>

          <div className="text-[11px] text-[#c5c5d9]/60 font-mono text-center md:text-right">
            <div>Flipkart Gridlock Hackathon Project</div>
            <div className="text-[10px] text-white/30 mt-1">Built with OSM and BPR Physics</div>
          </div>
        </div>
      </footer>

    </div>
  );
}
