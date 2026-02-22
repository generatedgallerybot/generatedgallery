'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { SearchBar } from '@/components/SearchBar';
import { CategoryFilter } from '@/components/CategoryFilter';
import Link from 'next/link';
import type { Image } from '@/types';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

export default function ShufflePage() {
  const [images, setImages] = useState<Image[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showNsfw] = useState(() => typeof document !== 'undefined' && getCookie('nsfw_age_verified') === 'true');
  const [showFilters, setShowFilters] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  const loadRandomImages = useCallback(async () => {
    setLoading(true);
    try {
      // Get total count first
      let countQuery = supabase.from('images').select('*', { count: 'exact', head: true });
      if (!showNsfw) countQuery = countQuery.eq('is_nsfw', false);
      if (selectedCategory) countQuery = countQuery.eq('category', selectedCategory);
      if (searchQuery) countQuery = countQuery.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,prompt.ilike.%${searchQuery}%`);
      
      const { count } = await countQuery;
      if (!count || count === 0) {
        setImages([]);
        setLoading(false);
        return;
      }

      // Fetch 20 random images by picking random offsets
      const batchSize = 20;
      const offsets = Array.from({ length: batchSize }, () => Math.floor(Math.random() * count));
      
      const promises = offsets.map(async (offset) => {
        let query = supabase.from('images').select('*').range(offset, offset).limit(1);
        if (!showNsfw) query = query.eq('is_nsfw', false);
        if (selectedCategory) query = query.eq('category', selectedCategory);
        if (searchQuery) query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,prompt.ilike.%${searchQuery}%`);
        const { data } = await query;
        return data?.[0];
      });

      const results = (await Promise.all(promises)).filter(Boolean) as Image[];
      // Dedupe
      const seen = new Set<string>();
      const unique = results.filter(img => {
        if (seen.has(img.id)) return false;
        seen.add(img.id);
        return true;
      });

      setImages(unique);
      setCurrentIndex(0);
      setImageLoaded(false);
    } catch (err) {
      console.error('Shuffle load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [showNsfw, selectedCategory, searchQuery]);

  useEffect(() => {
    loadRandomImages();
  }, [loadRandomImages]);

  const goNext = useCallback(() => {
    setImageLoaded(false);
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Load more
      loadRandomImages();
    }
  }, [currentIndex, images.length, loadRandomImages]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setImageLoaded(false);
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'f') {
        setShowFilters(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev]);

  // Touch/swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    const deltaX = Math.abs(touchStartX.current - e.changedTouches[0].clientX);
    // Only trigger on vertical swipes (not horizontal)
    if (Math.abs(deltaY) > 60 && Math.abs(deltaY) > deltaX) {
      if (deltaY > 0) goNext();
      else goPrev();
    }
  };

  // Mouse wheel
  const wheelCooldown = useRef(false);
  const handleWheel = useCallback((e: WheelEvent) => {
    if (wheelCooldown.current) return;
    if (Math.abs(e.deltaY) > 30) {
      wheelCooldown.current = true;
      if (e.deltaY > 0) goNext();
      else goPrev();
      setTimeout(() => { wheelCooldown.current = false; }, 400);
    }
  }, [goNext, goPrev]);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: true });
      return () => el.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  const currentImage = images[currentIndex];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedCategory('');
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSearchQuery('');
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4">
          <Link href="/" className="text-white/60 hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-white/30 text-xs font-mono">{currentIndex + 1}/{images.length}</span>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-full transition-colors ${showFilters ? 'bg-accent/20 text-accent' : 'text-white/50 hover:text-white/80'}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Collapsible filters */}
        {showFilters && (
          <div className="px-4 sm:px-6 pb-4 space-y-3 animate-fade-in">
            <SearchBar onSearch={handleSearch} />
            <CategoryFilter selectedCategory={selectedCategory} onCategorySelect={handleCategorySelect} />
          </div>
        )}
      </div>

      {/* Main image area */}
      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-white/30 text-sm">Shuffling...</p>
        </div>
      ) : !currentImage ? (
        <div className="text-center px-6">
          <p className="text-white/40 text-lg mb-2">No images found</p>
          <p className="text-white/20 text-sm">Try different filters or search terms</p>
        </div>
      ) : (
        <>
          {/* Image */}
          <div className="relative w-full h-full flex items-center justify-center">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              </div>
            )}
            <img
              key={currentImage.id}
              src={currentImage.image_url}
              alt={currentImage.title || 'AI generated image'}
              className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
              draggable={false}
            />
          </div>

          {/* Bottom overlay with metadata */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-20 pb-6 px-4 sm:px-6">
            <div className="max-w-2xl mx-auto space-y-2">
              {currentImage.title && (
                <h2 className="text-white font-display text-lg sm:text-xl font-medium leading-tight">
                  {currentImage.title}
                </h2>
              )}
              {currentImage.prompt && (
                <p className="text-white/40 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                  {currentImage.prompt}
                </p>
              )}
              <div className="flex items-center gap-4 pt-1">
                {currentImage.model && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white/40">
                    {currentImage.model}
                  </span>
                )}
                {currentImage.category && currentImage.category !== 'Uncategorized' && (
                  <span className="text-[11px] text-white/25">{currentImage.category}</span>
                )}
                <Link
                  href={`/image/${currentImage.id}`}
                  className="text-[11px] text-accent/60 hover:text-accent transition-colors ml-auto"
                >
                  View details →
                </Link>
              </div>
            </div>
          </div>

          {/* Side navigation arrows (desktop) */}
          <div className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-2 z-20">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.12] transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 15l-6-6-6 6" /></svg>
            </button>
            <button
              onClick={goNext}
              className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.12] transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
            </button>
          </div>

          {/* Swipe hint (mobile, first load only) */}
          {currentIndex === 0 && (
            <div className="sm:hidden absolute bottom-32 left-1/2 -translate-x-1/2 z-20 animate-bounce">
              <div className="flex flex-col items-center gap-1 text-white/20">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
                <span className="text-[10px]">swipe up</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
