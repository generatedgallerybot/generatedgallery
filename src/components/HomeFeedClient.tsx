'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchBar } from '@/components/SearchBar';
import { CategoryFilter } from '@/components/CategoryFilter';
import { ImageGrid } from '@/components/ImageGrid';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { BrandMark, GalleryLoader } from '@/components/BrandMark';
import { getImages, getTrendingImages, searchImages, getImagesByCategory, getImagesByTag, getPersonalizedImages, type ImageQueryFilters } from '@/lib/supabase';
import { getTasteQueryHints, loadTasteProfile, rankImagesForTaste } from '@/lib/taste';
import type { Image } from '@/types';

const QUICK_TAGS = [
  'anime', 'portrait', 'fantasy', 'photorealistic', 'landscape', 'fashion',
  'architecture', 'animals', 'sci-fi', 'product photography', '3d render', 'food'
];

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/`;
}

export function HomeFeedClient() {
  return (
    <Suspense fallback={<div className="pt-16 flex items-center justify-center min-h-screen"><GalleryLoader /></div>}>
      <HomePageInner />
    </Suspense>
  );
}

function HomePageInner() {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTag, setSelectedTag] = useState(searchParams.get('tag') || '');
  const [currentView, setCurrentView] = useState<'foryou' | 'recent' | 'trending'>(
    searchParams.get('view') === 'trending' ? 'trending' : searchParams.get('view') === 'recent' ? 'recent' : 'foryou'
  );
  const [showNsfw, setShowNsfw] = useState(false);
  const [showAgeModal, setShowAgeModal] = useState(false);
  const initialMedia = searchParams.get('media');
  const [mediaType, setMediaType] = useState<'all' | 'image' | 'video'>(
    initialMedia === 'image' || initialMedia === 'video' ? initialMedia : 'all'
  );
  const [orientation, setOrientation] = useState<ImageQueryFilters['orientation']>('all');
  const [dateFilter, setDateFilter] = useState<ImageQueryFilters['date']>('all');
  const [sortFilter, setSortFilter] = useState<ImageQueryFilters['sort']>('relevance');
  const [sourceFilter, setSourceFilter] = useState('');
  const [hasMore, setHasMore] = useState(true);

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

  const PAGE_SIZE = 20;
  const MAX_FEED_IMAGES = 160;
  const PRUNE_BATCH = 40;
  const nextOffsetRef = useRef(0);
  const lastAppendRequestRef = useRef(0);
  const syncingFromUrlRef = useRef(false);
  const loadSeqRef = useRef(0);

  const estimatePrunedHeight = (removed: Image[]) => {
    const width = window.innerWidth || 1200;
    const cols = width >= 1024 ? 4 : width >= 768 ? 3 : 2;
    const colWidth = Math.max(160, (width - 80 - 16 * (cols - 1)) / cols);
    const avg = removed.reduce((sum, img) => {
      const w = img.width || 400;
      const h = img.height || 560;
      return sum + Math.min(720, Math.max(180, (h / w) * colWidth + 60));
    }, 0) / Math.max(1, removed.length);
    return Math.round((removed.length / cols) * avg);
  };

  const loadImages = useCallback(async (append = false) => {
    const seq = append ? loadSeqRef.current : ++loadSeqRef.current;
    if (append) {
      const now = Date.now();
      if (loadingMoreRef.current || now - lastAppendRequestRef.current < 650) return; // prevent duplicate bursts
      lastAppendRequestRef.current = now;
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const offset = append ? nextOffsetRef.current : 0;
        let data: Image[];

        const advancedFilters: ImageQueryFilters = { orientation, date: dateFilter, sort: sortFilter, source: sourceFilter || undefined };

        if (searchQuery) {
          data = await searchImages(searchQuery, PAGE_SIZE, offset, showNsfw, mediaType, advancedFilters);
        } else if (selectedTag) {
          data = await getImagesByTag(selectedTag, PAGE_SIZE, offset, showNsfw, mediaType, advancedFilters);
        } else if (selectedCategory) {
          data = await getImagesByCategory(selectedCategory, PAGE_SIZE, offset, showNsfw, mediaType, advancedFilters);
        } else if (currentView === 'trending') {
          data = await getTrendingImages(PAGE_SIZE, showNsfw, mediaType, offset);
        } else if (currentView === 'foryou') {
          const response = await fetch('/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile: loadTasteProfile(), limit: PAGE_SIZE, offset, showNsfw, mediaType, filters: advancedFilters }),
          });
          if (response.ok) {
            const json = await response.json();
            data = json.images || [];
          } else {
            const candidates = await getPersonalizedImages(getTasteQueryHints(), PAGE_SIZE * 4, showNsfw, mediaType, advancedFilters);
            data = rankImagesForTaste(candidates).slice(offset, offset + PAGE_SIZE);
          }
        } else {
          data = await getImages(PAGE_SIZE, offset, showNsfw, mediaType, advancedFilters);
        }

        if (!append && seq !== loadSeqRef.current) return;
        setHasMore(data.length === PAGE_SIZE);
        if (!append) {
          nextOffsetRef.current = data.length;
          setImages(data);
        } else {
          nextOffsetRef.current += data.length;
          setImages(prev => {
            const seen = new Set(prev.map(img => img.id));
            const merged = [...prev, ...data.filter(img => !seen.has(img.id))];
            if (merged.length <= MAX_FEED_IMAGES) return merged;
            const removeCount = Math.min(PRUNE_BATCH, merged.length - MAX_FEED_IMAGES + PRUNE_BATCH);
            const removed = merged.slice(0, removeCount);
            const kept = merged.slice(removeCount);
            const delta = estimatePrunedHeight(removed);
            requestAnimationFrame(() => window.scrollBy({ top: -delta, behavior: 'instant' as ScrollBehavior }));
            return kept;
          });
        }
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
  }, [searchQuery, selectedTag, selectedCategory, currentView, showNsfw, mediaType, orientation, dateFilter, sortFilter, sourceFilter]);

  // Refs for intersection observer to avoid stale closures
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  loadingRef.current = loading;
  loadingMoreRef.current = loadingMore;
  hasMoreRef.current = hasMore;
  const loadImagesRef = useRef(loadImages);
  loadImagesRef.current = loadImages;

  // Keep client state in sync with top-nav/query-param navigation. Without this,
  // clicking Trending while already on `/` updates the URL but not the existing
  // mounted HomeFeedClient state.
  useEffect(() => {
    syncingFromUrlRef.current = true;
    const q = searchParams.get('q') || '';
    const tag = searchParams.get('tag') || '';
    const viewParam = searchParams.get('view');
    const view = viewParam === 'trending' ? 'trending' : viewParam === 'recent' ? 'recent' : 'foryou';
    const media = searchParams.get('media');
    const shape = searchParams.get('orientation');
    const date = searchParams.get('date');
    const sort = searchParams.get('sort');
    const source = searchParams.get('source') || '';

    setSearchQuery(q);
    setSelectedTag(tag);
    setSelectedCategory('');
    setCurrentView(view);
    if (media === 'image' || media === 'video' || media === 'all') setMediaType(media);
    if (shape === 'portrait' || shape === 'landscape' || shape === 'square' || shape === 'all') setOrientation(shape);
    if (date === 'day' || date === 'week' || date === 'month' || date === 'year' || date === 'all') setDateFilter(date);
    if (sort === 'relevance' || sort === 'new' || sort === 'popular') setSortFilter(sort);
    setSourceFilter(source);
    requestAnimationFrame(() => { syncingFromUrlRef.current = false; });
  }, [searchParams]);

  useEffect(() => {
    if (syncingFromUrlRef.current) return;
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedTag) params.set('tag', selectedTag);
    if (!searchQuery && !selectedTag && currentView !== 'foryou') params.set('view', currentView);
    if (mediaType !== 'all') params.set('media', mediaType);
    if (orientation && orientation !== 'all') params.set('orientation', orientation);
    if (dateFilter && dateFilter !== 'all') params.set('date', dateFilter);
    if (sortFilter && sortFilter !== 'relevance') params.set('sort', sortFilter);
    if (sourceFilter) params.set('source', sourceFilter);
    const next = params.toString() ? `/?${params.toString()}` : '/';
    if (window.location.pathname === '/' && `${window.location.pathname}${window.location.search}` !== next) {
      window.history.replaceState(null, '', next);
    }
  }, [searchQuery, selectedTag, currentView, mediaType, orientation, dateFilter, sortFilter, sourceFilter]);

  // Initial load + filter changes
  useEffect(() => {
    nextOffsetRef.current = 0;
    setImages([]);
    setHasMore(true);
    loadImages(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedTag, selectedCategory, currentView, showNsfw, mediaType, orientation, dateFilter, sortFilter, sourceFilter]);

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
      { rootMargin: '2400px' }
    );
    observer.observe(sentinel);

    // Scroll-based fallback. Trigger early enough that fast scrolling never reaches
    // empty space, while loadImages' small cooldown prevents burst spam.
    const handleScroll = () => {
      if (loadingRef.current || loadingMoreRef.current || !hasMoreRef.current) return;
      const scrollBottom = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (docHeight - scrollBottom < 3200) {
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
    const clean = query.trim();
    setSearchQuery(clean);
    setSelectedCategory('');
    setSelectedTag('');
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSearchQuery('');
    setSelectedTag('');
  };

  const handleTagSelect = (tag: string) => {
    const next = selectedTag === tag ? '' : tag;
    setSelectedTag(next);
    setSelectedCategory('');
    setSearchQuery('');
  };

  const resetDiscoveryFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedTag('');
    setCurrentView('foryou');
    setMediaType('all');
    setOrientation('all');
    setDateFilter('all');
    setSortFilter('relevance');
    setSourceFilter('');
    window.history.replaceState(null, '', '/');
  };

  const hasAdvancedFilters = mediaType !== 'all' || orientation !== 'all' || dateFilter !== 'all' || sortFilter !== 'relevance' || !!sourceFilter;

  return (
    <div className="pt-16">
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
            A free AI art gallery with generated images, prompts, provenance, and downloads. Always open.
          </p>
          <SearchBar onSearch={handleSearch} initialQuery={searchQuery} />
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/generate"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#e8d5b7] text-[#090909] hover:bg-[#d8c5a6] transition-all text-[13px] font-semibold shadow-lg shadow-black/20"
            >
              Generate your own
              <span className="text-[#090909]/55">24 free credits</span>
            </a>
            <a
              href="/generate"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.1] transition-all text-[13px] font-medium"
            >
              Try Flux + LoRA studio
            </a>
          </div>
          <a
            href="/shuffle"
            className="inline-flex md:hidden items-center gap-2 px-5 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.1] transition-all text-[13px] font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" /></svg>
            Shuffle
          </a>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 max-w-4xl mx-auto mb-10 relative">
          <a href="/models" className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-4 text-left hover:bg-white/[0.06] hover:border-accent/20 transition-all group">
            <span className="text-[11px] uppercase tracking-widest text-accent/60">Models</span>
            <h2 className="mt-2 font-display text-lg text-white/85 group-hover:text-white">LoRAs, workflows, checkpoints</h2>
            <p className="mt-1 text-[13px] leading-5 text-white/40">Browse and publish reusable model assets with triggers, previews, stats, and comments.</p>
          </a>
          <a href="/ai-image-dataset" className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-4 text-left hover:bg-white/[0.06] hover:border-accent/20 transition-all group">
            <span className="text-[11px] uppercase tracking-widest text-accent/60">Dataset</span>
            <h2 className="mt-2 font-display text-lg text-white/85 group-hover:text-white">Open prompt metadata</h2>
            <p className="mt-1 text-[13px] leading-5 text-white/40">Download JSONL/GZIP exports with prompts, labels, provenance, and schema docs.</p>
          </a>
          <a href="/protocol" className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-4 text-left hover:bg-white/[0.06] hover:border-accent/20 transition-all group">
            <span className="text-[11px] uppercase tracking-widest text-accent/60">Protocol</span>
            <h2 className="mt-2 font-display text-lg text-white/85 group-hover:text-white">Build on the index</h2>
            <p className="mt-1 text-[13px] leading-5 text-white/40">Use the generated-media schema for agents, audits, loaders, and source adapters.</p>
          </a>
        </div>

        {/* Filters row */}
        <div className="space-y-5 pt-4 overflow-hidden">
          {/* View toggle + Media + NSFW */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1 bg-surface-2 rounded-full p-1 border border-white/[0.04] shrink-0">
              <button
                onClick={() => { setCurrentView('foryou'); setSearchQuery(''); setSelectedCategory(''); setSelectedTag(''); window.history.replaceState(null, '', '/'); }}
                className={`px-3 sm:px-5 py-1.5 rounded-full text-[11px] sm:text-[13px] font-medium transition-all duration-200 ${
                  currentView === 'foryou'
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-white/35 hover:text-white/60 border border-transparent'
                }`}
              >
                For You
              </button>
              <button
                onClick={() => { setCurrentView('recent'); setSearchQuery(''); setSelectedCategory(''); setSelectedTag(''); window.history.replaceState(null, '', '/?view=recent'); }}
                className={`px-3 sm:px-5 py-1.5 rounded-full text-[11px] sm:text-[13px] font-medium transition-all duration-200 ${
                  currentView === 'recent'
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-white/35 hover:text-white/60 border border-transparent'
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => { setCurrentView('trending'); setSearchQuery(''); setSelectedCategory(''); setSelectedTag(''); window.history.replaceState(null, '', '/?view=trending'); }}
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

          {/* Advanced discovery filters */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <select value={orientation} onChange={(e) => setOrientation(e.target.value as ImageQueryFilters['orientation'])} className="bg-white/[0.035] border border-white/[0.06] rounded-full px-3 py-2 text-[12px] text-white/55 outline-none focus:border-accent/30">
              <option value="all">Any shape</option>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
              <option value="square">Square</option>
            </select>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as ImageQueryFilters['date'])} className="bg-white/[0.035] border border-white/[0.06] rounded-full px-3 py-2 text-[12px] text-white/55 outline-none focus:border-accent/30">
              <option value="all">Any time</option>
              <option value="day">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="year">This year</option>
            </select>
            <select value={sortFilter} onChange={(e) => setSortFilter(e.target.value as ImageQueryFilters['sort'])} className="bg-white/[0.035] border border-white/[0.06] rounded-full px-3 py-2 text-[12px] text-white/55 outline-none focus:border-accent/30">
              <option value="relevance">Best match</option>
              <option value="new">Newest</option>
              <option value="popular">Popular</option>
            </select>
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="bg-white/[0.035] border border-white/[0.06] rounded-full px-3 py-2 text-[12px] text-white/55 outline-none focus:border-accent/30">
              <option value="">Any source</option>
              <option value="civitai">Civitai</option>
              <option value="prompthero">PromptHero</option>
            </select>
            {hasAdvancedFilters && (
              <button onClick={resetDiscoveryFilters} className="rounded-full px-3 py-2 text-[12px] text-white/35 hover:text-white/70 bg-white/[0.025] border border-white/[0.05] transition-colors">
                Reset filters
              </button>
            )}
          </div>

          {/* Fast tag filters */}
          <div className="relative">
            <div
              className="category-scroll flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 lg:-mx-10 lg:px-10 pr-8"
              style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)' }}
            >
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagSelect(tag)}
                  className={`shrink-0 px-4 py-2 min-h-[38px] rounded-full text-[12px] font-medium transition-all duration-200 border ${
                    selectedTag === tag
                      ? 'bg-white text-black border-white shadow-sm shadow-white/10'
                      : 'bg-white/[0.025] text-white/35 hover:text-white/75 hover:bg-white/[0.07] border-white/[0.05]'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Active filter indicator */}
      {(searchQuery || selectedCategory || selectedTag || hasAdvancedFilters) && (
        <div className="px-4 sm:px-6 lg:px-10 pb-4 max-w-[1800px] mx-auto">
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-white/30">
            <span>
              {searchQuery ? `Results for "${searchQuery}"` : selectedTag ? `#${selectedTag}` : selectedCategory ? `${selectedCategory.replace('-', ' ')}` : 'Filtered feed'}
            </span>
            {mediaType !== 'all' && <span className="rounded-full bg-white/[0.04] px-2 py-0.5">{mediaType}</span>}
            {orientation !== 'all' && <span className="rounded-full bg-white/[0.04] px-2 py-0.5">{orientation}</span>}
            {dateFilter !== 'all' && <span className="rounded-full bg-white/[0.04] px-2 py-0.5">{dateFilter}</span>}
            {sortFilter !== 'relevance' && <span className="rounded-full bg-white/[0.04] px-2 py-0.5">{sortFilter}</span>}
            {sourceFilter && <span className="rounded-full bg-white/[0.04] px-2 py-0.5">{sourceFilter}</span>}
            <button
              onClick={resetDiscoveryFilters}
              className="text-white/20 hover:text-white/50 transition-colors"
            >
              &times; clear
            </button>
          </div>
        </div>
      )}

      {/* adcreator.ai CTA strip */}
      <div className="px-4 sm:px-6 lg:px-10 max-w-[1800px] mx-auto mb-6">
        <a
          href="https://adcreator.ai?ref=gg"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl bg-accent/[0.07] border border-accent/20 hover:bg-accent/[0.12] hover:border-accent/35 transition-all group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-accent text-lg shrink-0">✦</span>
            <div className="min-w-0">
              <p className="text-white/80 text-[13px] sm:text-sm font-medium group-hover:text-white transition-colors leading-tight">
                Want AI images of <span className="text-accent">your products</span>?
              </p>
              <p className="text-white/35 text-[11px] sm:text-xs mt-0.5 hidden sm:block">
                Studio-quality product photos in seconds — no photographer needed.
              </p>
            </div>
          </div>
          <span className="text-[12px] sm:text-[13px] px-4 py-1.5 rounded-full bg-accent/15 text-accent border border-accent/25 group-hover:bg-accent/25 transition-all font-medium shrink-0 whitespace-nowrap">
            Try adcreator.ai →
          </span>
        </a>
      </div>

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
                : searchQuery || selectedCategory || selectedTag
                  ? 'Try a different search or category.'
                  : 'No results match these filters. Try a broader search or clear one filter.'}
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
              <div className="flex flex-col items-center gap-3 py-10">
                <BrandMark size={34} animated />
                <span className="text-[12px] text-white/25 tracking-wide uppercase">Loading more</span>
              </div>
            )}
            {!loadingMore && hasMore && (
              <div className="flex justify-center py-8">
                <span className="text-[11px] text-accent/60 tracking-wide">Scroll for more</span>
              </div>
            )}
            <div ref={observerRef} className="h-1" />
          </>
        )}
      </section>

      {/* SEO content */}
      <section className="px-4 sm:px-6 lg:px-10 max-w-[1200px] mx-auto py-16">
        <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-6 border-t border-white/[0.06] pt-10">
          <div className="space-y-5 text-sm leading-7 text-white/45">
            <h2 className="font-display text-3xl text-white">Generated Gallery is a free AI art gallery.</h2>
            <p>
              Generated Gallery collects AI-generated images from across the web and makes them searchable by prompt, style, category, and source. Browse Stable Diffusion art, Flux images, AI portraits, anime art, fantasy artwork, photorealistic images, architecture concepts, and more.
            </p>
            <p>
              Every indexed record is designed for provenance: source URLs, prompts, model metadata, categories, tags, safety flags, and download links stay attached where available. That makes Generated Gallery useful both as an AI image gallery and as an open generated-media dataset.
            </p>
          </div>
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6 h-fit">
            <h3 className="font-display text-xl text-white mb-4">Explore Generated Gallery</h3>
            <div className="grid gap-3 text-sm">
              <a href="/ai-art-gallery" className="text-accent/75 hover:text-accent">Free AI art gallery</a>
              <a href="/protocol" className="text-accent/75 hover:text-accent">Open AI media protocol</a>
              <a href="/style/portraits" className="text-accent/75 hover:text-accent">AI portraits</a>
              <a href="/style/anime" className="text-accent/75 hover:text-accent">AI anime art</a>
              <a href="/style/fantasy" className="text-accent/75 hover:text-accent">Fantasy AI art</a>
            </div>
          </div>
        </div>
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
                I&apos;m 18+, continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
