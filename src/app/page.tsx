'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SearchBar } from '@/components/SearchBar';
import { CategoryFilter } from '@/components/CategoryFilter';
import { ImageGrid } from '@/components/ImageGrid';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { getImages, getTrendingImages, searchImages, getImagesByCategory, getImageCount } from '@/lib/supabase';
import type { Image } from '@/types';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/`;
}

export default function HomePage() {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentView, setCurrentView] = useState<'recent' | 'trending'>('recent');
  const [showNsfw, setShowNsfw] = useState(false);
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [imageCount, setImageCount] = useState<string>('');
  const observerRef = useRef<HTMLDivElement>(null);

  const handleNsfwToggle = () => {
    if (showNsfw) {
      setShowNsfw(false);
      return;
    }
    // Check if already verified
    if (typeof document !== 'undefined' && getCookie('nsfw_age_verified') === 'true') {
      setShowNsfw(true);
      return;
    }
    setShowAgeModal(true);
  };

  const confirmAge = () => {
    setCookie('nsfw_age_verified', 'true', 365);
    setShowAgeModal(false);
    setShowNsfw(true);
  };

  const cancelAge = () => {
    setShowAgeModal(false);
  };

  // Fetch image count
  useEffect(() => {
    getImageCount().then(count => {
      const rounded = Math.floor(count / 100) * 100;
      setImageCount(rounded.toLocaleString() + '+');
    });
  }, []);

  // Restore scroll position after navigating back
  useEffect(() => {
    const saved = sessionStorage.getItem('gg_scroll');
    if (saved) {
      const pos = parseInt(saved, 10);
      // Wait for images to render then restore
      const timer = setTimeout(() => window.scrollTo(0, pos), 100);
      sessionStorage.removeItem('gg_scroll');
      return () => clearTimeout(timer);
    }
  }, []);

  const PAGE_SIZE = 24;

  const loadImages = useCallback(async (append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      const offset = append ? images.length : 0;
      let data: Image[];

      if (searchQuery) {
        data = await searchImages(searchQuery, PAGE_SIZE, offset, showNsfw);
      } else if (selectedCategory) {
        data = await getImagesByCategory(selectedCategory, PAGE_SIZE, offset, showNsfw);
      } else if (currentView === 'trending') {
        data = await getTrendingImages(PAGE_SIZE, showNsfw);
      } else {
        data = await getImages(PAGE_SIZE, offset, showNsfw);
      }

      setHasMore(data.length === PAGE_SIZE);
      setImages(prev => append ? [...prev, ...data] : data);
    } catch (err) {
      console.error('Failed to load images:', err);
      if (!append) setError('Something went wrong loading images.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, selectedCategory, currentView, showNsfw, images.length]);

  // Initial load + filter changes
  useEffect(() => {
    setImages([]);
    setHasMore(true);
    loadImages(false);
  }, [searchQuery, selectedCategory, currentView, showNsfw]);

  // Infinite scroll
  useEffect(() => {
    if (!observerRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && !loadingMore && hasMore) {
          loadImages(true);
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadImages]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedCategory('');
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSearchQuery('');
  };

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="px-6 lg:px-10 pt-16 pb-10 max-w-[1800px] mx-auto relative">
        {/* Hero glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/[0.04] rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-3xl mx-auto text-center space-y-6 mb-12 relative">
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.05]">
            AI art,<br />
            <span className="text-accent/60">curated.</span>
          </h1>
          <p className="text-lg text-white/55 max-w-lg mx-auto leading-relaxed">
            {imageCount || '...'} AI-generated images from across the internet. Browse, search, download — no account needed.
          </p>
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Filters row */}
        <div className="space-y-5 pt-4">
          {/* View toggle + NSFW */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-surface-2 rounded-full p-1 border border-white/[0.04]">
              <button
                onClick={() => { setCurrentView('recent'); setSearchQuery(''); setSelectedCategory(''); }}
                className={`px-5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ${
                  currentView === 'recent'
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-white/35 hover:text-white/60 border border-transparent'
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => { setCurrentView('trending'); setSearchQuery(''); setSelectedCategory(''); }}
                className={`px-5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ${
                  currentView === 'trending'
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-white/35 hover:text-white/60 border border-transparent'
                }`}
              >
                Trending
              </button>
            </div>

            {/* NSFW toggle */}
            <button
              onClick={handleNsfwToggle}
              className="flex items-center gap-2 group"
            >
              <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                showNsfw ? 'bg-red-500/60' : 'bg-white/[0.06]'
              }`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 ${
                  showNsfw ? 'left-[18px]' : 'left-0.5'
                }`} />
              </div>
              <span className="text-[12px] text-white/25 group-hover:text-white/40 transition-colors">NSFW</span>
            </button>
          </div>

          {/* Categories */}
          <CategoryFilter selectedCategory={selectedCategory} onCategorySelect={handleCategorySelect} />
        </div>
      </section>

      {/* Active filter indicator */}
      {(searchQuery || selectedCategory) && (
        <div className="px-6 lg:px-10 pb-4 max-w-[1800px] mx-auto">
          <div className="flex items-center gap-2 text-[13px] text-white/30">
            <span>
              {searchQuery ? `Results for "${searchQuery}"` : `${selectedCategory.replace('-', ' ')}`}
            </span>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory(''); }}
              className="text-white/20 hover:text-white/50 transition-colors"
            >
              &times; clear
            </button>
          </div>
        </div>
      )}

      {/* Image grid */}
      <section className="px-6 lg:px-10 max-w-[1800px] mx-auto">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-white/40 mb-4">{error}</p>
            <button
              onClick={() => loadImages(false)}
              className="text-[13px] px-5 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.1] transition-all"
            >
              Try again
            </button>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/30 text-base mb-2">No images found</p>
            <p className="text-white/15 text-sm">
              {searchQuery || selectedCategory ? 'Try a different search or category.' : 'Images will appear once the gallery is populated.'}
            </p>
          </div>
        ) : (
          <>
            <ImageGrid images={images} />
            {loadingMore && (
              <div className="flex justify-center py-8">
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={observerRef} className="h-1" />
          </>
        )}
      </section>

      {/* Age Verification Modal */}
      {showAgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-2 border border-white/[0.08] rounded-2xl p-8 max-w-sm mx-4 text-center space-y-5">
            <div className="text-3xl">🔞</div>
            <h2 className="text-xl font-semibold text-white">Age Verification</h2>
            <p className="text-white/50 text-sm leading-relaxed">
              NSFW content may contain mature or explicit imagery. Please confirm you are at least 18 years old to continue.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={cancelAge}
                className="px-5 py-2 rounded-full text-sm text-white/40 bg-white/[0.06] border border-white/[0.08] hover:text-white/60 hover:bg-white/[0.1] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmAge}
                className="px-5 py-2 rounded-full text-sm font-medium text-[#1a1a1a] bg-[#e8d5b7] hover:bg-[#d4c2a5] transition-all"
              >
                I'm 18+, continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
