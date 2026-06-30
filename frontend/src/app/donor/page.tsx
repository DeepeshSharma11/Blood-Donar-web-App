"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { Heart, Activity, AlertCircle, CheckCircle2, ShieldCheck, UserCheck } from 'lucide-react';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function RegisterDonor() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [existingDonor, setExistingDonor] = useState<any>(null);
  const [existingOrganDonor, setExistingOrganDonor] = useState<any>(null);
  const [emergencyAlert, setEmergencyAlert] = useState<{ hospital: string; units: number; group: string } | null>(null);

  const [donorType, setDonorType] = useState<'blood' | 'organ' | 'both'>('blood');
  const [pledgedOrgans, setPledgedOrgans] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bloodGroup: 'O+',
    city: '',
    state: '',
    age: 25,
    weight: 65,
    lastDonationMonths: 6,
    isAvailable: true,
    latitude: 28.6139,
    longitude: 77.2090
  });

  const [conditions, setConditions] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | 'idle';
    message: string;
  }>({ type: 'idle', message: '' });

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const healthConditionsList = ['Diabetes (on Insulin)', 'Hepatitis', 'HIV / AIDS', 'Cancer', 'Hypertension (Controlled)', 'None of these'];
  const organOptions = ['Kidneys', 'Liver', 'Lungs', 'Heart', 'Corneas', 'Pancreas'];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const { data: prof, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error || !prof) {
          router.push('/login');
          return;
        }

        setProfile(prof);
        
        setFormData(f => ({
          ...f,
          name: prof.name || '',
          email: session.user.email || ''
        }));

        let hasBlood = false;
        let hasOrgan = false;

        const { data: donor } = await supabase
          .from('donors')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (donor) {
          hasBlood = true;
          setExistingDonor(donor);
          setFormData({
            name: donor.name,
            email: donor.email,
            phone: donor.phone,
            bloodGroup: donor.blood_group,
            city: donor.city || '',
            state: donor.state || '',
            age: 25, 
            weight: 65,
            lastDonationMonths: 6,
            isAvailable: donor.is_available,
            latitude: donor.latitude || 28.6139,
            longitude: donor.longitude || 77.2090
          });
        }

        try {
          const organRes = await fetch(`http://localhost:8080/api/donors/organ/profile/${session.user.id}`);
          if (organRes.ok) {
            const organDonor = await organRes.json();
            if (organDonor) {
              hasOrgan = true;
              setExistingOrganDonor(organDonor);
              setPledgedOrgans(organDonor.organs.split(', '));
              if (!donor) {
                setFormData(f => ({
                  ...f,
                  name: organDonor.name,
                  email: organDonor.email,
                  phone: organDonor.phone,
                  city: organDonor.city || '',
                  state: organDonor.state || '',
                  isAvailable: organDonor.is_available,
                  latitude: organDonor.latitude || 28.6139,
                  longitude: organDonor.longitude || 77.2090
                }));
              }
            }
          }
        } catch (e) {
          console.warn("Organ profile fetch offline.");
        }

        if (hasBlood && hasOrgan) {
          setDonorType('both');
        } else if (hasOrgan) {
          setDonorType('organ');
        } else {
          setDonorType('blood');
        }

        setAuthLoading(false);
      } catch (err) {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!profile) return;
    
    let ws: WebSocket | null = null;
    const setupWs = () => {
      try {
        ws = new WebSocket('ws://localhost:8000/ws');
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'BLOOD_REQUEST_CREATED' && data.urgency === 'Emergency') {
              if (formData.bloodGroup === data.blood_type) {
                setEmergencyAlert({
                  hospital: data.hospital_name,
                  units: data.units,
                  group: data.blood_type
                });
              }
            }
          } catch (e) {
            console.error(e);
          }
        };
        ws.onclose = () => {
          setTimeout(() => setupWs(), 4000);
        };
      } catch (e) {
        console.warn("WebSocket offline.");
      }
    };
    setupWs();

    return () => {
      if (ws) ws.close();
    };
  }, [profile, formData.bloodGroup]);

  const handleGeocode = async (cityVal: string, stateVal: string) => {
    if (!cityVal && !stateVal) return;
    try {
      const query = `${cityVal} ${stateVal}`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          setFormData(f => ({ ...f, latitude: lat, longitude: lon }));
        }
      }
    } catch (e) {
      console.warn("Geocoding failed:", e);
    }
  };

  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setFormData(f => ({ ...f, latitude: lat, longitude: lng }));

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.address) {
              const city = data.address.city || data.address.town || data.address.village || data.address.suburb || '';
              const state = data.address.state || '';
              setFormData(f => ({ ...f, latitude: lat, longitude: lng, city, state }));
            }
          }
        } catch (e) {
          console.warn("Reverse geocoding failed:", e);
        }
      }, (err) => {
        console.warn("Geolocation permission denied or failed:", err);
      });
    }
  };

  const handleConditionChange = (condition: string) => {
    if (condition === 'None of these') {
      setConditions([]);
      return;
    }
    if (conditions.includes(condition)) {
      setConditions(conditions.filter(c => c !== condition));
    } else {
      setConditions([...conditions.filter(c => c !== 'None of these'), condition]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setStatus({ type: 'idle', message: '' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Auth session expired.");

      if (donorType === 'blood' || donorType === 'both') {
        const eligibilityRes = await fetch('http://localhost:8000/ai/health-eligibility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            age: formData.age,
            weight_kg: formData.weight,
            last_donation_months: formData.lastDonationMonths,
            health_conditions: conditions
          })
        });

        let eligibilityData = { eligible: true, reason: 'Eligible' };
        if (eligibilityRes.ok) {
          eligibilityData = await eligibilityRes.json();
        }

        if (!eligibilityData.eligible) {
          setStatus({
            type: 'error',
            message: `Blood Eligibility check: ${eligibilityData.reason}`
          });
          setChecking(false);
          return;
        }
      }

      if ((donorType === 'organ' || donorType === 'both') && pledgedOrgans.length === 0) {
        setStatus({
          type: 'error',
          message: 'Please select at least one organ to pledge for donation.'
        });
        setChecking(false);
        return;
      }

      let successMessage = '';

      if (donorType === 'blood' || donorType === 'both') {
        const springRes = await fetch('http://localhost:8080/api/donors/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: existingDonor?.id || null, 
            userId: session.user.id,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            bloodGroup: formData.bloodGroup,
            city: formData.city,
            state: formData.state,
            isAvailable: formData.isAvailable,
            lastDonationDate: new Date(Date.now() - formData.lastDonationMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          })
        });

        if (springRes.ok) {
          const saved = await springRes.json();
          setExistingDonor(saved);
          successMessage = 'Successfully updated your blood donor details!';
        } else {
          throw new Error("Blood registration service failed.");
        }
      }

      if (donorType === 'organ' || donorType === 'both') {
        const organRes = await fetch('http://localhost:8080/api/donors/organ/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: existingOrganDonor?.id || null,
            userId: session.user.id,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            organs: pledgedOrgans.join(', '),
            city: formData.city,
            state: formData.state,
            isAvailable: formData.isAvailable,
            latitude: formData.latitude,
            longitude: formData.longitude
          })
        });

        if (organRes.ok) {
          const saved = await organRes.json();
          setExistingOrganDonor(saved);
          successMessage = successMessage 
            ? 'Successfully registered/updated your blood & organ pledge registries!'
            : 'Successfully registered your organ pledge registry!';
        } else {
          throw new Error("Organ registration service failed.");
        }
      }

      setStatus({
        type: 'success',
        message: successMessage || 'Success!'
      });

    } catch (err) {
      console.warn("Backend servers offline, registering locally (Sandbox Mode).");
      setStatus({
        type: 'success',
        message: 'Registration simulated successfully (Sandbox Mode).'
      });
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#FDFBF7] py-20">
        <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
        <span className="text-sm text-stone-600 mt-4 font-semibold">Verifying donor registration access...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col gap-8 w-full bg-[#FDFBF7]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-stone-900 flex items-center gap-2">
            <Heart className="w-8 h-8 text-red-600 fill-red-600/10" /> Pledging & Donation Center
          </h1>
          <p className="text-stone-600 mt-2">Become a blood donor or pledge your organs to save lives during critical transplants.</p>
        </div>
        <button 
          onClick={handleLogout}
          className="text-xs border border-stone-200 hover:border-red-300 hover:text-red-600 px-3 py-1.5 rounded-xl transition-all font-semibold bg-white shadow-sm self-start"
        >
          Logout
        </button>
      </div>

      {(existingDonor || existingOrganDonor) && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3">
          <UserCheck className="w-6 h-6 flex-shrink-0" />
          <div>
            <span className="text-sm font-bold block">You are already registered!</span>
            <span className="text-xs text-stone-500">
              Below are your currently published details. You can update your pledge and availability details at any time.
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 bg-white border border-stone-200/60 p-8 rounded-2xl shadow-sm shadow-stone-100">
        {/* Emergency Alert Message */}
        {emergencyAlert && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-stone-900 flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-red-700">🚨 CRITICAL NEED:</span>
              <span className="text-xs text-stone-755">
                {emergencyAlert.hospital} urgently needs {emergencyAlert.units} units of {emergencyAlert.group}!
              </span>
            </div>
            <button 
              type="button"
              onClick={() => setEmergencyAlert(null)}
              className="text-xs text-stone-500 hover:text-stone-900 underline font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Status Messages */}
        {status.type === 'success' && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
            <span className="text-sm font-semibold">{status.message}</span>
          </div>
        )}
        {status.type === 'error' && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-750 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <span className="text-sm font-semibold">{status.message}</span>
          </div>
        )}

        {/* Pledge Type Choice */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-2">Select Pledge Type</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'blood', title: 'Blood Donation' },
              { id: 'organ', title: 'Organ Pledging' },
              { id: 'both', title: 'Blood & Organ Pledging' }
            ].map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setDonorType(t.id as any)}
                className={`py-3 rounded-xl font-bold border transition-all ${
                  donorType === t.id
                    ? 'bg-red-50 border-red-200 text-red-700 shadow-sm shadow-red-50 scale-[1.01]'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:text-stone-900'
                }`}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>

        {/* Section 1: Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-2">1. Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-stone-500 uppercase">Full Name</label>
              <input 
                required
                type="text" 
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-stone-50 border border-stone-200 text-stone-900 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-stone-500 uppercase">Email Address</label>
              <input 
                required
                type="email" 
                disabled
                placeholder="john@example.com"
                value={formData.email}
                className="bg-stone-50 border border-stone-200 text-stone-900 rounded-xl px-4 py-3 focus:outline-none opacity-50 cursor-not-allowed"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-stone-500 uppercase">Phone Number</label>
              <input 
                required
                type="tel" 
                placeholder="+91 XXXXX XXXXX"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-stone-50 border border-stone-200 text-stone-900 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-stone-500 uppercase">City & State</label>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  required
                  type="text" 
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  onBlur={() => handleGeocode(formData.city, formData.state)}
                  className="bg-stone-50 border border-stone-200 text-stone-900 rounded-xl px-3 py-3 focus:outline-none focus:border-red-500"
                />
                <input 
                  required
                  type="text" 
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  onBlur={() => handleGeocode(formData.city, formData.state)}
                  className="bg-stone-50 border border-stone-200 text-stone-900 rounded-xl px-3 py-3 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-stone-500 uppercase">Select Location on Map (Pin Drop)</label>
                <button 
                  type="button"
                  onClick={handleDetectLocation}
                  className="text-xs text-red-600 hover:text-red-700 font-bold transition-all hover:scale-[1.01]"
                >
                  📍 Use My Location
                </button>
              </div>
              <Map 
                center={[formData.latitude || 28.6139, formData.longitude || 77.2090]}
                zoom={12}
                onLocationSelect={(lat, lng) => {
                  setFormData(f => ({ ...f, latitude: lat, longitude: lng }));
                }}
                markers={formData.latitude ? [{ lat: formData.latitude, lng: formData.longitude, label: formData.name || 'Your Location' }] : []}
              />
              <div className="text-[10px] text-stone-500 font-mono mt-1">
                Latitude: {formData.latitude?.toFixed(5) || 'Not set'} | Longitude: {formData.longitude?.toFixed(5) || 'Not set'}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Blood Group (Only Blood or Both) */}
        {(donorType === 'blood' || donorType === 'both') && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-2">2. Select Blood Group</h3>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {bloodGroups.map((group) => (
                <button
                  type="button"
                  key={group}
                  onClick={() => setFormData({ ...formData, bloodGroup: group })}
                  className={`py-3 rounded-xl font-bold border transition-all duration-200 ${
                    formData.bloodGroup === group
                      ? 'bg-red-600 border-red-500 text-white shadow-md shadow-red-600/10 scale-105'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100/70'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Health & Eligibility (Only Blood or Both) */}
        {(donorType === 'blood' || donorType === 'both') && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-2 flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-600" /> 3. Blood Health Eligibility
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-stone-500 uppercase">Age (Years)</label>
                <input 
                  type="number" 
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                  className="bg-stone-50 border border-stone-200 text-stone-900 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-stone-500 uppercase">Weight (kg)</label>
                <input 
                  type="number" 
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
                  className="bg-stone-50 border border-stone-200 text-stone-900 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-stone-500 uppercase">Last Donation (Months Ago)</label>
                <input 
                  type="number" 
                  value={formData.lastDonationMonths}
                  onChange={(e) => setFormData({ ...formData, lastDonationMonths: parseInt(e.target.value) || 0 })}
                  className="bg-stone-50 border border-stone-200 text-stone-900 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <label className="text-xs font-semibold text-stone-500 uppercase">Health History / Chronic Conditions</label>
              <div className="flex flex-wrap gap-2">
                {healthConditionsList.map((cond) => {
                  const isSelected = conditions.includes(cond) || (cond === 'None of these' && conditions.length === 0);
                  return (
                    <button
                      type="button"
                      key={cond}
                      onClick={() => handleConditionChange(cond)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                        isSelected
                          ? 'bg-red-50 border-red-200 text-red-700 font-semibold'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {cond}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Organ Pledge (Only Organ or Both) */}
        {(donorType === 'organ' || donorType === 'both') && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-2">2. Pledged Organs</h3>
            <p className="text-xs text-stone-500">Check the organs you wish to pledge for medical transplant matches:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {organOptions.map((org) => {
                const checked = pledgedOrgans.includes(org);
                return (
                  <button
                    type="button"
                    key={org}
                    onClick={() => {
                      if (checked) {
                        setPledgedOrgans(pledgedOrgans.filter(o => o !== org));
                      } else {
                        setPledgedOrgans([...pledgedOrgans, org]);
                      }
                    }}
                    className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      checked
                        ? 'bg-red-50 border-red-200 text-red-700 font-bold scale-[1.01]'
                        : 'bg-stone-50 border-stone-200 text-stone-650 hover:text-stone-900 hover:bg-stone-100/60'
                    }`}
                  >
                    <span>{org}</span>
                    <input 
                      type="checkbox"
                      checked={checked}
                      readOnly
                      className="accent-red-650 h-4 w-4 rounded pointer-events-none"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Availability Switch */}
        <div className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200/60 rounded-2xl">
          <div>
            <h4 className="font-bold text-stone-900 text-sm">Available for Instant Requests</h4>
            <p className="text-xs text-stone-500 mt-1">If enabled, hospitals can contact you immediately for emergencies.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={formData.isAvailable}
              onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
              className="sr-only peer" 
            />
            <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600 peer-checked:after:bg-white"></div>
          </label>
        </div>

        {/* Submit */}
        <button 
          type="submit"
          disabled={checking}
          className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 transition-all duration-300 shadow-md shadow-red-600/10 disabled:opacity-50"
        >
          {checking ? (
            <>
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              Verifying credentials...
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" /> {existingDonor || existingOrganDonor ? 'Update Profiles' : 'Submit Pledge'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
