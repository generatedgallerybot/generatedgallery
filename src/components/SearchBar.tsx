'use client';

import { useState, useRef, useEffect } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
}

export function SearchBar({ onSearch, initialQuery = '' }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !focused && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className={`relative group transition-all duration-300 ${focused ? 'scale-[1.02]' : ''}`}>
        {/* Search icon */}
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/30 group-hover:text-white/50 transition-colors">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search images..."
          className="w-full pl-12 pr-20 py-4 bg-surface-2 border border-white/[0.06] rounded-2xl text-[15px] text-white placeholder-white/25 focus:outline-none focus:border-accent/30 focus:bg-surface-3 focus:shadow-[0_0_0_3px_rgba(232,213,183,0.05)] transition-all duration-300"
        />

        {/* Right side: clear or shortcut hint */}
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center gap-2">
          {query ? (
            <button
              type="button"
              onClick={handleClear}
              className="w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex text-[11px] text-white/20 bg-white/[0.04] border border-white/[0.06] rounded-md px-1.5 py-0.5 font-mono">
              /
            </kbd>
          )}
        </div>
      </div>
    </form>
  );
}
