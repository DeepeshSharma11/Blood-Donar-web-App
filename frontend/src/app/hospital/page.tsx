"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Building2, PlusCircle, HeartPulse, Sparkles, ListFilter, Bell, X } from 'lucide-react';

interface BloodRequest {
  id: string;
  hospital_name: string;
  blood_type: string;
  units: number;
  urgency: 'Emergency' | 'High' | 'Medium' | 'Low';
  status: 'Searching' | 'Matched' | 'Completed';
  created_at: string;
}

export default function HospitalPortal() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; urgency: string } | null>(null);

  const [form, setForm] = useState({
    hospitalName: '',
    bloodType: 'O+',
    units: 1,
    urgency: 'High' as BloodRequest['urgency']
  });

  const wsRef = useRef<WebSocket | null>(null);

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

        if (prof.role !== 'hospital' && prof.role !== 'admin') {
          router.push('/donor');
          return;
        }

        setProfile(prof);
        if (prof.role === 'hospital') {
          setForm(f => ({ ...f, hospitalName: prof.name }));
        }

        await fetchData();
        setAuthLoading(false);
        setupWebSocket();
      } catch (err) {
        router.push('/login');
      }
    };
    checkAuth();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [router]);

  const setupWebSocket = () => {
    try {
      const ws = new WebSocket('ws://localhost:8000/ws');
      
      ws.onmessage = (event) => {
        try {
          const messageData = JSON.parse(event.data);
          if (messageData.type === 'BLOOD_REQUEST_CREATED') {
            fetchData();
            
            if (messageData.urgency === 'Emergency' || messageData.urgency === 'High') {
              setNotification({
                message: `⚠️ ${messageData.hospital_name} issued an urgent request for ${messageData.units} units of ${messageData.blood_type}!`,
                urgency: messageData.urgency
              });
              setTimeout(() => setNotification(null), 6000);
            }
          }
        } catch (e) {
          console.error("Error parsing WebSocket message:", e);
        }
      };

      ws.onclose = () => {
        setTimeout(() => setupWebSocket(), 3000);
      };

      wsRef.current = ws;
    } catch (err) {
      console.warn("WebSocket server offline, real-time broadcasts disabled.");
    }
  };

  const fetchData = async () => {
    try {
      const { data: reqs, error: reqsErr } = await supabase
        .from('blood_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (reqsErr) throw reqsErr;
      setRequests(reqs || []);

      const { data: donors, error: donorsErr } = await supabase
        .from('donors')
        .select('blood_group')
        .eq('is_available', true);

      if (donorsErr) throw donorsErr;

      const bloodGroups = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];
      const counts = donors?.reduce((acc, curr) => {
        acc[curr.blood_group] = (acc[curr.blood_group] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const processedInventory = bloodGroups.map(bg => {
        const units = counts[bg] || 0;
        let status = 'Stable';
        let color = 'text-emerald-700 bg-emerald-50 border border-emerald-250';

        if (units === 0) {
          status = 'Critical';
          color = 'text-red-700 bg-red-50 border border-red-200';
        } else if (units < 3) {
          status = 'Warning';
          color = 'text-amber-700 bg-amber-50 border border-amber-250';
        }

        return {
          group: bg,
          status,
          units,
          color
        };
      });

      setInventory(processedInventory);

    } catch (err) {
      console.error('Error loading clinical dashboard records:', err);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      const { error } = await supabase
        .from('blood_requests')
        .insert([{
          hospital_name: form.hospitalName,
          blood_type: form.bloodType,
          units: form.units,
          urgency: form.urgency,
          status: 'Searching'
        }]);

      if (error) throw error;

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'BLOOD_REQUEST_CREATED',
          hospital_name: form.hospitalName,
          blood_type: form.bloodType,
          units: form.units,
          urgency: form.urgency
        }));
      }

      setForm(f => ({ ...f, units: 1, urgency: 'High' }));
      await fetchData();
    } catch (err) {
      console.error('Error creating blood request:', err);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#FDFBF7] py-20">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-sm text-stone-600 mt-4 font-semibold">Verifying clinical credentials...</span>
      </div>
    );
  }

  return (
    <div className="relative max-w-7xl mx-auto px-6 py-12 flex-1 flex flex-col gap-8 w-full bg-[#FDFBF7]">
      {/* Toast Notification Alert */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-xl bg-red-50 border border-red-200 text-stone-900 shadow-xl shadow-stone-200/50 flex items-start gap-3 animate-bounce">
          <Bell className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-xs font-bold uppercase text-red-700 tracking-wider">Emergency Requirement Alert</h4>
            <p className="text-xs text-stone-700 mt-1 leading-relaxed">{notification.message}</p>
          </div>
          <button onClick={() => setNotification(null)} className="text-stone-400 hover:text-stone-650 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-stone-900 flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" /> Hospital Center
          </h1>
          <p className="text-stone-600 mt-2">Manage blood inventory alerts, issue urgent requirements, and check compatible donor matches.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider">
            Role: Clinical Rep
          </div>
          <button 
            onClick={handleLogout}
            className="text-xs border border-stone-200 hover:border-red-300 hover:text-red-600 px-3 py-1.5 rounded-xl transition-all font-semibold bg-white shadow-sm"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Inventory Alert Grid & Form */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Inventory status widget */}
          <div className="bg-white border border-stone-200/60 p-6 rounded-2xl shadow-sm shadow-stone-100">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-red-600" /> Live Blood Inventory Status
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {inventory.map(item => (
                <div key={item.group} className="p-3 bg-stone-50 rounded-xl border border-stone-150 flex justify-between items-center">
                  <div>
                    <div className="font-extrabold text-stone-900">{item.group}</div>
                    <div className={`text-[10px] font-semibold mt-0.5 px-1.5 py-0.5 rounded-full inline-block ${item.color}`}>
                      {item.status}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-stone-900">{item.units}</span>
                    <span className="text-[10px] text-stone-500 block">donors</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Request Form */}
          <form onSubmit={handleCreateRequest} className="bg-white border border-stone-200/60 p-6 rounded-2xl shadow-sm shadow-stone-100 space-y-4">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-blue-600" /> Request Blood Units
            </h3>
            
            <div className="flex flex-col gap-1">
              <label className="text-2xs font-semibold text-stone-500 uppercase">Hospital Name</label>
              <input 
                required
                type="text" 
                placeholder="e.g. City General Hospital"
                value={form.hospitalName}
                onChange={(e) => setForm({...form, hospitalName: e.target.value})}
                disabled={profile?.role === 'hospital'} 
                className="bg-stone-50 border border-stone-200 text-stone-900 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-2xs font-semibold text-stone-500 uppercase">Blood Group</label>
                <select 
                  value={form.bloodType}
                  onChange={(e) => setForm({...form, bloodType: e.target.value})}
                  className="bg-stone-50 border border-stone-200 text-stone-900 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-2xs font-semibold text-stone-500 uppercase">Units Needed</label>
                <input 
                  type="number" 
                  min="1"
                  value={form.units}
                  onChange={(e) => setForm({...form, units: parseInt(e.target.value) || 1})}
                  className="bg-stone-50 border border-stone-200 text-stone-900 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-2xs font-semibold text-stone-500 uppercase">Urgency Level</label>
              <select 
                value={form.urgency}
                onChange={(e) => setForm({...form, urgency: e.target.value as BloodRequest['urgency']})}
                className="bg-stone-50 border border-stone-200 text-stone-900 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500"
              >
                <option value="Emergency">🚨 Emergency (Immediate)</option>
                <option value="High">⚠️ High Priority</option>
                <option value="Medium">Medium</option>
                <option value="Low">Routine (Low)</option>
              </select>
            </div>

            <button 
              type="submit"
              disabled={submitLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg py-3 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01] disabled:opacity-50 shadow-sm"
            >
              {submitLoading ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>

        </div>

        {/* Right Side: Active Requests Ledger */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-stone-200/60 p-6 rounded-2xl shadow-sm shadow-stone-100 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <ListFilter className="w-5 h-5 text-stone-500" /> Active Blood Request Ledger
              </h3>
              <span className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold">Live Connection</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="pb-3">ID</th>
                    <th className="pb-3">Hospital</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Quantity</th>
                    <th className="pb-3">Urgency</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {requests.map(req => {
                    const urgencyColors = {
                      Emergency: 'text-red-700 bg-red-50 border border-red-200',
                      High: 'text-orange-700 bg-orange-50 border border-orange-200',
                      Medium: 'text-blue-700 bg-blue-50 border border-blue-200',
                      Low: 'text-stone-700 bg-stone-100 border border-stone-150'
                    };

                    const statusColors = {
                      Searching: 'text-amber-700 border border-amber-200 bg-amber-50',
                      Matched: 'text-emerald-700 border border-emerald-200 bg-emerald-50',
                      Completed: 'text-stone-500 border border-stone-200 bg-stone-50'
                    };

                    return (
                      <tr key={req.id} className="group hover:bg-stone-50/40 transition-colors">
                        <td className="py-4 font-semibold text-stone-500">#{req.id}</td>
                        <td className="py-4 font-bold text-stone-900">{req.hospital_name}</td>
                        <td className="py-4">
                          <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 font-bold text-stone-800">
                            {req.blood_type}
                          </span>
                        </td>
                        <td className="py-4 text-stone-900">{req.units} units</td>
                        <td className="py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-2xs font-extrabold uppercase ${urgencyColors[req.urgency]}`}>
                            {req.urgency}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded text-2xs font-semibold flex items-center gap-1 w-max ${statusColors[req.status]}`}>
                            {req.status === 'Searching' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />}
                            {req.status === 'Matched' && <Sparkles className="w-3 h-3 text-emerald-600 inline-block" />}
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {requests.length === 0 && (
              <div className="text-center py-12 text-stone-500 text-sm">
                No active blood requests in the ledger.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
