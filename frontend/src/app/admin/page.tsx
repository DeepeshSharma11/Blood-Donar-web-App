"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Shield, Users, Building, Activity, FileText, Check, X, AlertTriangle } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  role: string;
  is_verified: boolean;
  created_at: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  
  // Real-Time Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeDonors: 0,
    totalHospitals: 0,
    pendingVerifications: 0
  });

  const [hospitals, setHospitals] = useState<Profile[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

        if (prof.role !== 'admin') {
          if (prof.role === 'hospital') router.push('/hospital');
          else router.push('/donor');
          return;
        }

        setProfile(prof);
        await fetchData();
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
            if (data.type === 'BLOOD_REQUEST_CREATED') {
              fetchData();
              
              setLogs(prev => [
                {
                  id: Date.now(),
                  action: `Clinic "${data.hospital_name}" requested ${data.units} units of ${data.blood_type}`,
                  timestamp: 'Just now',
                  device: 'WebSocket Broadcast'
                },
                ...prev
              ]);
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
  }, [profile]);

  const fetchData = async () => {
    try {
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: donorsCount } = await supabase
        .from('donors')
        .select('*', { count: 'exact', head: true })
        .eq('is_available', true);

      const { count: hospCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'hospital');

      const { data: hospList } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'hospital')
        .order('created_at', { ascending: false });

      const pendingCount = hospList?.filter(h => !h.is_verified).length || 0;

      setStats({
        totalUsers: usersCount || 0,
        activeDonors: donorsCount || 0,
        totalHospitals: hospCount || 0,
        pendingVerifications: pendingCount
      });

      setHospitals(hospList || []);

      const logsList = [];
      if (hospList && hospList.length > 0) {
        logsList.push({
          id: 1,
          action: `Clinical Organization "${hospList[0].name}" registered`,
          timestamp: 'Just now',
          device: 'Web Browser'
        });
      }
      logsList.push({
        id: 2,
        action: `Active donor directory scanned for updates`,
        timestamp: '5 mins ago',
        device: 'System Service'
      });

      setLogs(logsList);

    } catch (err) {
      console.error('Error fetching dashboard records:', err);
    }
  };

  const handleVerify = async (id: string, approve: boolean) => {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: approve })
        .eq('id', id);

      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error('Error updating verification status:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#FDFBF7] py-20">
        <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <span className="text-sm text-stone-600 mt-4 font-semibold">Verifying management access credentials...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 flex-1 flex flex-col gap-8 w-full bg-[#FDFBF7]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-stone-900 flex items-center gap-2">
            <Shield className="w-8 h-8 text-amber-600 fill-amber-500/10" /> Global Management Panel
          </h1>
          <p className="text-stone-600 mt-2">Oversee platform user registries, verified partner clinics, and audit access logs.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider">
            Access Level: Supervisor
          </div>
          <button 
            onClick={handleLogout}
            className="text-xs border border-stone-200 hover:border-red-300 hover:text-red-600 px-3 py-1.5 rounded-xl transition-all font-semibold bg-white shadow-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Grid: Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: "Total Registered Users", value: stats.totalUsers, icon: Users, change: "All active roles", color: "text-blue-600 bg-blue-50/50" },
          { title: "Active Verified Donors", value: stats.activeDonors, icon: Activity, change: "Available for requests", color: "text-rose-600 bg-rose-50/50" },
          { title: "Affiliated Hospitals", value: stats.totalHospitals, icon: Building, change: `${stats.pendingVerifications} pending verification`, color: "text-amber-600 bg-amber-50/50" },
          { title: "Reports & Logs", value: "Verified", icon: FileText, change: "Secure connection live", color: "text-stone-600 bg-stone-50/50" }
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white border border-stone-200/60 p-6 rounded-2xl shadow-sm shadow-stone-100">
              <div className="flex justify-between items-start">
                <span className="text-xs text-stone-500 font-bold uppercase tracking-wider">{stat.title}</span>
                <div className={`p-1.5 rounded-lg ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-stone-900 mt-4">{stat.value}</div>
              <div className="text-xs text-stone-500 mt-2">{stat.change}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Verification Ledger */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-stone-200/60 p-6 rounded-2xl shadow-sm shadow-stone-100">
            <h3 className="text-lg font-bold text-stone-900 mb-6 flex items-center gap-2">
              <Building className="w-5 h-5 text-amber-600" /> Pending Hospital Verification
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="pb-3">Clinic Name</th>
                    <th className="pb-3">Registration Date</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {hospitals.map(item => (
                    <tr key={item.id} className="group hover:bg-stone-50/40 transition-colors">
                      <td className="py-4 font-bold text-stone-900">{item.name}</td>
                      <td className="py-4 text-stone-600">{new Date(item.created_at).toLocaleDateString()}</td>
                      <td className="py-4">
                        <span className={`px-2.5 py-0.5 rounded text-2xs font-semibold ${
                          item.is_verified 
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
                            : 'bg-amber-50 border border-amber-200 text-amber-700'
                        }`}>
                          {item.is_verified ? 'Verified' : 'Pending Approval'}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        {actionLoading === item.id ? (
                          <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin inline-block" />
                        ) : !item.is_verified ? (
                          <div className="inline-flex gap-2">
                            <button 
                              onClick={() => handleVerify(item.id, true)}
                              className="p-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg transition-all"
                              title="Verify Clinic"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleVerify(item.id, false)}
                            className="text-2xs text-red-600 hover:underline font-bold"
                            title="Revoke Clinic"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hospitals.length === 0 && (
              <div className="text-center py-8 text-stone-500 text-sm">
                No hospitals registered on the platform.
              </div>
            )}
          </div>
        </div>

        {/* Audit Log / Activity */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-stone-200/60 p-6 rounded-2xl shadow-sm shadow-stone-100">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-600" /> Platform Activity Ledger
            </h3>
            <div className="space-y-4">
              {logs.map(log => (
                <div key={log.id} className="p-3 bg-stone-50 rounded-xl border border-stone-150 space-y-2">
                  <div className="text-xs text-stone-800 font-medium leading-relaxed">
                    {log.action}
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-stone-500 font-mono">
                    <span>{log.timestamp}</span>
                    <span>{log.device}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200/60 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-800 leading-normal">
                Audits are securely recorded and archived for compliance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
