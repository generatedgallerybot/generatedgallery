'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  return (
    <Suspense fallback={<div className="pt-16 flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /></div>}>
      <HomePageInner />
    </Suspense>
  );
}

function HomePageInner() {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const searchParams = useSearchParams();
  const [currentView, setCurrentView] = useState<'recent' | 'trending'>(
    searchParams.get('view') === 'trending' ? 'trending' : 'recent'
  );
  const [showNsfw, setShowNsfw] = useState(false);
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [mediaType, setMediaType] = useState<'all' | 'image' | 'video'>('all');
  const [hasMore, setHasMore] = useState(true);
  const [imageCount, setImageCount] = useState<string>('');
  const observerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<Image[]>([]);
  imagesRef.current = images;

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
    if (append) {
      if (loadingMoreRef.current) return; // prevent duplicate calls
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const offset = append ? imagesRef.current.length : 0;
        let data: Image[];

        if (searchQuery) {
          data = await searchImages(searchQuery, PAGE_SIZE, offset, showNsfw, mediaType);
        } else if (selectedCategory) {
          data = await getImagesByCategory(selectedCategory, PAGE_SIZE, offset, showNsfw, mediaType);
        } else if (currentView === 'trending') {
          data = await getTrendingImages(PAGE_SIZE, showNsfw, mediaType);
        } else {
          data = await getImages(PAGE_SIZE, offset, showNsfw, mediaType);
        }

        setHasMore(data.length === PAGE_SIZE);
        setImages(prev => append ? [...prev, ...data] : data);
        if (append) setLoadingMore(false);
        else setLoading(false);
        return; // success
      } catch (err) {
        console.error(`Failed to load images (attempt ${attempt + 1}/${maxRetries}):`, err);
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        if (!append) setError('Something went wrong loading images.');
      }
    }
    // All retries exhausted
    setLoading(false);
    setLoadingMore(false);
  }, [searchQuery, selectedCategory, currentView, showNsfw, mediaType]);

  // Refs for intersection observer to avoid stale closures
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  loadingRef.current = loading;
  loadingMoreRef.current = loadingMore;
  hasMoreRef.current = hasMore;
  const loadImagesRef = useRef(loadImages);
  loadImagesRef.current = loadImages;

  // Initial load + filter changes
  useEffect(() => {
    setImages([]);
    setHasMore(true);
    loadImages(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory, currentView, showNsfw, mediaType]);

  // Infinite scroll - dual approach: IntersectionObserver + scroll fallback
  useEffect(() => {
    const sentinel = observerRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current && !loadingMoreRef.current && hasMoreRef.current) {
          loadImagesRef.current(true);
        }
      },
      { rootMargin: '2000px' }
    );
    observer.observe(sentinel);

    // Scroll-based fallback — trigger when 40% from bottom
    const handleScroll = () => {
      if (loadingRef.current || loadingMoreRef.current || !hasMoreRef.current) return;
      const scrollBottom = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (docHeight - scrollBottom < docHeight * 0.4) {
        loadImagesRef.current(true);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [loading]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedCategory('');
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSearchQuery('');
  };

  return (
    <div className="pt-16 overflow-x-hidden">
      {/* Hero */}
      <section className="px-4 sm:px-6 lg:px-10 pt-16 pb-10 max-w-[1800px] mx-auto relative overflow-hidden">
        {/* Hero glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/[0.04] rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-3xl mx-auto text-center space-y-6 mb-12 relative">
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.05]">
            AI art,<br />
            <span className="text-accent/60">collected.</span>
          </h1>
          <p className="text-lg text-white/55 max-w-lg mx-auto leading-relaxed">
            {imageCount || '...'} AI-generated images and prompts from across the internet. Browse, search, and download for free.
          </p>
          <SearchBar onSearch={handleSearch} />
          <a
            href="/shuffle"
            className="inline-flex md:hidden items-center gap-2 px-5 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.1] transition-all text-[13px] font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" /></svg>
            Shuffle
          </a>
        </div>

        {/* Filters row */}
        <div className="space-y-5 pt-4 overflow-hidden">
          {/* View toggle + Media + NSFW */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1 bg-surface-2 rounded-full p-1 border border-white/[0.04] shrink-0">
              <button
                onClick={() => { setCurrentView('recent'); setSearchQuery(''); setSelectedCategory(''); }}
                className={`px-3 sm:px-5 py-1.5 rounded-full text-[11px] sm:text-[13px] font-medium transition-all duration-200 ${
                  currentView === 'recent'
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-white/35 hover:text-white/60 border border-transparent'
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => { setCurrentView('trending'); setSearchQuery(''); setSelectedCategory(''); }}
                className={`px-3 sm:px-5 py-1.5 rounded-full text-[11px] sm:text-[13px] font-medium transition-all duration-200 ${
                  currentView === 'trending'
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-white/35 hover:text-white/60 border border-transparent'
                }`}
              >
                Trending
              </button>
            </div>

            {/* Media type toggle */}
            <div className="flex items-center gap-1 bg-surface-2 rounded-full p-1 border border-white/[0.04] shrink-0">
              {(['all', 'image', 'video'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setMediaType(type)}
                  className={`px-2 sm:px-3 py-1 rounded-full text-[11px] sm:text-[12px] font-medium transition-all duration-200 ${
                    mediaType === type
                      ? 'bg-accent/10 text-accent border border-accent/20'
                      : 'text-white/30 hover:text-white/50 border border-transparent'
                  }`}
                >
                  {type === 'all' ? 'All' : type === 'image' ? '🖼' : '🎬'}
                </button>
              ))}
            </div>

            {/* NSFW toggle */}
            <button
              onClick={handleNsfwToggle}
              className="flex items-center gap-1.5 group ml-auto shrink-0"
            >
              <div className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${
                showNsfw ? 'bg-red-500/60' : 'bg-white/[0.06]'
              }`}>
                <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all duration-200 ${
                  showNsfw ? 'left-[14px]' : 'left-[2px]'
                }`} />
              </div>
              <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors font-medium">NSFW</span>
            </button>
          </div>

          {/* Categories */}
          <CategoryFilter selectedCategory={selectedCategory} onCategorySelect={handleCategorySelect} />
        </div>
      </section>

      {/* Active filter indicator */}
      {(searchQuery || selectedCategory) && (
        <div className="px-4 sm:px-6 lg:px-10 pb-4 max-w-[1800px] mx-auto">
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
      <section className="px-4 sm:px-6 lg:px-10 max-w-[1800px] mx-auto">
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
            <p className="text-white/30 text-base mb-2">No results</p>
            <p className="text-white/15 text-sm">
              {mediaType !== 'all'
                ? `No ${mediaType === 'video' ? 'videos or GIFs' : 'images'} found. Try switching to "All".`
                : searchQuery || selectedCategory
                  ? 'Try a different search or category.'
                  : 'Check back soon. New content is added regularly.'}
            </p>
            {mediaType !== 'all' && (
              <button
                onClick={() => setMediaType('all')}
                className="mt-4 text-[13px] px-5 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.1] transition-all"
              >
                Show all media
              </button>
            )}
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
