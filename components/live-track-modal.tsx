'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, MapPin, Navigation, Bike, Loader2, Phone, Mail, Clock, ShieldCheck, ClipboardList } from 'lucide-react';
import { riderAPI } from '../lib/api';

const MAP_STYLES = {
  sleekLight: {
    name: 'Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB'
  },
  sleekDark: {
    name: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB'
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri'
  },
  standard: {
    name: 'Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap'
  }
};

interface LiveTrackModalProps {
  riderId: string;
  onClose: () => void;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function LiveTrackModal({ riderId, onClose }: LiveTrackModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [riderData, setRiderData] = useState<any>(null);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [mapStyle, setMapStyle] = useState<keyof typeof MAP_STYLES>('sleekLight');

  const mapRef = useRef<any>(null);
  const riderMarkerRef = useRef<any>(null);
  const targetMarkerRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

  // Load Leaflet assets dynamically from CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.async = true;
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.body.appendChild(script);
  }, []);

  // Fetch Rider Live Details from Backend API
  const fetchLiveDetails = async (isFirstLoad = false) => {
    try {
      if (isFirstLoad) setLoadingDetails(true);
      setErrorMsg('');

      const response = await riderAPI.getLiveDetails(riderId);

      const { rider, activeJob: job } = response.data.data;
      setRiderData(rider);
      setActiveJob(job);
    } catch (err: any) {
      console.error('Error fetching live tracking:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to fetch live tracking statistics.');
    } finally {
      if (isFirstLoad) setLoadingDetails(false);
    }
  };

  // Poll for updates every 10 seconds
  useEffect(() => {
    void fetchLiveDetails(true);
    
    const interval = setInterval(() => {
      void fetchLiveDetails(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [riderId]);

  // Update map layer on style changes
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    const style = MAP_STYLES[mapStyle];
    tileLayerRef.current = L.tileLayer(style.url, {
      maxZoom: 19,
      attribution: style.attribution
    }).addTo(mapRef.current);
  }, [leafletLoaded, mapStyle]);

  // Update Marker Positions and Fit Map Boundaries
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || !riderData) return;

    const L = (window as any).L;
    if (!L) return;

    const riderLat = parseFloat(riderData.current_latitude) || 18.5204;
    const riderLng = parseFloat(riderData.current_longitude) || 73.8567;

    const riderPosition = [riderLat, riderLng];

    // Setup custom icons
    const riderIcon = L.divIcon({
      html: `<div style="background-color: #1e293b; width: 28px; height: 28px; border-radius: 14px; border: 3px solid #fff; box-shadow: 0 3px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; position: relative;">
               <div style="background-color: #10b981; width: 8px; height: 8px; border-radius: 4px; position: absolute; top: -1px; right: -1px; border: 1.5px solid #fff;"></div>
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bike"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 12h3.5l1.5-3h-3.5Z"/><path d="M12 4h3.5l1.5 3"/><path d="M12 4v10"/><path d="M17 17.5 14 12"/></svg>
             </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const destinationIcon = L.divIcon({
      html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 12px; border: 3px solid #fff; box-shadow: 0 3px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
               <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
             </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    // 1. Initialize Map
    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView(riderPosition, 14);

      // Load initial tiles
      const style = MAP_STYLES[mapStyle];
      tileLayerRef.current = L.tileLayer(style.url, {
        maxZoom: 19,
        attribution: style.attribution
      }).addTo(map);

      // Add Rider marker
      const riderMarker = L.marker(riderPosition, { icon: riderIcon })
        .addTo(map)
        .bindPopup(`<b>${riderData.rider_name}</b><br/>${riderData.special_rider_id}`);

      mapRef.current = map;
      riderMarkerRef.current = riderMarker;
    } else {
      // Update existing Rider marker
      riderMarkerRef.current.setLatLng(riderPosition);
      riderMarkerRef.current.getPopup().setContent(`<b>${riderData.rider_name}</b><br/>${riderData.special_rider_id}`);
    }

    // 2. Handle active job routing representation
    if (activeJob && activeJob.destination_lat && activeJob.destination_lng) {
      const destLat = parseFloat(activeJob.destination_lat);
      const destLng = parseFloat(activeJob.destination_lng);
      const destPosition = [destLat, destLng];

      // Add or update destination marker
      if (!targetMarkerRef.current) {
        targetMarkerRef.current = L.marker(destPosition, { icon: destinationIcon })
          .addTo(mapRef.current)
          .bindPopup(`<b>Destination</b><br/>${activeJob.destination_name}`);
      } else {
        targetMarkerRef.current.setLatLng(destPosition);
        targetMarkerRef.current.getPopup().setContent(`<b>Destination</b><br/>${activeJob.destination_name}`);
      }

      // Add or update route line (dotted)
      if (!routeLineRef.current) {
        routeLineRef.current = L.polyline([riderPosition, destPosition], {
          color: '#d97706',
          weight: 4,
          opacity: 0.8,
          dashArray: '5, 10'
        }).addTo(mapRef.current);
      } else {
        routeLineRef.current.setLatLngs([riderPosition, destPosition]);
      }

      // Fit map to show both markers
      const group = L.featureGroup([riderMarkerRef.current, targetMarkerRef.current]);
      mapRef.current.fitBounds(group.getBounds().pad(0.3));

    } else {
      // If no active job, clean up previous destination pins/lines
      if (targetMarkerRef.current) {
        mapRef.current.removeLayer(targetMarkerRef.current);
        targetMarkerRef.current = null;
      }
      if (routeLineRef.current) {
        mapRef.current.removeLayer(routeLineRef.current);
        routeLineRef.current = null;
      }
      
      // Focus on rider only
      mapRef.current.setView(riderPosition, mapRef.current.getZoom());
    }

  }, [leafletLoaded, riderData, activeJob]);

  // Clean up Leaflet elements on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        riderMarkerRef.current = null;
        targetMarkerRef.current = null;
        routeLineRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, []);

  const totalQty = activeJob?.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
  
  const distanceRemaining = riderData && activeJob && activeJob.destination_lat && activeJob.destination_lng
    ? calculateDistance(
        parseFloat(riderData.current_latitude),
        parseFloat(riderData.current_longitude),
        parseFloat(activeJob.destination_lat),
        parseFloat(activeJob.destination_lng)
      ).toFixed(2)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex h-[88vh] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-2xl">
        
        {/* LEFT MAP AREA */}
        <div className="relative flex flex-1 bg-slate-100">
          
          {/* Close button inside Map */}
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 z-[1000] rounded-full bg-white/90 p-2.5 text-slate-500 shadow-md backdrop-blur-sm border border-slate-100 hover:bg-white transition"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Style Selector Buttons Overlay */}
          {leafletLoaded && !loadingDetails && (
            <div className="absolute left-4 top-4 z-[1000] flex gap-1 rounded-xl bg-white/90 p-1 shadow-md backdrop-blur-sm border border-slate-100">
              {(Object.keys(MAP_STYLES) as Array<keyof typeof MAP_STYLES>).map((styleKey) => (
                <button
                  key={styleKey}
                  type="button"
                  onClick={() => setMapStyle(styleKey)}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-bold tracking-wide transition ${
                    mapStyle === styleKey
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {MAP_STYLES[styleKey].name}
                </button>
              ))}
            </div>
          )}

          {/* Map Target Render */}
          <div ref={mapContainerRef} className="h-full w-full" />

          {/* Map Loading and Error State Overlay */}
          {(!leafletLoaded || loadingDetails) && (
            <div className="absolute inset-0 z-[1001] flex flex-col items-center justify-center gap-3 bg-slate-50/70 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              <p className="text-sm font-semibold text-slate-500">Connecting live logistics tracking...</p>
            </div>
          )}

          {errorMsg && (
            <div className="absolute inset-x-4 bottom-4 z-[1000] rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 shadow-md">
              {errorMsg}
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR PANEL */}
        <div className="w-80 border-l border-slate-100 flex flex-col bg-white overflow-hidden shrink-0">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bike className="h-5 w-5 text-amber-600" />
              Live Delivery Track
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wide">
              {riderData ? `Rider: ${riderData.special_rider_id}` : 'Syncing rider details...'}
            </p>
          </div>

          {/* Scrolling Details panel */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* Rider profile card */}
            {riderData && (
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">Rider profile</h4>
                <div className="rounded-2xl border border-slate-100 p-4 space-y-3 shadow-sm bg-slate-50/30">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0 font-bold text-sm">
                      {riderData.rider_name.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-slate-800 text-sm truncate">{riderData.rider_name}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider mt-1 border ${
                        riderData.is_online 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {riderData.is_online ? 'On Duty' : 'Off Duty'}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2.5 border-t border-slate-100 space-y-2 text-xs text-slate-600 font-medium">
                    {riderData.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{riderData.contact_phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{riderData.rider_email}</span>
                    </div>
                    {(riderData.vehicle_type || riderData.vehicle_number) && (
                      <div className="flex items-start gap-2 pt-1">
                        <Bike className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-800">{riderData.vehicle_type || 'Unspecified'}</p>
                          <p className="text-[10px] text-slate-400">{riderData.vehicle_number || 'No plate'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Active Job Card */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">Current assignment</h4>
              
              {!activeJob ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/20">
                  <ClipboardList className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No Active Tasks</p>
                  <p className="text-[10px] text-slate-400 mt-1">Rider is currently waiting in the dispatch queue.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-100 p-4 space-y-4 shadow-sm bg-amber-50/10">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div>
                      <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                        activeJob.type === 'pickup'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {activeJob.type === 'pickup' ? 'Vendor Pickup' : 'Customer Delivery'}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-600">{activeJob.order_reference}</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destination Name</p>
                      <p className="font-bold text-slate-800 mt-0.5 text-sm">{activeJob.destination_name}</p>
                    </div>

                    <div className="flex items-start gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destination Address</p>
                        <p className="font-medium text-slate-600 mt-0.5">{activeJob.destination_address}</p>
                      </div>
                    </div>

                    {activeJob.destination_phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-600">{activeJob.destination_phone}</span>
                      </div>
                    )}

                    {distanceRemaining && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-semibold text-slate-700">
                        <span>Distance remaining:</span>
                        <span className="text-amber-700 font-bold text-sm">{distanceRemaining} km</span>
                      </div>
                    )}
                  </div>

                  {/* Items list */}
                  {activeJob.items && activeJob.items.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Package Contents ({totalQty} items)
                      </p>
                      <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                        {activeJob.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-[11px] font-medium text-slate-600">
                            <span className="truncate pr-2">{item.name}</span>
                            <span className="font-bold text-slate-900 shrink-0">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Footer refresh info */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400">
            <Clock className="h-3 w-3 animate-pulse" />
            <span>Pinging live rider location...</span>
          </div>
        </div>

      </div>
    </div>
  );
}
