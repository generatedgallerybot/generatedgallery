'use client';

import Link from 'next/link';
import { useState } from 'react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

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
            <Link href="/trending" className="text-[13px] text-white/50 hover:text-white/90 transition-colors">
              Trending
            </Link>
            <Link
              href="/upload"
              className="text-[13px] px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.1] transition-all"
            >
              Submit
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden w-8 h-8 flex items-center justify-center text-white/50 hover:text-white/80"
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

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-white/[0.06] animate-fade-in">
            <div className="flex flex-col gap-3">
              <Link href="/" onClick={() => setIsOpen(false)} className="text-sm text-white/60 hover:text-white py-1">Browse</Link>
              <Link href="/trending" onClick={() => setIsOpen(false)} className="text-sm text-white/60 hover:text-white py-1">Trending</Link>
              <Link href="/upload" onClick={() => setIsOpen(false)} className="text-sm text-white/60 hover:text-white py-1">Submit</Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
