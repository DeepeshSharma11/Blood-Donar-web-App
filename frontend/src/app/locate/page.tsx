"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { Search, MapPin, Phone, ShieldAlert, Award, Star, Compass, Activity, Heart } from 'lucide-react';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

interface Donor {
  donor_id: string;
  name: string;
  blood_type: string; // Used for blood group OR organ name in rendering
  organs?: string;
  distance_km: number;
  match_score: number;
  phone?: string;
  urgency_recommendation: string;
  latitude?: number;
  longitude?: number;
}

export default function LocateDonors() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [searchType, setSearchType] = useState<'blood' | 'organ'>('blood');
  
  const [bloodType, setBloodType] = useState('O+');
  const [organType, setOrganType] = useState('Kidneys');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [searched, setSearched] = useState(false);

  const [mapCenter, setMapCenter] = useState<[number, number]>([28.6139, 77.2090]);

  const organOptions = ['Kidneys', 'Liver', 'Lungs', 'Heart', 'Corneas', 'Pancreas'];

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleSearch = async (e?: React.FormEvent, customLat?: number, customLng?: number, customCity?: string) => {
    if (e) e.preventDefault();
    setLoading(true);
    setSearched(true);

    let resolvedLat = customLat || mapCenter[0];
    let resolvedLng = customLng || mapCenter[1];
    let resolvedCity = customCity !== undefined ? customCity : city;

    try {
      if (resolvedCity.trim() && !customLat) {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(resolvedCity.trim())}&limit=1`);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData && geoData.length > 0) {
            resolvedLat = parseFloat(geoData[0].lat);
            resolvedLng = parseFloat(geoData[0].lon);
            setMapCenter([resolvedLat, resolvedLng]);
          }
        }
      }

      const endpoint = searchType === 'blood' ? 'match' : 'match-organs';
      const bodyPayload = searchType === 'blood' 
        ? {
            blood_type: bloodType,
            latitude: resolvedLat,
            longitude: resolvedLng,
            city: resolvedCity.trim() || null, 
            radius_km: 20.0 
          }
        : {
            organ_type: organType,
            latitude: resolvedLat,
            longitude: resolvedLng,
            city: resolvedCity.trim() || null, 
            radius_km: 20.0 
          };

      const res = await fetch(`http://localhost:8000/ai/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (res.ok) {
        const data = await res.json();
        // Standardize output shape
        const formatted = data.map((d: any) => ({
          donor_id: d.donor_id,
          name: d.name,
          blood_type: searchType === 'blood' ? d.blood_type : d.organs,
          distance_km: d.distance_km,
          match_score: d.match_score,
          phone: d.phone,
          urgency_recommendation: d.urgency_recommendation,
          latitude: d.latitude,
          longitude: d.longitude
        }));
        setDonors(formatted);
      } else {
        setDonors([]);
      }
    } catch (err) {
      console.warn("Matching backend service offline.");
      setDonors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMapCenter([lat, lng]);

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.address) {
              const cityVal = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.county || data.address.state || '';
              setCity(cityVal);
              handleSearch(undefined, lat, lng, cityVal);
            } else {
              handleSearch(undefined, lat, lng, '');
            }
          } else {
            handleSearch(undefined, lat, lng, '');
          }
        } catch (e) {
          console.warn("Reverse geocoding failed:", e);
          handleSearch(undefined, lat, lng, '');
        }
      }, (err) => {
        console.warn("Geolocation permission denied:", err);
        alert("Could not detect location. Please check your browser location permissions.");
        setLoading(false);
      });
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const mapMarkers = donors
    .filter(d => d.latitude !== null && d.longitude !== null)
    .map(d => ({
      lat: d.latitude!,
      lng: d.longitude!,
      label: `<b>${d.name}</b> (${d.blood_type})<br/>${d.distance_km} km away`
    }));

  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#FDFBF7] py-20">
        <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
        <span className="text-sm text-stone-600 mt-4 font-semibold">Verifying search access credentials...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 flex-1 flex flex-col gap-8 w-full bg-[#FDFBF7]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-stone-900 flex items-center gap-2">
            <Heart className="w-8 h-8 text-red-600 fill-red-600/10" /> Locator Search Center
          </h1>
          <p className="text-stone-600 mt-2">Find verified blood donors or pledged organ matches in your vicinity.</p>
        </div>
        <button 
          onClick={handleDetectLocation}
          className="text-xs bg-red-55 border border-red-200 hover:bg-red-100/50 text-red-700 px-3.5 py-2 rounded-xl transition-all font-semibold flex items-center gap-1.5 self-start shadow-sm"
        >
          <Compass className="w-4 h-4" /> Detect My Location
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-stone-200 pb-1">
        <button
          onClick={() => {
            setSearchType('blood');
            setSearched(false);
            setDonors([]);
          }}
          className={`pb-2.5 px-4 text-sm font-bold border-b-2 transition-all ${
            searchType === 'blood' 
              ? 'border-red-650 text-red-700 font-extrabold' 
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          🩸 Locate Blood Donors
        </button>
        <button
          onClick={() => {
            setSearchType('organ');
            setSearched(false);
            setDonors([]);
          }}
          className={`pb-2.5 px-4 text-sm font-bold border-b-2 transition-all ${
            searchType === 'organ' 
              ? 'border-red-650 text-red-700 font-extrabold' 
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          🫁 Locate Organ Pledges
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={(e) => handleSearch(e)} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white border border-stone-200/60 p-6 rounded-2xl shadow-sm shadow-stone-100">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            {searchType === 'blood' ? 'Blood Group Required' : 'Pledged Organ Required'}
          </label>
          {searchType === 'blood' ? (
            <select 
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value)}
              className="bg-stone-50 border border-stone-200 text-stone-900 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors"
            >
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          ) : (
            <select 
              value={organType}
              onChange={(e) => setOrganType(e.target.value)}
              className="bg-stone-50 border border-stone-200 text-stone-900 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors"
            >
              {organOptions.map(org => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">City/Location</label>
          <input 
            type="text" 
            placeholder="e.g. Bareilly"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="bg-stone-50 border border-stone-200 text-stone-900 rounded-xl px-4 py-3 placeholder-stone-400 focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>

        <div className="flex flex-col justify-end">
          <button 
            type="submit"
            className="w-full bg-red-650 hover:bg-red-700 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-sm shadow-red-600/10"
          >
            <Search className="w-5 h-5" /> Search & Match
          </button>
        </div>
      </form>

      {/* Map display */}
      <div className="w-full space-y-2">
        <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Live Coverage Map</label>
        <Map 
          center={mapCenter}
          zoom={12}
          markers={mapMarkers}
          interactive={false}
        />
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center py-16">
          <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
          <span className="text-sm text-stone-600 mt-4 font-medium">Matching compatible profiles...</span>
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-stone-900">Recommended Matches ({donors.length})</h2>
            <span className="text-xs px-2.5 py-1 rounded bg-red-50 border border-red-200 text-red-700 font-semibold uppercase">Real-Time Search</span>
          </div>

          {donors.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-stone-200 rounded-2xl bg-white shadow-sm shadow-stone-50">
              <ShieldAlert className="w-12 h-12 text-stone-300 mx-auto" />
              <p className="text-stone-500 mt-4 font-medium">
                No matches found for {searchType === 'blood' ? `blood type ${bloodType}` : `${organType} pledge`} in this area.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {donors.map((donor) => (
                <div 
                  key={donor.donor_id}
                  className="relative group p-6 rounded-2xl bg-white border border-stone-200/60 hover:border-red-300 shadow-sm shadow-stone-50/50 hover:shadow-md hover:shadow-stone-100 transition-all duration-300 flex flex-col justify-between"
                >
                  {donor.match_score >= 0.9 && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 bg-red-50 border border-red-200 text-2xs font-bold px-2 py-0.5 rounded-full text-red-750">
                      <Star className="w-3 h-3 fill-red-650 text-red-650" /> Best Match
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center font-extrabold text-red-700 text-xs px-2 shadow-sm text-center">
                        {donor.blood_type}
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-900 text-lg">{donor.name}</h3>
                        <p className="text-xs text-stone-600 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-red-600" /> {donor.distance_km > 0 ? `${donor.distance_km} km away` : 'Located in Search Area'}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-150 flex items-center gap-2.5">
                      <Award className="w-4 h-4 text-rose-650 flex-shrink-0" />
                      <p className="text-xs text-stone-600">{donor.urgency_recommendation}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4">
                    <div className="text-xs text-stone-500">
                      Compatibility Score: <span className="font-extrabold text-stone-900">{(donor.match_score * 100).toFixed(0)}%</span>
                    </div>
                    {donor.phone ? (
                      <a 
                        href={`tel:${donor.phone}`}
                        className="px-4 py-2 bg-stone-50 hover:bg-red-600 hover:text-white border border-stone-200 hover:border-red-600 rounded-xl text-xs font-semibold text-stone-700 transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call Donor
                      </a>
                    ) : (
                      <span className="text-xs text-stone-550 italic">No contact available</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
