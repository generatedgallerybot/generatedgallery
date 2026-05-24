'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BrandMark } from '@/components/BrandMark';
import { isAdminEmail } from '@/lib/admins';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, session, loading, signOut, setShowAuthModal } = useAuth();
  const [profileName, setProfileName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!session?.access_token) { setProfileName(''); return; }
    fetch('/api/profile', { headers: { authorization: `Bearer ${session.access_token}` } })
      .then(res => res.ok ? res.json() : null)
      .then(body => setProfileName(body?.profile?.username || ''))
      .catch(() => {});
  }, [session?.access_token]);

  const safeHandle = profileName ? `@${profileName}` : '@gallery-creature';
  const userInitial = (profileName || 'g').charAt(0).toUpperCase();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-0/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-[1800px] mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <BrandMark size={32} />
            <span className="font-display text-[15px] font-medium tracking-tight text-white/90">
              Generated Gallery
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-[13px] text-white/50 hover:text-white/90 transition-colors">
              For You
            </Link>
            <Link href="/?view=recent" className="text-[13px] text-white/50 hover:text-white/90 transition-colors">
              Browse
            </Link>
            <Link href="/?view=trending" className="text-[13px] text-white/50 hover:text-white/90 transition-colors">
              Trending
            </Link>
            <Link href="/galleries" className="text-[13px] text-white/50 hover:text-white/90 transition-colors">
              Galleries
            </Link>
            <Link href="/machine-dream-finds" className="text-[13px] text-white/50 hover:text-white/90 transition-colors">
              Finds
            </Link>
            <Link href="/generate" className="text-[13px] px-4 py-1.5 rounded-full bg-[#e8d5b7] text-[#090909] font-semibold hover:bg-[#d8c5a6] transition-all">Generate</Link>
            <Link href="/loras" className="text-[13px] text-white/50 hover:text-white/90 transition-colors">
              LoRAs
            </Link>
            <Link href="/shuffle" className="text-[13px] text-white/50 hover:text-white/90 transition-colors flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
              Shuffle
            </Link>
            <Link href="/protocol" className="text-[13px] text-white/50 hover:text-white/90 transition-colors">
              Protocol
            </Link>
            {/* Auth */}
            {!loading && (
              user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent text-[13px] font-medium hover:bg-accent/30 transition-colors"
                  >
                    {userInitial}
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-surface-2 border border-white/[0.08] rounded-xl py-2 shadow-xl shadow-black/30">
                      <div className="px-4 py-2 border-b border-white/[0.06]">
                        <p className="text-[12px] text-white/40 truncate">{safeHandle}</p>
                      </div>
                      {isAdminEmail(user.email) && (
                        <Link href="/admin" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-[13px] text-accent hover:text-white hover:bg-white/[0.04] transition-colors">
                          Admin
                        </Link>
                      )}
                      <Link href="/profile" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors">
                        Profile
                      </Link>
                      <Link href="/generate" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors">
                        Generate
                      </Link>
                      <Link href="/likes" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors">
                        My Likes
                      </Link>
                      <Link href="/galleries" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors">
                        My Galleries
                      </Link>
                      <button
                        onClick={() => { signOut(); setDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-[13px] text-white/40 hover:text-red-400 hover:bg-white/[0.04] transition-colors"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="text-[13px] text-white/35 hover:text-white/70 transition-colors"
                >
                  Sign in
                </button>
              )
            )}
          </div>

          {/* Mobile toggle */}
          <div className="flex items-center gap-3 md:hidden">
            {!loading && !user && (
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-[12px] text-white/35 hover:text-white/70 transition-colors"
              >
                Sign in
              </button>
            )}
            {!loading && user && (
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent text-[11px] font-medium"
              >
                {userInitial}
              </button>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white/80"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                {isOpen ? (
                  <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                ) : (
                  <>
                    <path d="M2 5H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M2 9H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M2 13H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-white/[0.06] animate-fade-in">
            <div className="flex flex-col gap-3">
              <Link href="/" onClick={() => setIsOpen(false)} className="text-sm text-white/60 hover:text-white py-1">For You</Link>
              <Link href="/?view=recent" onClick={() => setIsOpen(false)} className="text-sm text-white/60 hover:text-white py-1">Browse</Link>
              <Link href="/?view=trending" onClick={() => setIsOpen(false)} className="text-sm text-white/60 hover:text-white py-1">Trending</Link>
              <Link href="/generate" onClick={() => setIsOpen(false)} className="text-sm text-[#e8d5b7] hover:text-white py-1">Generate</Link>
              <Link href="/loras" onClick={() => setIsOpen(false)} className="text-sm text-white/60 hover:text-white py-1">LoRAs</Link>
              <Link href="/shuffle" onClick={() => setIsOpen(false)} className="text-sm text-white/60 hover:text-white py-1">Shuffle</Link>
              <Link href="/galleries" onClick={() => setIsOpen(false)} className="text-sm text-white/60 hover:text-white py-1">Galleries</Link>
              <Link href="/machine-dream-finds" onClick={() => setIsOpen(false)} className="text-sm text-white/60 hover:text-white py-1">Finds</Link>
              <Link href="/protocol" onClick={() => setIsOpen(false)} className="text-sm text-white/60 hover:text-white py-1">Protocol</Link>
              {user && (
                <>
                  <div className="h-px bg-white/[0.06] my-1" />
                  {isAdminEmail(user.email) && <Link href="/admin" onClick={() => setIsOpen(false)} className="text-sm text-[#e8d5b7] hover:text-white py-1">Admin</Link>}
                  <Link href="/profile" onClick={() => setIsOpen(false)} className="text-sm text-white/60 hover:text-white py-1">Profile</Link>
                  <Link href="/likes" onClick={() => setIsOpen(false)} className="text-sm text-white/60 hover:text-white py-1">My Likes</Link>
                  <Link href="/galleries" onClick={() => setIsOpen(false)} className="text-sm text-white/60 hover:text-white py-1">My Galleries</Link>
                  <button onClick={() => { signOut(); setIsOpen(false); }} className="text-left text-sm text-white/40 hover:text-red-400 py-1">Sign out</button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Mobile dropdown (user menu) */}
        {dropdownOpen && user && (
          <div className="md:hidden absolute right-6 top-14 w-52 bg-surface-2 border border-white/[0.08] rounded-xl py-2 shadow-xl shadow-black/30 z-50">
            <div className="px-4 py-2 border-b border-white/[0.06]">
              <p className="text-[11px] text-white/40 truncate">{safeHandle}</p>
            </div>
            {isAdminEmail(user.email) && <Link href="/admin" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-[13px] text-accent hover:text-white">Admin</Link>}
            <Link href="/profile" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-[13px] text-white/60 hover:text-white">Profile</Link>
            <Link href="/likes" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-[13px] text-white/60 hover:text-white">My Likes</Link>
            <Link href="/galleries" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-[13px] text-white/60 hover:text-white">My Galleries</Link>
            <button onClick={() => { signOut(); setDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-[13px] text-white/40 hover:text-red-400">Sign out</button>
          </div>
        )}
      </div>
    </nav>
  );
}
