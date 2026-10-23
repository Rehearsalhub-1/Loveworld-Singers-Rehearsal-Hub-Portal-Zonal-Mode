"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Save,
  Crosshair,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Building,
  Radio,
  CheckCircle,
  AlertCircle,
  Navigation,
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api';
import { BackendAPI } from '@/lib/api-client';
import { useZone } from '@/hooks/useZone';
import { isHQGroup } from '@/config/zones';

interface VenuePreset {
  name: string;
  lat: string;
  lon: string;
  radius: string;
  description: string;
}

const VENUE_PRESETS: VenuePreset[] = [
  {
    name: 'Loveworld Convocation Arena (LCA)',
    lat: '6.618640',
    lon: '3.361420',
    radius: '350',
    description: 'Ikeja, Lagos • Main Rehearsal & Broadcast Arena',
  },
  {
    name: 'Loveworld Crusade Grounds',
    lat: '6.744120',
    lon: '3.472140',
    radius: '500',
    description: 'Asese, Ogun State • Mega Rehearsal Camp',
  },
  {
    name: 'Loveworld Studio A',
    lat: '6.458985',
    lon: '3.406232',
    radius: '200',
    description: 'Central Broadcast & AudioLab Studio',
  },
  {
    name: 'Oasis Studio Center',
    lat: '6.462110',
    lon: '3.411250',
    radius: '150',
    description: 'Live Band & Vocal Rehearsal Suite',
  },
  {
    name: 'Main Church Auditorium',
    lat: '6.601840',
    lon: '3.351520',
    radius: '250',
    description: 'Sunday Service & Choir Staging Hall',
  },
  {
    name: 'Cape Town Assembly Hall',
    lat: '-33.924870',
    lon: '18.424060',
    radius: '250',
    description: 'Regional Zonal & Church Assembly',
  },
  {
    name: 'Johannesburg Central Hall',
    lat: '-26.204100',
    lon: '28.047300',
    radius: '300',
    description: 'Southern Africa Zonal Rehearsal Hub',
  },
];

const RADIUS_OPTIONS = ['100', '200', '300', '500', '1000'];

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '380px',
};

export default function GeofenceConfigSection() {
  const { currentZone } = useZone();

  const [venueName, setVenueName] = useState('');
  const [lat, setLat] = useState('6.458985');
  const [lon, setLon] = useState('3.406232');
  const [radius, setRadius] = useState('200');
  const [activeEventName, setActiveEventName] = useState('Choir Rehearsal');
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Google Maps Loader
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const isHQ = currentZone ? isHQGroup(currentZone.id) : false;
  const docId = currentZone?.id
    ? isHQ ? 'geofence_hq' : `geofence_${currentZone.id}`
    : 'geofence';

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const res: any = await BackendAPI.settings.get(docId).catch(() => null)
          || await BackendAPI.generic.get('settings', docId).catch(() => null);
        const data = res?.data || res;
        if (data && (data.latitude != null || data.activeEventName || data.venueName)) {
          if (data.venueName) setVenueName(String(data.venueName));
          if (data.latitude != null) setLat(data.latitude.toString());
          if (data.longitude != null) setLon(data.longitude.toString());
          if (data.radius != null) setRadius(data.radius.toString());
          if (data.activeEventName) setActiveEventName(String(data.activeEventName));
          if (data.isEnabled !== undefined) setIsEnabled(Boolean(data.isEnabled));
        } else {
          setVenueName(`${currentZone?.name || 'Rehearsal'} Venue`);
          setLat('6.458985');
          setLon('3.406232');
          setRadius('200');
          setActiveEventName('Choir Rehearsal');
          setIsEnabled(true);
        }
      } catch (err) {
        console.warn('Failed to load geofence settings:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [docId, currentZone?.name]);

  const handleApplyPreset = (preset: VenuePreset) => {
    setVenueName(preset.name);
    setLat(preset.lat);
    setLon(preset.lon);
    setRadius(preset.radius);
    showToast('success', `Applied preset: ${preset.name}`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        venueName: venueName.trim() || `${currentZone?.name || 'Choir'} Venue`,
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        radius: parseInt(radius, 10) || 200,
        activeEventName: activeEventName.trim() || 'Choir Rehearsal',
        isEnabled,
        updatedAt: new Date().toISOString(),
        zoneId: currentZone?.id || 'default',
      };

      await BackendAPI.settings.set(docId, payload).catch(() => null);
      await BackendAPI.generic.update('settings', docId, payload).catch(() => null);

      showToast('success', 'Geofence & venue clock-in configuration saved!');
    } catch (error) {
      console.error('Failed to save geofence:', error);
      showToast('error', 'Failed to save geofence settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setLat(e.latLng.lat().toFixed(6));
      setLon(e.latLng.lng().toFixed(6));
    }
  }, []);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('error', 'Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLon(position.coords.longitude.toFixed(6));
        setLocating(false);
        showToast('success', 'Detected current coordinates.');
      },
      () => {
        setLocating(false);
        showToast('error', 'Could not retrieve GPS location. Ensure location permissions are enabled.');
      },
      { timeout: 10000 }
    );
  };

  const position = {
    lat: parseFloat(lat) || 6.458985,
    lng: parseFloat(lon) || 3.406232,
  };
  const radiusNum = parseInt(radius, 10) || 200;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 p-4 lg:p-8 space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-[100] px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-semibold transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            toastMessage.type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-rose-600 text-white shadow-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle className="w-4 h-4 stroke-[3px]" /> : <AlertCircle className="w-4 h-4 stroke-[3px]" />}
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                <MapPin className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Geofence & Venue Clock-in</h1>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Configure rehearsal venue GPS coordinates, clock-in boundary radius, and mobile attendance enforcement.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={handleGetCurrentLocation}
              disabled={locating}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl text-slate-700 text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" /> : <Crosshair className="w-3.5 h-3.5 text-purple-600" />}
              Use My Location
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-purple-200 active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Geofence
            </button>
          </div>
        </div>

        {/* Enforcement Toggle Banner */}
        <div className={`p-5 rounded-3xl border transition-all ${
          isEnabled
            ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-200 shadow-sm'
            : 'bg-gradient-to-r from-amber-50 via-orange-50 to-white border-amber-200 shadow-sm'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className={`p-3 rounded-2xl ${isEnabled ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
                {isEnabled ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Location Clock-in Enforcement</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {isEnabled ? 'Active • Enforced' : 'Inactive • Open Check-in'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                  {isEnabled
                    ? 'Singers must be physically present inside the venue radius to clock in for rehearsal.'
                    : 'Geofence verification is relaxed. Singers can clock in from any location without GPS boundary checks.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEnabled(!isEnabled)}
              className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isEnabled ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isEnabled ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Quick Venue Presets */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
            <Building className="w-4 h-4 text-purple-600" />
            Quick Venue Presets
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {VENUE_PRESETS.map((preset, i) => {
              const isSelected = venueName === preset.name;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`flex flex-col items-start p-3.5 rounded-2xl text-left border transition-all active:scale-[0.98] group ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50/70 shadow-sm ring-1 ring-purple-600/30'
                      : 'border-slate-100 hover:border-purple-200 bg-slate-50/60 hover:bg-white'
                  }`}
                >
                  <span className={`text-xs font-bold truncate w-full ${isSelected ? 'text-purple-700' : 'text-slate-800 group-hover:text-purple-700'}`}>
                    {preset.name}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                    {preset.description}
                  </span>
                  <div className="flex items-center gap-2 mt-2 text-[10px] font-bold text-slate-500">
                    <span className="px-1.5 py-0.5 bg-white/80 rounded border border-slate-200/80">Radius: {preset.radius}m</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Layout: Map + Controls */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Map Preview */}
          <div className="flex-1 bg-white rounded-3xl border border-slate-100 p-4 shadow-sm flex flex-col" style={{ minHeight: '440px' }}>
            <div className="flex items-center justify-between mb-3 px-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                Live Geofence Boundary Preview
              </span>
              <span className="text-xs font-mono font-bold text-slate-600">
                {position.lat.toFixed(5)}, {position.lng.toFixed(5)} • r: {radiusNum}m
              </span>
            </div>

            <div className="flex-1 rounded-2xl overflow-hidden border border-slate-100 relative" style={{ minHeight: '380px' }}>
              {isLoaded && !loadError ? (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={position}
                  zoom={16}
                  onClick={handleMapClick}
                  options={{
                    disableDefaultUI: false,
                    clickableIcons: false,
                  }}
                >
                  <Marker position={position} />
                  <Circle
                    center={position}
                    radius={radiusNum}
                    options={{
                      fillColor: '#9333ea',
                      fillOpacity: 0.22,
                      strokeColor: '#7c3aed',
                      strokeOpacity: 0.85,
                      strokeWeight: 2,
                    }}
                  />
                </GoogleMap>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-purple-50/40 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3 shadow-inner">
                    <Navigation className="w-7 h-7 stroke-[2.5px]" />
                  </div>
                  <h4 className="text-sm font-black text-slate-900 tracking-tight">Interactive Venue Target</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                    Target centered at <strong className="text-purple-700 font-mono">{position.lat.toFixed(6)}, {position.lng.toFixed(6)}</strong> with a radius of <strong className="text-purple-700 font-mono">{radiusNum} meters</strong>.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    <span className="px-3 py-1 bg-white rounded-xl text-xs font-mono font-bold text-slate-700 border border-slate-200 shadow-sm">
                      Lat: {position.lat.toFixed(6)}
                    </span>
                    <span className="px-3 py-1 bg-white rounded-xl text-xs font-mono font-bold text-slate-700 border border-slate-200 shadow-sm">
                      Lon: {position.lng.toFixed(6)}
                    </span>
                    <span className="px-3 py-1 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-sm">
                      Radius: {radiusNum}m
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Controls Box */}
          <div className="w-full lg:w-96 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col space-y-5">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Venue Parameters
            </h3>

            {/* Venue Name */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">
                Venue Name
              </label>
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="e.g. LCA Main Arena"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
              />
            </div>

            {/* Active Event Name */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">
                Active Event Title
              </label>
              <p className="text-[10px] text-slate-400 mb-1.5 leading-tight">
                Clock-ins will be logged under this event program.
              </p>
              <input
                type="text"
                value={activeEventName}
                onChange={(e) => setActiveEventName(e.target.value)}
                placeholder="e.g. Choir Rehearsal"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
              />
            </div>

            {/* Radius Options */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                Boundary Radius (Meters)
              </label>
              <div className="grid grid-cols-5 gap-1.5 mb-2.5">
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRadius(r)}
                    className={`py-2 text-xs font-black rounded-xl border transition-all ${
                      radius === r
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {r}m
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="50"
                max="5000"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
              />
            </div>

            {/* Latitude & Longitude */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Latitude
                </label>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Longitude
                </label>
                <input
                  type="text"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-auto w-full py-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 stroke-[2.5px]" />}
              Save Geofence Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
