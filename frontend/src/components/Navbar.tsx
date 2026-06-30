"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Heart, Shield, UserPlus, Search, Building2, Menu, X, LogIn, LogOut, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (data) {
      setUserProfile(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    setIsOpen(false);
  };

  const navItems = [
    { name: 'Locate Donors', href: '/locate', icon: Search },
    { name: 'Register as Donor', href: '/donor', icon: UserPlus },
    { name: 'Hospital Center', href: '/hospital', icon: Building2 },
    { name: 'Management Center', href: '/admin', icon: Shield },
  ];

  const isActive = (path: string) => pathname === path;
  const filteredNavItems = session ? navItems : [];

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#FDFBF7]/85 border-b border-stone-200/50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <Heart className="w-8 h-8 text-red-600 fill-red-600/10 group-hover:scale-110 transition-transform duration-300" />
          <span className="text-xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent font-sans">
            BloodDonar
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  active
                    ? 'bg-red-50 text-red-600 border border-red-200/60 shadow-sm shadow-red-50'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-red-600' : 'text-stone-500'}`} />
                {item.name}
              </Link>
            );
          })}

          {/* Dynamic Sign In/Sign Out Button */}
          {session ? (
            <div className="flex items-center gap-3 ml-4 border-l border-stone-200 pl-4">
              <div className="flex items-center gap-2 text-xs text-stone-600 font-semibold">
                <div className="w-6 h-6 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-stone-500" />
                </div>
                <span>{userProfile?.name || 'User'}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-500 hover:text-red-600 hover:bg-red-50 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-all ml-4"
            >
              <LogIn className="w-4 h-4" /> Sign In
            </Link>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 text-stone-600 hover:text-stone-950 rounded-lg hover:bg-stone-100 transition-colors"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 border-b border-stone-200 bg-[#FDFBF7]/95 backdrop-blur-lg py-4 px-6 flex flex-col gap-2 transition-all duration-300 shadow-lg shadow-stone-100">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                  active
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100/60 border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-red-600' : 'text-stone-500'}`} />
                {item.name}
              </Link>
            );
          })}

          {/* Mobile Auth Button */}
          {session ? (
            <div className="border-t border-stone-200 mt-2 pt-3 flex flex-col gap-3">
              <div className="flex items-center gap-2.5 px-4">
                <div className="w-7 h-7 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center">
                  <User className="w-4 h-4 text-stone-500" />
                </div>
                <span className="text-sm font-semibold text-stone-700">{userProfile?.name || 'User'}</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-stone-50 border border-stone-200 hover:border-red-200 text-stone-700 hover:text-red-600 transition-all"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-all mt-2"
            >
              <LogIn className="w-4 h-4" /> Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
