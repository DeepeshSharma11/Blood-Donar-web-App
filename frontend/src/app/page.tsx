"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, UserPlus, Building2, Shield, Heart, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [stats, setStats] = useState({
    totalDonors: 0,
    activeRequests: 0,
    hospitals: 0,
    livesSaved: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: bDonors } = await supabase
          .from('donors')
          .select('*', { count: 'exact', head: true });
        
        const { count: oDonors } = await supabase
          .from('organ_donors')
          .select('*', { count: 'exact', head: true });

        const { count: bReqs } = await supabase
          .from('blood_requests')
          .select('*', { count: 'exact', head: true })
          .in('status', ['Searching', 'Matched']);
        
        const { count: oReqs } = await supabase
          .from('organ_requests')
          .select('*', { count: 'exact', head: true })
          .in('status', ['Searching', 'Matched']);

        const { count: hosps } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'hospital')
          .eq('is_verified', true);

        const { count: bSaved } = await supabase
          .from('blood_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Completed');
        
        const { count: oSaved } = await supabase
          .from('organ_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Completed');

        setStats({
          totalDonors: (bDonors || 0) + (oDonors || 0),
          activeRequests: (bReqs || 0) + (oReqs || 0),
          hospitals: hosps || 0,
          livesSaved: (bSaved || 0) + (oSaved || 0)
        });
      } catch (e) {
        console.warn("Failed to fetch live homepage stats:", e);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    {
      title: "Locate Donors",
      description: "Search for active blood and organ donors in your area. Use our smart locator to find the closest matches in seconds.",
      href: "/locate",
      icon: Search,
      color: "from-red-50/40 to-stone-50/20",
      borderColor: "hover:border-red-500/20",
      iconColor: "text-red-655",
      buttonText: "Find Donors"
    },
    {
      title: "Register as Donor",
      description: "Join our lifesaver network. Pledge blood, organs, or both to help patients in critical need.",
      href: "/donor",
      icon: UserPlus,
      color: "from-emerald-50/40 to-stone-50/20",
      borderColor: "hover:border-emerald-500/20",
      iconColor: "text-emerald-600",
      buttonText: "Register Now"
    },
    {
      title: "Hospital Center",
      description: "For medical institutions. Request blood units, register organ requirements, and monitor active matches.",
      href: "/hospital",
      icon: Building2,
      color: "from-blue-50/40 to-stone-50/20",
      borderColor: "hover:border-blue-500/20",
      iconColor: "text-blue-600",
      buttonText: "Hospital Center"
    },
    {
      title: "Management Center",
      description: "Verify hospitals, review registrations, check site status, and view donation summary.",
      href: "/admin",
      icon: Shield,
      color: "from-amber-50/40 to-stone-50/20",
      borderColor: "hover:border-amber-500/20",
      iconColor: "text-amber-600",
      buttonText: "Management Center"
    }
  ];

  return (
    <div className="relative flex-1 flex flex-col justify-center items-center px-6 py-16 overflow-hidden bg-[#FDFBF7]">
      {/* Background glowing gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl text-center space-y-6 z-10 mb-16">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight font-sans text-stone-900 leading-tight">
          Every Drop Counts. <br />
          <span className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 bg-clip-text text-transparent">
            Every Second Matters.
          </span>
        </h1>
        <p className="text-stone-600 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          A smart blood and organ donation registry connecting patients, donors, and hospitals instantly. Verify eligibility, search locations, and coordinate saves.
        </p>
      </div>

      {/* Grid of Panels */}
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 z-10">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className={`group relative flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-br ${card.color} border border-stone-200/60 hover:shadow-md hover:shadow-stone-150/40 hover:bg-white/80 transition-all duration-300 hover:-translate-y-0.5 ${card.borderColor}`}
            >
              <div className="space-y-4">
                <div className={`w-11 h-11 rounded-xl bg-white flex items-center justify-center border border-stone-200/60 shadow-sm ${card.iconColor}`}>
                  <Icon className="w-5.5 h-5.5" />
                </div>
                <h3 className="text-xl font-bold text-stone-900 group-hover:text-red-600 transition-colors">
                  {card.title}
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  {card.description}
                </p>
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-stone-800 group-hover:text-red-600 transition-all">
                {card.buttonText} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Stats Bar */}
      <div className="max-w-6xl w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 pt-8 border-t border-stone-200 text-center z-10">
        <div>
          <div className="text-3xl font-extrabold text-stone-900">{stats.totalDonors}</div>
          <div className="text-xs text-stone-500 uppercase tracking-wider font-semibold mt-1">Total Pledged Donors</div>
        </div>
        <div>
          <div className="text-3xl font-extrabold text-red-600">{stats.activeRequests}</div>
          <div className="text-xs text-stone-500 uppercase tracking-wider font-semibold mt-1">Active Clinic Requests</div>
        </div>
        <div>
          <div className="text-3xl font-extrabold text-stone-900">{stats.hospitals}</div>
          <div className="text-xs text-stone-500 uppercase tracking-wider font-semibold mt-1">Hospitals Connected</div>
        </div>
        <div>
          <div className="text-3xl font-extrabold text-emerald-600">{stats.livesSaved}</div>
          <div className="text-xs text-stone-500 uppercase tracking-wider font-semibold mt-1">Lives Saved</div>
        </div>
      </div>
    </div>
  );
}
