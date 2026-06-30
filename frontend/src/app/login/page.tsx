"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Heart, Mail, Lock, LogIn, ArrowRight } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data?.user) {
        let { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileErr) throw profileErr;

        if (!profile) {
          const defaultName = data.user.email?.split('@')[0] || 'User';
          const { data: newProfile, error: insertErr } = await supabase
            .from('profiles')
            .insert([{ id: data.user.id, name: defaultName, role: 'user' }])
            .select('role')
            .single();

          if (insertErr) throw insertErr;
          profile = newProfile;
        }

        if (profile?.role === 'admin') {
          router.push('/admin');
        } else if (profile?.role === 'hospital') {
          router.push('/hospital');
        } else {
          router.push('/donor');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to authenticate.');
      setLoading(false);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col justify-center items-center px-6 py-16 overflow-hidden bg-[#FDFBF7]">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white border border-stone-200/60 p-8 rounded-2xl shadow-md shadow-stone-100/50 space-y-6 z-10">
        
        {/* Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 justify-center">
            <Heart className="w-6 h-6 text-red-600 fill-red-600/10" />
            <span className="text-lg font-bold text-stone-900">BloodDonar</span>
          </div>
          <h2 className="text-2xl font-extrabold text-stone-900">Welcome Back</h2>
          <p className="text-xs text-stone-500">Sign in to connect with donors and healthcare centers.</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/60 text-red-700 text-xs font-semibold leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-1.5 transition-all duration-300 shadow-md shadow-red-600/10 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Sign In
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center border-t border-stone-100 pt-4">
          <p className="text-xs text-stone-500">
            Don't have an account?{' '}
            <Link href="/signup" className="text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-0.5 font-semibold">
              Create one <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
