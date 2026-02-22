'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, loading, signOut, setShowAuthModal } = useAuth();
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

  const userInitial = user?.email?.charAt(0).toUpperCase() || '?';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-0/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-[1800px] mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-accent">
                <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
                <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
                <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
              </svg>
            </div>
            <span className="font-display text-[15px] font-medium tracking-tight text-white/90">
              Generated Gallery
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-[13px] text-white/50 hover:text-white/90 transition-colors">
              Browse
            </Link>
            <Link href="/?view=trending" className="text-[13px] text-white/50 hover:text-white/90 transition-colors">
              Trending
            </Link>
            <Link href="/shuffle" className="text-[13px] text-white/50 hover:text-white/90 transition-colors flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
              Shuffle
            </Link>
            <Link
              href="/upload"
              className="text-[13px] px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.1] transition-all"
            >
              Submit
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
                        <p className="text-[12px] text-white/40 truncate">{user.email}</p>
                      </div>
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
              <Link href="/" onClick={() => setIsOpen(false)} className="text-sm text-white/60 hover:text-white py-1">Browse</Link>
              <Link href="/?view=trending" onClick={() => setIsOpen(false)} className="text-sm text-white/60 hover:text-white py-1">Trending</Link>
              <Link href="/shuffle" onClick={() => setIsOpen(false)} className="text-sm text-white/60 hover:text-white py-1">Shuffle</Link>
              <Link href="/upload" onClick={() => setIsOpen(false)} className="text-sm text-white/60 hover:text-white py-1">Submit</Link>
              {user && (
                <>
                  <div className="h-px bg-white/[0.06] my-1" />
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
              <p className="text-[11px] text-white/40 truncate">{user.email}</p>
            </div>
            <Link href="/likes" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-[13px] text-white/60 hover:text-white">My Likes</Link>
            <Link href="/galleries" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-[13px] text-white/60 hover:text-white">My Galleries</Link>
            <button onClick={() => { signOut(); setDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-[13px] text-white/40 hover:text-red-400">Sign out</button>
          </div>
        )}
      </div>
    </nav>
  );
}
