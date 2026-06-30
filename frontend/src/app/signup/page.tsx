"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Heart, User, Mail, Lock, UserPlus, ArrowLeft, Building2, Shield, UserCheck } from 'lucide-react';

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'hospital' | 'admin'>('user');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccess(false);

    try {
      // 1. Create user in Supabase auth with metadata role
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          }
        }
      });

      if (error) throw error;

      if (data?.user) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register.');
      setLoading(false);
    }
  };

  const roles = [
    {
      id: 'user',
      title: 'Donor/Needer',
      description: 'Find donor matches or volunteer to donate.',
      icon: UserCheck
    },
    {
      id: 'hospital',
      title: 'Hospital',
      description: 'Request blood units and track matches.',
      icon: Building2
    },
    {
      id: 'admin',
      title: 'Supervisor',
      description: 'Verify clinics and oversee platform.',
      icon: Shield
    }
  ] as const;

  return (
    <div className="relative flex-1 flex flex-col justify-center items-center px-6 py-16 overflow-hidden bg-[#FDFBF7]">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-lg w-full bg-white border border-stone-200/60 p-8 rounded-2xl shadow-md shadow-stone-100/50 space-y-6 z-10">
        
        {/* Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 justify-center">
            <Heart className="w-6 h-6 text-red-600 fill-red-600/10" />
            <span className="text-lg font-bold text-stone-900">BloodDonar</span>
          </div>
          <h2 className="text-2xl font-extrabold text-stone-900">Create Account</h2>
          <p className="text-xs text-stone-500">Become a part of our life-saving community.</p>
        </div>

        {/* Success Alert */}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-semibold leading-relaxed">
            Registration successful! Redirecting to login...
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/60 text-red-700 text-xs font-semibold leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-2xs font-semibold text-stone-500 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  required
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-stone-50/50 border border-stone-200 text-stone-955 text-sm rounded-xl pl-11 pr-4 py-3.5 placeholder-stone-400 focus:outline-none focus:border-red-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-2xs font-semibold text-stone-500 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  required
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-stone-50/50 border border-stone-200 text-stone-955 text-sm rounded-xl pl-11 pr-4 py-3.5 placeholder-stone-400 focus:outline-none focus:border-red-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-2xs font-semibold text-stone-500 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-stone-50/50 border border-stone-200 text-stone-955 text-sm rounded-xl pl-11 pr-4 py-3.5 placeholder-stone-400 focus:outline-none focus:border-red-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Premium Role Selection Cards */}
            <div className="flex flex-col gap-2">
              <label className="text-2xs font-semibold text-stone-500 uppercase tracking-wider">Select Account Type</label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map((r) => {
                  const Icon = r.icon;
                  const active = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between h-28 transition-all ${
                        active
                          ? 'bg-red-50 border-red-200/60 text-red-700 scale-[1.02] shadow-sm shadow-red-50'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-stone-300 hover:text-stone-900'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-red-600' : 'text-stone-400'}`} />
                      <div>
                        <div className="text-[11px] font-bold mt-2">{r.title}</div>
                        <div className="text-[8px] text-stone-500 mt-0.5 leading-normal">{r.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-1.5 transition-all duration-300 shadow-md shadow-red-600/10 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Register Account
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="text-center border-t border-stone-100 pt-4">
          <p className="text-xs text-stone-500">
            Already have an account?{' '}
            <Link href="/login" className="text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-0.5 font-semibold">
              <ArrowLeft className="w-3.5 h-3.5" /> Sign in instead
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
