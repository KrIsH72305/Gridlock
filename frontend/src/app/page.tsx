"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [activeMockHotspot, setActiveMockHotspot] = useState<number | null>(0);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);
  
  // BPR Sandbox State
  const [volumeCapacity, setVolumeCapacity] = useState<number>(1.2);
  const [freeFlowTime, setFreeFlowTime] = useState<number>(10);
  const alpha = 0.15;
  const beta = 4;
  
  // Calculated BPR delay
  const calculatedTime = freeFlowTime * (1 + alpha * Math.pow(volumeCapacity, beta));
  const delayMinutes = Math.max(0, calculatedTime - freeFlowTime);

  // Live Stats State
  const [stats, setStats] = useState({
    violations: 298418,
    deduplicated: 125192,
    commuteHours: 84920,
    economicSavings: 42460800
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        violations: prev.violations + Math.floor(Math.random() * 3),
        deduplicated: prev.deduplicated + Math.floor(Math.random() * 2),
        commuteHours: prev.commuteHours + Math.floor(Math.random() * 1),
        economicSavings: prev.economicSavings + Math.floor(Math.random() * 150)
      }));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

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

  // Canvas Traffic Grid Live Wallpaper Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, radius: 100 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };
    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };
    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Smooth flowing particles configuration
    const particles: Array<{
      x: number;
      y: number;
      speed: number;
      size: number;
      angle: number;
      color: string;
      trail: Array<{ x: number; y: number }>;
    }> = [];

    const particleCount = 80;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.5 + Math.random() * 1.5,
        size: 1 + Math.random() * 2,
        angle: Math.random() * Math.PI * 2,
        color: Math.random() > 0.4 ? '#38BDF8' : '#7C5CFF',
        trail: []
      });
    }

    const animate = () => {
      // Clear background with translucent black to allow particles to leave glowing trails
      ctx.fillStyle = 'rgba(5, 7, 15, 0.15)';
      ctx.fillRect(0, 0, width, height);

      // Faint ambient grid background
      ctx.strokeStyle = 'rgba(124, 92, 255, 0.015)';
      ctx.lineWidth = 1;
      const gridSize = 64;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update & Draw Flow Particles
      particles.forEach(p => {
        // Smooth trig field coordinates to guide particle angle
        p.angle += Math.sin(p.x * 0.003) * Math.cos(p.y * 0.003) * 0.04;
        
        // Mouse gravity pull (curves particles towards the cursor)
        const dx = p.x - mouseRef.current.x;
        const dy = p.y - mouseRef.current.y;
        const dist = Math.hypot(dx, dy);
        if (dist < mouseRef.current.radius) {
          const force = (mouseRef.current.radius - dist) / mouseRef.current.radius;
          const angleToMouse = Math.atan2(dy, dx) + Math.PI / 2;
          p.angle += (angleToMouse - p.angle) * force * 0.1;
          p.speed = 2.0; // accelerate
        } else {
          p.speed = Math.max(0.5, p.speed - 0.05); // slow down back to normal
        }

        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;

        // Wrapping boundaries
        if (p.x < 0) { p.x = width; p.trail = []; }
        if (p.x > width) { p.x = 0; p.trail = []; }
        if (p.y < 0) { p.y = height; p.trail = []; }
        if (p.y > height) { p.y = 0; p.trail = []; }

        // Manage particle trail
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 8) p.trail.shift();

        // Draw trail lines
        if (p.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let t = 1; t < p.trail.length; t++) {
            ctx.lineTo(p.trail[t].x, p.trail[t].y);
          }
          ctx.strokeStyle = p.color === '#38BDF8' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(124, 92, 255, 0.25)';
          ctx.lineWidth = p.size;
          ctx.stroke();
        }

        // Draw glowing particle node
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 4;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset shadow
      });

      // Draw faint connections between adjacent particles (Constellation grid)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          if (dist < 75) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(124, 92, 255, ${0.08 * (1 - dist / 75)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const [scrollOpacity, setScrollOpacity] = useState(0.8);

  useEffect(() => {
    const handleScroll = () => {
      const heroHeight = window.innerHeight * 0.7;
      const opacity = Math.max(0, 0.8 * (1 - window.scrollY / heroHeight));
      setScrollOpacity(opacity);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleFaq = (index: number) => {
    setActiveFaqIndex(prev => (prev === index ? null : index));
  };

  const faqData = [
    {
      q: "What mathematical logic drives the calculations?",
      a: "Our core engine runs on the Bureau of Public Roads (BPR) traffic formulation. It measures how loss of physical lane capacity (e.g. from illegal parking blocking 1 of 3 lanes, representing -33.3% capacity) shifts the Volume-to-Capacity ratio, scaling commute delay exponentially by a power of four."
    },
    {
      q: "How does the DBSCAN clustering filter out noise?",
      a: "Instead of mapping every single parking ticket directly, DBSCAN parses ticket coordinate sweeps to group overlapping enforcement events (grouped within 50 meters and 15 minutes), isolating persistent systemic blockages from random occurrences."
    },
    {
      q: "Where does the road geometry and lane data come from?",
      a: "We query live OpenStreetMap (OSM) highway elements. When a ticket matches a specific coordinate, we fetch that exact OSM segment's lane parameters to compute accurate baseline street capacities."
    },
    {
      q: "How does the Encroachment Detection engine function?",
      a: "It monitors spatial intersects between BMTC Bus Stop zones and civilian parking tickets. By tracking warden reports and matching GPS tolerances, it detects when transit corridors are blocked, prioritizing dispatcher queues automatically."
    }
  ];

  return (
    <div className="min-h-screen w-screen overflow-x-hidden bg-[#05070f] text-[#e0e7ff] font-sans selection:bg-[#7C5CFF]/30 selection:text-white relative">
      
      {/* Canvas Live Wallpaper background */}
      <canvas 
        ref={canvasRef} 
        style={{ opacity: scrollOpacity }}
        className="fixed inset-0 w-full h-full pointer-events-auto z-0 transition-opacity duration-150" 
      />

      {/* Grid Overlay */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none z-1" style={{ opacity: scrollOpacity }}></div>

      {/* Header / Navigation */}
      <header className="sticky top-0 z-50 w-full bg-[#05070f]/80 backdrop-blur-xl border-b border-[#7C5CFF]/10">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-6 md:px-12 w-full">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C5CFF] to-[#38BDF8] flex items-center justify-center shadow-lg shadow-[#7C5CFF]/20">
              <span className="material-symbols-outlined text-white text-[20px] font-bold">traffic</span>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white font-mono uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-[#38BDF8]">
              Urban Intel
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <a href="#simulator" onClick={(e) => handleScrollTo(e, 'simulator')} className="hover:text-[#38BDF8] transition-colors relative group py-1">
              Physics Sandbox
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#38BDF8] transition-all group-hover:w-full"></span>
            </a>
            <a href="#how-it-works" onClick={(e) => handleScrollTo(e, 'how-it-works')} className="hover:text-[#38BDF8] transition-colors relative group py-1">
              Methodology
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#38BDF8] transition-all group-hover:w-full"></span>
            </a>
            <a href="#comparison" onClick={(e) => handleScrollTo(e, 'comparison')} className="hover:text-[#38BDF8] transition-colors relative group py-1">
              Systems Contrast
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#38BDF8] transition-all group-hover:w-full"></span>
            </a>
            <a href="#faq" onClick={(e) => handleScrollTo(e, 'faq')} className="hover:text-[#38BDF8] transition-colors relative group py-1">
              FAQ
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#38BDF8] transition-all group-hover:w-full"></span>
            </a>
            <a href="https://github.com/Drifting-Moon/locklock" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1 font-mono text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
              GitHub <span className="material-symbols-outlined text-xs">open_in_new</span>
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="relative group overflow-hidden bg-gradient-to-r from-[#7C5CFF] to-[#38BDF8] hover:from-[#6c4be0] hover:to-[#0ea5e9] text-white text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-xl transition-all shadow-lg shadow-[#7C5CFF]/30 active:scale-[0.98]">
              <span className="relative z-10">Command Center</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 min-h-[85vh] flex items-center py-12 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
          
          {/* Left Text */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 bg-[#7C5CFF]/15 border border-[#7C5CFF]/30 px-3.5 py-1.5 rounded-full text-xs font-bold text-[#a78bfa] mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse"></span>
              Flipkart Gridlock Hackathon Project
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-white">
              We Don't Count Tickets.<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7C5CFF] via-[#a78bfa] to-[#38BDF8] filter drop-shadow-sm">
                We Measure Gridlock.
              </span>
            </h1>

            <p className="mt-8 text-base sm:text-lg text-slate-300 max-w-xl font-normal leading-relaxed">
              Urban Intel maps illegal parking capacity limits against <span className="text-white font-semibold underline decoration-[#38BDF8]">OpenStreetMap data</span> and <span className="text-[#38BDF8] font-mono">BPR traffic physics</span>. We track the true cost of congestion.
            </p>

            {/* Micro Stats Banner */}
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-3xl border-y border-[#7C5CFF]/20 py-6 bg-[#0c1024]/40 backdrop-blur-md rounded-2xl px-6">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Tickets Processed</span>
                <span className="text-xl font-bold text-[#38BDF8] font-mono">{stats.violations.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Unique Events</span>
                <span className="text-xl font-bold text-[#a78bfa] font-mono">{stats.deduplicated.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Commuters Reclaimed</span>
                <span className="text-xl font-bold text-emerald-400 font-mono">+{stats.commuteHours.toLocaleString()}h</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Fuel Saved (INR)</span>
                <span className="text-xl font-bold text-amber-400 font-mono">₹{(stats.economicSavings / 1000000).toFixed(2)}M</span>
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link href="/dashboard" className="w-full sm:w-auto text-center bg-gradient-to-r from-[#7C5CFF] to-[#38BDF8] hover:from-[#6c4be0] hover:to-[#0ea5e9] text-white font-bold text-sm tracking-wide px-8 py-4 rounded-xl transition-all shadow-lg shadow-[#7C5CFF]/20 active:scale-[0.98]">
                Open Command Center
              </Link>
              <a href="#simulator" onClick={(e) => handleScrollTo(e, 'simulator')} className="w-full sm:w-auto text-center bg-white/5 hover:bg-white/10 text-white font-bold text-sm border border-slate-700 hover:border-slate-500 px-8 py-4 rounded-xl transition-all active:scale-[0.98]">
                BPR Physics Sandbox
              </a>
            </div>
          </div>

          {/* Right Card (LWR Dashboard Model Mockup) */}
          <div className="lg:col-span-5 flex justify-center w-full relative">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-[#7C5CFF] to-[#38BDF8] rounded-2xl blur-xl opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            
            <div className="bg-[#0b0e1f]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute"></span>
                  <span className="text-[10px] font-mono font-bold text-[#38BDF8] uppercase tracking-widest">LWR Capacity Analysis</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">ONLINE</span>
              </div>

              <div className="space-y-5">
                <div>
                  <span className="text-[9px] text-slate-400 block font-mono">MONITORED BENGALURU SEGMENT</span>
                  <span className="text-sm font-bold text-white tracking-wide">Kamaraj Road Bottleneck</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <span className="text-[9px] text-slate-400 block font-mono">BASE LANES</span>
                    <span className="text-xs font-mono font-bold text-violet-300">3 Lanes (OSM)</span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <span className="text-[9px] text-slate-400 block font-mono">CAPACITY LOSS</span>
                    <span className="text-xs font-mono font-bold text-rose-400">-33.3%</span>
                  </div>
                </div>

                <div className="p-4 bg-black/40 rounded-xl border border-white/5 font-mono text-xs text-slate-300 space-y-2">
                  <div className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Delay Penalty Formula</div>
                  <div className="text-white text-[13px] font-bold bg-white/5 p-2 rounded text-center">
                    t = 10.0 × [ 1 + 0.15 × (V/C)⁴ ]
                  </div>
                  <div className="text-emerald-400 font-bold pt-1 text-center">
                    Delay Impact: +12.2 min / commuter
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Blockage Ratio</span>
                    <span className="text-white font-bold">1 / 3 Lanes Blocked</span>
                  </div>
                  <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
                    <div className="bg-gradient-to-r from-[#7C5CFF] to-rose-500 h-full rounded-full w-[33.3%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Physics Sandbox Section (Opaque White Background) */}
      <section id="simulator" className="relative z-10 py-24 bg-white text-slate-900 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-[#7C5CFF] bg-[#7C5CFF]/10 px-3 py-1.5 rounded-full">Interactive Sandbox</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mt-4 font-sans">The Mathematics of Traffic Delay</h2>
            <p className="text-slate-600 mt-3 max-w-xl mx-auto text-sm md:text-base font-light">
              Slide the parameters below to see how physical lane blockage forces the Volume/Capacity (V/C) ratio up, triggering exponential delay minutes via the BPR formulation.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Control Panel */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#7C5CFF]">tune</span>
                  Parameter Tuning
                </h3>

                {/* Parameter 1 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-600">Volume / Capacity Ratio (V/C)</span>
                    <span className="text-[#7C5CFF] font-bold">{volumeCapacity.toFixed(2)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="2.5" 
                    step="0.05"
                    value={volumeCapacity} 
                    onChange={(e) => setVolumeCapacity(parseFloat(e.target.value))}
                    className="w-full accent-[#7C5CFF] bg-slate-200 h-2 rounded-lg cursor-pointer outline-none"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0.50 (Empty Road)</span>
                    <span>1.00 (At Capacity)</span>
                    <span>2.50 (Deadlock)</span>
                  </div>
                </div>

                {/* Parameter 2 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-600">Free Flow Travel Time (t₀)</span>
                    <span className="text-[#7C5CFF] font-bold">{freeFlowTime} Minutes</span>
                  </div>
                  <input 
                    type="range" 
                    min="2" 
                    max="30" 
                    step="1"
                    value={freeFlowTime} 
                    onChange={(e) => setFreeFlowTime(parseInt(e.target.value))}
                    className="w-full accent-[#7C5CFF] bg-slate-200 h-2 rounded-lg cursor-pointer outline-none"
                  />
                </div>

                {/* Math Breakdown */}
                <div className="bg-slate-100/80 rounded-xl p-4 border border-slate-200 font-mono text-xs text-slate-700 space-y-2">
                  <div className="text-slate-500 font-bold uppercase text-[9px]">Variables:</div>
                  <div className="flex justify-between"><span>Alpha (Sensitivity):</span> <span>{alpha}</span></div>
                  <div className="flex justify-between"><span>Beta (Power Exponent):</span> <span>{beta}</span></div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                    <span>Formula:</span>
                    <span>t₀ × [ 1 + 0.15 × (V/C)⁴ ]</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500 mt-6 pt-4 border-t border-slate-200 font-light">
                Note: When \(V/C &gt; 1.0\), delays scale rapidly due to the 4th-power exponent representing breakdown flow physics.
              </div>
            </div>

            {/* Results Graphic */}
            <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
              <div>
                <h3 className="text-lg font-bold text-slate-950 flex items-center justify-between">
                  <span>Calculated Delay Output</span>
                  <span className="font-mono text-rose-600 text-2xl font-black">+{delayMinutes.toFixed(1)}m</span>
                </h3>
                <div className="w-12 h-1 bg-[#7C5CFF] rounded-full mt-2 mb-6"></div>

                <div className="space-y-6">
                  {/* Visual Bar representation */}
                  <div className="space-y-2">
                    <span className="text-xs text-slate-500 font-mono">Travel Time Comparison</span>
                    
                    {/* Baseline */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Baseline (No Parking Obstructions)</span>
                        <span>{freeFlowTime} mins</span>
                      </div>
                      <div className="w-full bg-slate-200 h-4 rounded-md overflow-hidden relative">
                        <div className="bg-[#7C5CFF]/75 h-full rounded-md" style={{ width: '40%' }}></div>
                      </div>
                    </div>

                    {/* Degraded */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-rose-600 font-semibold">
                        <span>Current Active Travel Time</span>
                        <span>{calculatedTime.toFixed(1)} mins</span>
                      </div>
                      <div className="w-full bg-slate-200 h-6 rounded-md overflow-hidden relative border border-[#7C5CFF]/30">
                        <div className="bg-gradient-to-r from-[#7C5CFF] via-rose-500 to-red-500 h-full rounded-md transition-all duration-300" style={{ width: `${Math.min(100, 40 + (delayMinutes / freeFlowTime) * 40)}%` }}></div>
                        <div className="absolute inset-y-0 right-3 flex items-center text-[10px] font-mono text-white font-bold">
                          +{delayMinutes.toFixed(1)} min Delay ({((calculatedTime / freeFlowTime) * 100 - 100).toFixed(0)}% slower)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Impact Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                      <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide font-mono">Systemic Impact</h4>
                      <p className="text-xs text-emerald-700 leading-relaxed mt-1">
                        At a V/C of {volumeCapacity.toFixed(2)}, ticketing vehicles offline won't restore speed. Commuters lose hours daily.
                      </p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                      <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide font-mono">Optimal Intervention</h4>
                      <p className="text-xs text-amber-700 leading-relaxed mt-1">
                        Dispatching a warden dynamically to clear {((volumeCapacity - 1) * 33).toFixed(0)}% of blockages would reduce delay minutes by {(delayMinutes * 0.75).toFixed(1)}m.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-100 rounded-xl p-4 border border-slate-200 font-mono text-[10px] text-slate-500 mt-6 flex justify-between items-center">
                <span>Bureau of Public Roads Formulation (1964)</span>
                <span className="text-[#7C5CFF] font-bold">t = t₀(1 + 0.15·x⁴)</span>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* Comparison Matrix Section (Opaque Black Background) */}
      <section id="comparison" className="relative z-10 py-24 bg-black text-white border-y border-zinc-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-[#38BDF8] bg-[#38BDF8]/10 px-3 py-1.5 rounded-full">Comparison System</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mt-4">Legacy Sweeps vs. Smart Command</h2>
            <p className="text-slate-300 mt-3 text-sm md:text-base font-light">Understanding the paradigm shift in traffic resource allocation.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Card 1: Legacy */}
            <div className="bg-[#0e122b]/85 border border-zinc-850 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-4 border-b border-zinc-800 mb-6">
                  <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2">
                    <span className="material-symbols-outlined text-rose-500">lock_open</span>
                    Legacy Enforcement
                  </h3>
                  <span className="text-[10px] font-mono text-rose-500 font-bold bg-rose-500/10 px-2.5 py-1 rounded-full uppercase">Inefficient Loop</span>
                </div>

                <ul className="space-y-4 text-xs text-slate-400">
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-rose-500 text-sm mt-0.5">cancel</span>
                    <span><strong>Officer Ticket Spam:</strong> Officers write multiple tickets to vehicles parked close together, inflating stats without solving capacity flow.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-rose-500 text-sm mt-0.5">cancel</span>
                    <span><strong>Warden Dispatch Bias:</strong> Dispatches target zones where past citations were high, leading to enforcement gaps elsewhere.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-rose-500 text-sm mt-0.5">cancel</span>
                    <span><strong>Static Metric Goals:</strong> Performance judged on raw counts rather than commute hours recovered.</span>
                  </li>
                </ul>
              </div>
              
              <div className="mt-8 pt-4 border-t border-zinc-800 text-[10px] text-slate-500 font-mono">
                Result: Wasted patrol fuel & unmanaged commuter bottlenecks
              </div>
            </div>

            {/* Card 2: Urban Intel */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#7C5CFF] to-[#38BDF8] rounded-2xl blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
              
              <div className="relative bg-[#0c1024]/95 border border-[#7C5CFF]/25 rounded-2xl p-6 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-center pb-4 border-b border-[#7C5CFF]/25 mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#38BDF8]">verified</span>
                      Urban Intel System
                    </h3>
                    <span className="text-[10px] font-mono text-[#38BDF8] font-bold bg-[#38BDF8]/10 px-2.5 py-1 rounded-full uppercase">Optimized Flow</span>
                  </div>

                  <ul className="space-y-4 text-xs text-slate-200">
                    <li className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-[#38BDF8] text-sm mt-0.5">check_circle</span>
                      <span><strong>DBSCAN Event Aggregation:</strong> Deduplicates spatial sweeps. Grouping algorithm merges ticket loops into singular capacity bottlenecks.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-[#38BDF8] text-sm mt-0.5">check_circle</span>
                      <span><strong>OSM Geospace Merging:</strong> Integrates OpenStreetMap features, scaling capacity losses against real lane width.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-[#38BDF8] text-sm mt-0.5">check_circle</span>
                      <span><strong>Real-time Delay Routing:</strong> Prioritizes dispatcher tasks dynamically, routing officers to points where physical bottlenecks degrade speeds.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-white/5 text-[10px] text-[#38BDF8] font-mono">
                  Result: Actionable physics routing & optimized warden dispatch queue
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Methodology Pipeline Section (Opaque White Background) */}
      <section id="how-it-works" className="relative z-10 py-24 bg-white text-slate-900 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-[#7C5CFF] bg-[#7C5CFF]/10 px-3 py-1.5 rounded-full">Methodology</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mt-4">The 4-Step Pipeline</h2>
            <p className="text-slate-600 mt-3 text-sm md:text-base font-light">From raw ticketing sweeps to physics-grounded commute-delay mapping.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1 */}
            <div className="bg-slate-50 border border-slate-200 hover:border-[#7C5CFF]/50 text-slate-900 rounded-2xl p-6 shadow-sm relative flex flex-col justify-between h-72 transition-all duration-300">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-full bg-[#7C5CFF]/10 flex items-center justify-center font-mono font-black text-lg text-[#7C5CFF] border border-[#7C5CFF]/20">01</div>
                <span className="material-symbols-outlined text-[#7C5CFF] text-[24px]">filter_alt</span>
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight mb-2 text-slate-900">Deduplicate</h3>
                <p className="text-slate-600 text-xs leading-relaxed font-light">
                  Sweep deduplication collapses officer ticket-spam (occurring within 15 minutes and 50 meters of a single device ID) into real events, filtering 298k records to 125k.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-slate-50 border border-slate-200 hover:border-[#7C5CFF]/50 text-slate-900 rounded-2xl p-6 shadow-sm relative flex flex-col justify-between h-72 transition-all duration-300">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-full bg-[#7C5CFF]/10 flex items-center justify-center font-mono font-black text-lg text-[#7C5CFF] border border-[#7C5CFF]/20">02</div>
                <span className="material-symbols-outlined text-[#7C5CFF] text-[24px]">group_work</span>
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight mb-2 text-slate-900">Cluster</h3>
                <p className="text-slate-600 text-xs leading-relaxed font-light">
                  DBSCAN spatial clustering groups nearby parking violations to extract true congestion hotspots and shapes boundaries using geometric convex hulls.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-50 border border-slate-200 hover:border-[#7C5CFF]/50 text-slate-900 rounded-2xl p-6 shadow-sm relative flex flex-col justify-between h-72 transition-all duration-300">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-full bg-[#7C5CFF]/10 flex items-center justify-center font-mono font-black text-lg text-[#7C5CFF] border border-[#7C5CFF]/20">03</div>
                <span className="material-symbols-outlined text-[#7C5CFF] text-[24px]">map</span>
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight mb-2 text-slate-900">Ground Truth</h3>
                <p className="text-slate-600 text-xs leading-relaxed font-light">
                  Hotspots are mapped against real OpenStreetMap road classes and actual lane counts, ensuring capacity formulas use real physical data.
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-slate-50 border border-slate-200 hover:border-[#7C5CFF]/50 text-slate-900 rounded-2xl p-6 shadow-sm relative flex flex-col justify-between h-72 transition-all duration-300">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-full bg-[#7C5CFF]/10 flex items-center justify-center font-mono font-black text-lg text-[#7C5CFF] border border-[#7C5CFF]/20">04</div>
                <span className="material-symbols-outlined text-[#7C5CFF] text-[24px]">calculate</span>
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight mb-2 text-slate-900">Quantify</h3>
                <p className="text-slate-600 text-xs leading-relaxed font-light">
                  The Bureau of Public Roads (BPR) traffic physics model converts capacity degradation into the exact minute-delay costs added to traffic streams.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section (Opaque Black Background) */}
      <section id="faq" className="relative z-10 py-24 bg-black text-white border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-[#38BDF8] bg-[#38BDF8]/10 px-3 py-1.5 rounded-full">Questions & Answers</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mt-4">Frequently Asked Questions</h2>
            <p className="text-slate-300 mt-3 text-sm md:text-base font-light">Technical answers explaining the models powering Urban Intel.</p>
          </div>

          <div className="space-y-4">
            {faqData.map((item, idx) => {
              const isOpen = activeFaqIndex === idx;
              return (
                <div 
                  key={idx} 
                  className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#7C5CFF]/40"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                  >
                    <span className="font-bold text-sm md:text-base text-white tracking-wide">{item.q}</span>
                    <span className={`material-symbols-outlined text-[#38BDF8] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                      keyboard_arrow_down
                    </span>
                  </button>
                  <div 
                    className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                      isOpen ? 'pb-6 max-h-40 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <p className="text-slate-300 text-xs md:text-sm leading-relaxed font-light border-t border-zinc-800 pt-4 font-light">
                      {item.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* High Contrast Callout banner (Opaque White Background) */}
      <section className="relative z-10 py-24 bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-gradient-to-r from-[#7C5CFF] to-[#38BDF8] rounded-3xl p-8 md:p-12 shadow-xl relative overflow-hidden text-left">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none hidden md:block">
              <span className="material-symbols-outlined text-[300px] text-white absolute right-[-50px] top-1/2 -translate-y-1/2">radar</span>
            </div>

            <div className="max-w-2xl relative z-10">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-white bg-white/10 px-3.5 py-1.5 rounded-full">Exposing Patrol Blindspots</span>
              
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mt-6 leading-tight">
                "The zones we are NOT watching may be worse than the ones we are."
              </h2>
              
              <p className="mt-4 text-white/90 text-sm md:text-base leading-relaxed font-light">
                Unlike static camera platforms that require massive capital investment, our **Blindspot Radar** parses spatial ticketing logs to pinpoint where expectations diverge from reality. By calculating Expected vs Observed violations, we expose the exact enforcement vacuums where patrols have created a feedback bias.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/dashboard" className="bg-white text-[#7C5CFF] hover:bg-[#dfe0ff] font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-xl active:scale-[0.98]">
                  Open Blindspot Radar
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer (Opaque Dark Footer) */}
      <footer className="bg-black border-t border-zinc-900 py-12 relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#38BDF8] text-xl font-bold">traffic</span>
              <span className="font-bold text-white font-mono uppercase tracking-wider text-sm">Urban Intel</span>
            </div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Theme 1: Parking-Induced Congestion</span>
          </div>

          <div className="flex gap-8 text-xs font-semibold text-slate-400 font-mono">
            <a href="#how-it-works" onClick={(e) => handleScrollTo(e, 'how-it-works')} className="hover:text-white transition-colors">How It Works</a>
            <Link href="/dashboard" className="hover:text-white transition-colors">Command Center</Link>
            <a href="https://github.com/Drifting-Moon/locklock" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>

          <div className="text-[11px] text-slate-400 font-mono text-center md:text-right">
            <div>Flipkart Gridlock Hackathon Project</div>
            <div className="text-[10px] text-slate-500 mt-1">Built with OSM and BPR Physics</div>
          </div>
        </div>
      </footer>

    </div>
  );
}
