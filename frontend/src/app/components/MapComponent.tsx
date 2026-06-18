"use client";

import React, { useState, useEffect } from 'react';
import Map, { Source, Layer, MapRef, type LayerProps } from 'react-map-gl/maplibre';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import DispatchPanel from './DispatchPanel';

type MapTheme = 'dark' | 'light' | 'satellite';

interface MapComponentProps {
  mapRef: React.RefObject<MapRef | null>;
  mapTheme: MapTheme;
  setMapTheme: (theme: MapTheme) => void;
  isPredictiveMode: boolean;
  setIsPredictiveMode: (predictive: boolean) => void;
  hotspots: any;
  forecastData: any;
  isDispatchPanelOpen: boolean;
  setIsDispatchPanelOpen: (open: boolean) => void;
  district: string;
  onSelectHotspot: (hotspot: any) => void;
  selectedHour: number;
  setSelectedHour: (hour: number) => void;
  blindspots?: any[];
  timeframe: string;
}

export default function MapComponent({
  mapRef,
  mapTheme,
  setMapTheme,
  isPredictiveMode,
  setIsPredictiveMode,
  hotspots,
  forecastData,
  isDispatchPanelOpen,
  setIsDispatchPanelOpen,
  district,
  onSelectHotspot,
  selectedHour,
  setSelectedHour,
  blindspots = [],
  timeframe
}: MapComponentProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setSelectedHour((selectedHour + 1) % 24);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, selectedHour, setSelectedHour]);

  const getMapStyleUrl = (theme: MapTheme): string | StyleSpecification => {
    if (theme === 'dark') return "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
    if (theme === 'light') return "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
    if (theme === 'satellite') return {
      "version": 8,
      "sources": {
        "esri": {
          "type": "raster",
          "tiles": ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
          "tileSize": 256
        }
      },
      "layers": [{
        "id": "satellite",
        "type": "raster",
        "source": "esri",
        "minzoom": 0,
        "maxzoom": 22
      }]
    };
    return "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
  };

  const polygonLayer: LayerProps = {
    id: 'hotspot-polygons',
    type: 'fill',
    paint: {
      'fill-color': [
        'interpolate',
        ['linear'],
        ['get', 'bprDelay'],
        0, '#ffeb3b',     // Yellow for low delay
        5, '#ff9800',     // Orange for medium delay
        15, '#f44336'     // Red for high delay
      ],
      'fill-opacity': 0.4
    }
  };

  const polygonOutlineLayer: LayerProps = {
    id: 'hotspot-polygons-outline',
    type: 'line',
    paint: {
      'line-color': [
        'interpolate',
        ['linear'],
        ['get', 'bprDelay'],
        0, '#ffeb3b',
        5, '#ff9800',
        15, '#f44336'
      ],
      'line-width': 2
    }
  };

  const predictiveLayer: LayerProps = {
    id: 'predictive-zones',
    type: 'circle',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 30, 15, 120],
      'circle-color': ['get', 'color'],
      'circle-opacity': 0.25,
      'circle-stroke-width': 2,
      'circle-stroke-color': ['get', 'color']
    }
  };

  const predictiveLabels: LayerProps = {
    id: 'predictive-labels',
    type: 'symbol',
    layout: {
      'text-field': ['concat', ['get', 'name'], '\n', ['get', 'risk']],
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      'text-size': 12,
      'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      'text-radial-offset': 1.5,
      'text-justify': 'center',
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#000000',
      'text-halo-width': 2
    }
  };

  const onMapClick = (event: any) => {
    const features = event.features;
    const clickedFeature = features && features.find((f: any) => f.layer.id === 'hotspot-polygons');
    if (clickedFeature) {
      onSelectHotspot(clickedFeature.properties);
    }
  };

  const handleExportManifest = () => {
    if (!hotspots?.features && (!blindspots || blindspots.length === 0)) {
      alert("No active data to export in the manifest.");
      return;
    }

    const rows = [
      ["MANIFEST TYPE", "LOCATION", "DIVISION/STATION", "METRIC / BIAS", "COORDINATES", "ACTION RECOMMENDATION"],
    ];

    if (hotspots?.features) {
      const sortedHotspots = [...hotspots.features]
        .sort((a, b) => b.properties.violationCount - a.properties.violationCount)
        .slice(0, 5);
      
      sortedHotspots.forEach((f) => {
        const p = f.properties;
        rows.push([
          "HOTSPOT (CONGESTION)",
          p.locationName,
          p.policeStation,
          `${p.violationCount} Violations (${p.bprDelay.toFixed(1)}m Delay)`,
          `${p.centerLat}, ${p.centerLng}`,
          `Deploy towing patrol & inspect lane capacity (${p.laneCount} lanes)`
        ]);
      });
    }

    if (blindspots) {
      const sortedBlindspots = [...blindspots]
        .sort((a, b) => b.patrolBiasRatio - a.patrolBiasRatio)
        .slice(0, 5);
      
      sortedBlindspots.forEach((b) => {
        rows.push([
          "BIAS BLINDSPOT (RADAR)",
          b.locationName,
          "BTP Patrol Route",
          `${b.patrolBiasRatio.toFixed(1)}x Patrol Bias (${b.observedCount} vs ${b.expectedCount} exp)`,
          `${b.lat}, ${b.lng}`,
          "Deploy random audit patrol / device calibration check"
        ]);
      });
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `patrol_manifest_${timeframe.replace(/ /g, '_')}_${selectedHour}h.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-lg flex-1 flex flex-col relative overflow-hidden min-h-[600px]">
      {/* Consolidated Slim Top Header */}
      <div className="bg-[#121626]/85 backdrop-blur-md px-4 py-2.5 border-b border-outline-variant shrink-0 flex items-center justify-between gap-4 z-20">
        {/* Title */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="material-symbols-outlined text-primary text-xl">map</span>
          <h3 className="font-headline-md text-sm sm:text-base font-bold text-white tracking-wide">Traffic Physics Map</h3>
        </div>

        {/* Live/Forecast Toggle */}
        <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 shrink-0">
          <button 
            onClick={() => setIsPredictiveMode(false)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${!isPredictiveMode ? 'bg-error/20 text-error border border-error/30 shadow-md shadow-error/10' : 'text-white/60 hover:text-white border border-transparent'}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${!isPredictiveMode ? 'bg-error animate-pulse' : 'bg-transparent'}`}></div>
            LIVE
          </button>
          <button 
            onClick={() => setIsPredictiveMode(true)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${isPredictiveMode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-md shadow-amber-500/10' : 'text-white/60 hover:text-white border border-transparent'}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${isPredictiveMode ? 'bg-amber-400 animate-pulse' : 'bg-transparent'}`}></div>
            FORECAST
          </button>
        </div>
      </div>
      
      <div className="flex-1 relative w-full h-full">
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: 77.5946,
            latitude: 12.9716,
            zoom: 11
          }}
          style={{ width: "100%", height: "100%" }}
          mapStyle={getMapStyleUrl(mapTheme)}
          onClick={onMapClick}
          interactiveLayerIds={['hotspot-polygons']}
        >
          {hotspots && (
            <Source type="geojson" data={hotspots}>
              <Layer {...polygonLayer} />
              <Layer {...polygonOutlineLayer} />
            </Source>
          )}
          {isPredictiveMode && forecastData && (
            <Source type="geojson" data={forecastData}>
              <Layer {...predictiveLayer} />
              <Layer {...predictiveLabels} />
            </Source>
          )}
        </Map>
        
        {/* Dispatch Panel Overlay */}
        <DispatchPanel 
          isOpen={isDispatchPanelOpen} 
          onClose={() => setIsDispatchPanelOpen(false)} 
          district={district}
        />

        {/* Recenter Button */}
        <button 
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            mapRef.current?.flyTo({ center: [77.5946, 12.9716], zoom: 11, duration: 1500 });
          }}
          className="absolute top-4 right-4 bg-surface-container-high/95 backdrop-blur-md border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary p-2 rounded-xl shadow-lg transition-all flex items-center justify-center group z-10 cursor-pointer"
          title="Recenter Map"
        >
          <span className="material-symbols-outlined text-[20px] group-active:scale-90 transition-transform">my_location</span>
        </button>

        {/* Map Style Switcher (Vertical Utility Panel below Recenter) */}
        <div 
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-16 right-4 bg-[#121626]/90 backdrop-blur-md border border-white/10 rounded-xl p-1 shadow-lg z-10 flex flex-col gap-1 w-12 overflow-hidden"
        >
          <button 
            onClick={() => setMapTheme('dark')}
            className={`py-1.5 rounded-lg text-[9px] font-black transition-all cursor-pointer ${mapTheme === 'dark' ? 'bg-[#3e52ff] text-white shadow-sm' : 'text-white/60 hover:text-white'}`}
            title="Dark Map"
          >
            DARK
          </button>
          <button 
            onClick={() => setMapTheme('light')}
            className={`py-1.5 rounded-lg text-[9px] font-black transition-all cursor-pointer ${mapTheme === 'light' ? 'bg-[#3e52ff] text-white shadow-sm' : 'text-white/60 hover:text-white'}`}
            title="Light Map"
          >
            LIGHT
          </button>
          <button 
            onClick={() => setMapTheme('satellite')}
            className={`py-1.5 rounded-lg text-[9px] font-black transition-all cursor-pointer ${mapTheme === 'satellite' ? 'bg-[#3e52ff] text-white shadow-sm' : 'text-white/60 hover:text-white'}`}
            title="Satellite Map"
          >
            SAT
          </button>
        </div>

        {/* Upgraded Live Metrics & Legend Overlay (bottom-left) */}
        <div className="absolute bottom-24 left-4 md:bottom-28 md:left-6 bg-[#121626]/90 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl z-10 pointer-events-none w-52">
          <h4 className="font-label-md font-bold text-white/50 mb-2 text-[9px] uppercase tracking-wider border-b border-white/10 pb-1.5 flex items-center justify-between">
            <span>Live Metrics & Legend</span>
            <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
          </h4>
          
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex flex-col">
              <span className="text-[8px] text-white/40 font-bold uppercase tracking-wider">Active Hotspots</span>
              <span className="text-sm font-black text-white font-mono">{hotspots?.features?.length || 0}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-white/40 font-bold uppercase tracking-wider">Total Delay</span>
              <span className="text-sm font-black text-error font-mono truncate">
                +{Math.round(hotspots?.features?.reduce((acc: number, f: any) => acc + (f.properties?.bprDelay || 0), 0) || 0).toLocaleString()}m
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 text-xs text-on-surface font-label-md pt-2 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-1.5 bg-[#ffeb3b]/40 border border-[#ffeb3b] rounded-sm"></div>
              <span className="text-[9px] text-white/70">DBSCAN Convex Hull</span>
            </div>
            
            <div className="flex flex-col gap-1 mt-0.5">
              <span className="mb-0.5 text-[8px] uppercase font-bold text-white/40 tracking-wider">BPR Delay Severity</span>
              <div className="w-full h-1.5 rounded-full bg-gradient-to-r from-[#ffeb3b] via-[#ff9800] to-[#f44336] border border-white/10"></div>
              <div className="flex justify-between text-[7px] text-white/30 px-0.5 mt-0.5 font-mono">
                <span>Low (&lt;5m)</span>
                <span>Critical (&gt;15m)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Bottom-Center Temporal Scrubber (YouTube-Scrubber style) */}
        <div 
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#121626]/95 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2 shadow-2xl z-10 w-[260px] sm:w-[320px] md:w-[380px] flex flex-col gap-1.5"
        >
          <div className="flex justify-between items-center text-[8px] font-bold text-white/50 uppercase tracking-widest">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[10px] text-[#bdc2ff]">schedule</span>
              <span>Temporal Scrubber</span>
            </div>
            
            <span className="font-mono text-primary text-[10px] font-black bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
              {selectedHour.toString().padStart(2, '0')}:00
              {selectedHour >= 8 && selectedHour <= 10 && ' (AM Peak)'}
              {selectedHour >= 17 && selectedHour <= 19 && ' (PM Peak)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
              title={isPlaying ? "Pause Playback" : "Play Playback"}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>
            <span className="text-[8px] text-white/30 font-mono select-none">00h</span>
            <input 
              type="range" 
              min="0" 
              max="23" 
              value={selectedHour} 
              onChange={(e) => {
                setSelectedHour(parseInt(e.target.value));
                setIsPlaying(false);
              }}
              className="flex-1 accent-[#3e52ff] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[8px] text-white/30 font-mono select-none">23h</span>
          </div>
        </div>
      </div>
    </div>
  );
}
