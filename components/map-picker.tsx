'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Search, Loader2, X } from 'lucide-react';

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

interface MapPickerProps {
  latitude: number | string;
  longitude: number | string;
  onChange: (lat: number, lng: number) => void;
}

export default function MapPicker({ latitude, longitude, onChange }: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mapStyle, setMapStyle] = useState<keyof typeof MAP_STYLES>('sleekLight');

  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

  // Load Leaflet assets dynamically from CDN to prevent SSR/Next.js bundling issues
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    // Load stylesheet
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    // Load script
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

  // Initialize Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Parse coordinates, default to Pune/Mumbai if none set
    const defaultLat = parseFloat(String(latitude)) || 18.5204;
    const defaultLng = parseFloat(String(longitude)) || 73.8567;

    // Check if map is already initialized
    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([defaultLat, defaultLng], 13);

      // Add default tile layer
      const style = MAP_STYLES[mapStyle];
      tileLayerRef.current = L.tileLayer(style.url, {
        maxZoom: 19,
        attribution: style.attribution
      }).addTo(map);

      // Setup custom pin icon
      const customIcon = L.divIcon({
        html: `<div style="background-color: #d97706; width: 22px; height: 22px; border-radius: 11px; border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.4); position: relative;">
                 <div style="background-color: #ffffff; width: 6px; height: 6px; border-radius: 3px; position: absolute; top: 5px; left: 5px;"></div>
               </div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([defaultLat, defaultLng], {
        icon: customIcon,
        draggable: true
      }).addTo(map);

      // Handle marker drag end
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        onChange(Number(position.lat.toFixed(6)), Number(position.lng.toFixed(6)));
      });

      // Handle map click
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        onChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
      });

      mapRef.current = map;
      markerRef.current = marker;
    } else {
      // If coordinates changed externally, update map and marker
      const markerLatLng = markerRef.current.getLatLng();
      const currentLat = parseFloat(String(latitude));
      const currentLng = parseFloat(String(longitude));

      if (currentLat && currentLng && (markerLatLng.lat !== currentLat || markerLatLng.lng !== currentLng)) {
        markerRef.current.setLatLng([currentLat, currentLng]);
        mapRef.current.setView([currentLat, currentLng], mapRef.current.getZoom());
      }
    }
  }, [leafletLoaded, latitude, longitude, onChange]);

  // Update Tile Layer dynamically when style changes
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

  // Handle click outside to close suggestions dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch Autocomplete Suggestions as user types (debounced)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery
          )}&limit=5`
        );
        const results = await response.json();
        setSuggestions(results || []);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      }
    }, 450); // 450ms debounce

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Clean up map instance on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, []);

  // Geolocation API to get current location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setGeolocating(true);
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        onChange(lat, lng);
        setGeolocating(false);

        if (mapRef.current && markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          mapRef.current.setView([lat, lng], 15);
        }
      },
      (error) => {
        console.error('Error fetching geolocation:', error);
        setErrorMsg('Unable to retrieve your location. Make sure GPS permissions are enabled.');
        setGeolocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Select a suggestion from the dropdown list
  const handleSelectSuggestion = (item: any) => {
    const lat = Number(parseFloat(item.lat).toFixed(6));
    const lng = Number(parseFloat(item.lon).toFixed(6));

    setSearchQuery(item.display_name);
    setShowSuggestions(false);
    onChange(lat, lng);

    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], 15);
    }
  };

  // Manual Trigger Location Search
  const handleLocationSearch = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setErrorMsg('');
    setShowSuggestions(false);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`
      );
      const results = await response.json();

      if (results && results.length > 0) {
        const lat = Number(parseFloat(results[0].lat).toFixed(6));
        const lng = Number(parseFloat(results[0].lon).toFixed(6));
        onChange(lat, lng);

        if (mapRef.current && markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          mapRef.current.setView([lat, lng], 15);
        }
      } else {
        setErrorMsg('Location not found. Please try a different search query.');
      }
    } catch (err) {
      console.error('Error searching location:', err);
      setErrorMsg('Search service failed. Please enter coordinates manually.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center relative z-20">
        {/* Nominatim Autocomplete Search Input */}
        <div ref={searchContainerRef} className="relative flex flex-1">
          <input
            type="text"
            placeholder="Search address / place name on map..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleLocationSearch(e);
              }
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-24 py-2.5 text-xs placeholder-slate-400 outline-none focus:border-amber-500 focus:bg-white transition"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSuggestions([]);
              }}
              className="absolute right-20 top-3 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleLocationSearch()}
            disabled={searching}
            className="absolute right-1 top-1.5 flex items-center justify-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-[10px] font-medium text-white hover:bg-slate-700 transition"
          >
            {searching ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              'Search'
            )}
          </button>

          {/* Autocomplete Dropdown List */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl transition-all">
              {suggestions.map((item) => (
                <button
                  key={item.place_id}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="w-full text-left rounded-lg px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition flex items-start gap-2 border-none"
                >
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="truncate">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Current Location Button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={geolocating}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-600/30 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition whitespace-nowrap"
        >
          {geolocating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Navigation className="h-3.5 w-3.5 rotate-45 fill-amber-700" />
          )}
          Use Current Location
        </button>
      </div>

      {errorMsg && (
        <p className="text-[11px] font-medium text-red-600">{errorMsg}</p>
      )}

      {/* Map Element */}
      <div className="relative rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden shadow-inner z-10">
        {!leafletLoaded && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-50/80 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            <p className="text-xs text-slate-400">Loading interactive map...</p>
          </div>
        )}

        {/* Style Selector Buttons Overlay */}
        {leafletLoaded && (
          <div className="absolute left-2 top-2 z-10 flex gap-1 rounded-xl bg-white/90 p-1 shadow-md backdrop-blur-sm border border-slate-100">
            {(Object.keys(MAP_STYLES) as Array<keyof typeof MAP_STYLES>).map((styleKey) => (
              <button
                key={styleKey}
                type="button"
                onClick={() => setMapStyle(styleKey)}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${mapStyle === styleKey
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                {MAP_STYLES[styleKey].name}
              </button>
            ))}
          </div>
        )}

        <div ref={mapContainerRef} style={{ height: '240px', width: '100%' }} />
        <div className="absolute bottom-2 right-2 z-10 rounded bg-white/95 px-2 py-1 shadow text-[9px] font-semibold text-slate-400 pointer-events-none flex items-center gap-1">
          <MapPin className="h-3 w-3 text-amber-600" />
          Click or drag marker to set precise coordinates
        </div>
      </div>
    </div>
  );
}
