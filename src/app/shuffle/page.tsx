'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, getShuffleImages, upvoteImage, incrementDownloads } from '@/lib/supabase';
import Link from 'next/link';
import type { Image } from '@/types';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/`;
}

// Preference learning via localStorage
function getLikedTags(): Record<string, number> {
  if (typeof localStorage === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem('gg_liked_tags') || '{}'); } catch { return {}; }
}

function saveLikedTags(tags: Record<string, number>) {
  localStorage.setItem('gg_liked_tags', JSON.stringify(tags));
}

function recordLike(image: Image) {
  const tags = getLikedTags();
  // Boost category, model, and first few tags
  if (image.category && image.category !== 'Uncategorized') {
    tags[`cat:${image.category}`] = (tags[`cat:${image.category}`] || 0) + 1;
  }
  if (image.model) {
    const shortModel = image.model.split(':').pop() || image.model;
    tags[`model:${shortModel}`] = (tags[`model:${shortModel}`] || 0) + 1;
  }
  if (image.tags && Array.isArray(image.tags)) {
    image.tags.slice(0, 5).forEach(t => {
      tags[`tag:${t.toLowerCase()}`] = (tags[`tag:${t.toLowerCase()}`] || 0) + 1;
    });
  }
  saveLikedTags(tags);
}

function getTopPreferences(n = 5): { categories: string[]; models: string[]; tags: string[] } {
  const all = getLikedTags();
  const cats: [string, number][] = [];
  const models: [string, number][] = [];
  const tags: [string, number][] = [];
  for (const [k, v] of Object.entries(all)) {
    if (k.startsWith('cat:')) cats.push([k.slice(4), v]);
    else if (k.startsWith('model:')) models.push([k.slice(6), v]);
    else if (k.startsWith('tag:')) tags.push([k.slice(4), v]);
  }
  cats.sort((a, b) => b[1] - a[1]);
  models.sort((a, b) => b[1] - a[1]);
  tags.sort((a, b) => b[1] - a[1]);
  return {
    categories: cats.slice(0, n).map(c => c[0]),
    models: models.slice(0, n).map(m => m[0]),
    tags: tags.slice(0, n).map(t => t[0]),
  };
}

function hasPreferences(): boolean {
  return Object.keys(getLikedTags()).length > 0;
}

type MediaType = 'all' | 'image' | 'video';
type ShuffleMode = 'random' | 'foryou';

export default function ShufflePage() {
  const [images, setImages] = useState<Image[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [showNsfw, setShowNsfw] = useState(false);
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [mediaType, setMediaType] = useState<MediaType>('all');
  const [shuffleMode, setShuffleMode] = useState<ShuffleMode>('random');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [showCopied, setShowCopied] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem('gg_shuffle_muted') !== 'false';
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Hide parent navbar/footer
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const nav = document.querySelector('nav');
    const footer = document.querySelector('footer');
    const main = document.querySelector('main');
    if (nav) nav.style.display = 'none';
    if (footer) footer.style.display = 'none';
    if (main) main.style.minHeight = '0';
    return () => {
      document.body.style.overflow = '';
      if (nav) nav.style.display = '';
      if (footer) footer.style.display = '';
      if (main) main.style.minHeight = '';
    };
  }, []);

  const toggleMute = () => {
    const newVal = !isMuted;
    setIsMuted(newVal);
    localStorage.setItem('gg_shuffle_muted', String(newVal));
    if (videoRef.current) videoRef.current.muted = newVal;
  };

  // Sync muted state when video changes
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [currentIndex, isMuted]);

  const handleNsfwToggle = () => {
    if (showNsfw) { setShowNsfw(false); return; }
    if (getCookie('nsfw_age_verified') === 'true') { setShowNsfw(true); return; }
    setShowAgeModal(true);
  };

  const confirmAge = () => {
    setCookie('nsfw_age_verified', 'true', 365);
    setShowAgeModal(false);
    setShowNsfw(true);
  };

  const loadRandomImages = useCallback(async () => {
    setLoading(true);
    try {
      let searchTerms = activeSearch;
      let preferredCategories: string[] = [];

      if (shuffleMode === 'foryou' && !activeSearch) {
        const prefs = getTopPreferences(3);
        preferredCategories = prefs.categories;
        if (prefs.tags.length > 0 && !preferredCategories.length) {
          searchTerms = prefs.tags.slice(0, 2).join(' ');
        }
      }

      const results = await getShuffleImages(
        showNsfw, mediaType, searchTerms || undefined, preferredCategories.length > 0 ? preferredCategories : undefined
      );

      if (results.length === 0 && shuffleMode === 'foryou') {
        setShuffleMode('random');
        return;
      }

      setImages(results as Image[]);
      setCurrentIndex(0);
      setImageLoaded(false);
    } catch (err) {
      console.error('Shuffle load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [showNsfw, activeSearch, mediaType, shuffleMode]);

  useEffect(() => { loadRandomImages(); }, [loadRandomImages]);

  const goNext = useCallback(() => {
    setImageLoaded(false);
    if (currentIndex < images.length - 1) setCurrentIndex(prev => prev + 1);
    else loadRandomImages();
  }, [currentIndex, images.length, loadRandomImages]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) { setImageLoaded(false); setCurrentIndex(prev => prev - 1); }
  }, [currentIndex]);

  // Like
  const handleLike = async () => {
    if (!currentImage) return;
    const id = currentImage.id;
    if (likedIds.has(id)) return;

    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 600);

    setLikedIds(prev => new Set(prev).add(id));
    recordLike(currentImage);

    try {
      const ip = 'shuffle-' + Math.random().toString(36).slice(2, 8);
      await upvoteImage(id, ip);
    } catch (e) { console.error('Like failed:', e); }
  };

  // Download
  const handleDownload = async () => {
    if (!currentImage) return;
    try {
      await incrementDownloads(currentImage.id);
      const response = await fetch(currentImage.image_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentImage.title || currentImage.id}.${isVideo ? 'mp4' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) { console.error('Download failed:', e); }
  };

  // Share
  const handleShare = async () => {
    if (!currentImage) return;
    const url = `https://generatedgallery.com/image/${currentImage.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: currentImage.title || 'AI Generated Image', url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (document.activeElement === searchInputRef.current) return;
      if (e.key === 'ArrowDown' || e.key === 'j' || e.key === ' ') { e.preventDefault(); goNext(); }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); goPrev(); }
      else if (e.key === 'l') handleLike();
      else if (e.key === 'd') handleDownload();
      else if (e.key === 'm') toggleMute();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, currentIndex, images]);

  // Touch/swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    const deltaX = Math.abs(touchStartX.current - e.changedTouches[0].clientX);
    if (Math.abs(deltaY) > 60 && Math.abs(deltaY) > deltaX) {
      if (deltaY > 0) goNext(); else goPrev();
    }
  };

  // Mouse wheel
  const wheelCooldown = useRef(false);
  const handleWheel = useCallback((e: WheelEvent) => {
    if ((e.target as HTMLElement)?.closest('input')) return;
    if (wheelCooldown.current) return;
    if (Math.abs(e.deltaY) > 30) {
      wheelCooldown.current = true;
      if (e.deltaY > 0) goNext(); else goPrev();
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
  const isVideo = currentImage && (currentImage.media_type === 'video' || /\.(mp4|webm|mov|gif)(\?|$)/i.test(currentImage.image_url));
  const isLiked = currentImage ? likedIds.has(currentImage.id) : false;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/90 via-black/60 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 pointer-events-auto">
          {/* Back */}
          <Link href="/" className="text-white/60 hover:text-white transition-colors shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>

          {/* Search input */}
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search prompts, titles..."
                className="w-full bg-white/[0.1] border border-white/[0.12] rounded-full px-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent/40 focus:bg-white/[0.15] transition-all"
              />
              {(searchInput || activeSearch) && (
                <button
                  type="button"
                  onClick={() => { setSearchInput(''); setActiveSearch(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-sm"
                >
                  ✕
                </button>
              )}
            </div>
          </form>

          {/* Counter */}
          <span className="text-white/25 text-xs font-mono shrink-0">
            {images.length > 0 ? `${currentIndex + 1}/${images.length}` : ''}
          </span>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between px-4 sm:px-6 pb-3 pointer-events-auto">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Shuffle mode: Random vs For You */}
            <div className="flex items-center gap-1 bg-white/[0.06] rounded-full p-0.5 border border-white/[0.06]">
              <button
                onClick={() => setShuffleMode('random')}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                  shuffleMode === 'random' ? 'bg-accent/15 text-accent border border-accent/25' : 'text-white/30 hover:text-white/50 border border-transparent'
                }`}
              >
                🔀 Random
              </button>
              <button
                onClick={() => setShuffleMode('foryou')}
                disabled={!hasPreferences()}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                  shuffleMode === 'foryou' ? 'bg-accent/15 text-accent border border-accent/25' : 'text-white/30 hover:text-white/50 border border-transparent'
                } ${!hasPreferences() ? 'opacity-30 cursor-not-allowed' : ''}`}
                title={!hasPreferences() ? 'Like some images first to build your taste profile' : 'Shuffle based on your likes'}
              >
                ✨ For You
              </button>
            </div>

            {/* Media type */}
            <div className="flex items-center gap-1 bg-white/[0.06] rounded-full p-0.5 border border-white/[0.06]">
              {(['all', 'image', 'video'] as MediaType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setMediaType(type)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                    mediaType === type ? 'bg-accent/15 text-accent border border-accent/25' : 'text-white/30 hover:text-white/50 border border-transparent'
                  }`}
                >
                  {type === 'all' ? 'All' : type === 'image' ? '🖼' : '🎬'}
                </button>
              ))}
            </div>
          </div>

          {/* NSFW */}
          <button onClick={handleNsfwToggle} className="flex items-center gap-2 group shrink-0">
            <div className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${showNsfw ? 'bg-red-500/60' : 'bg-white/[0.08]'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200 ${showNsfw ? 'left-[14px]' : 'left-0.5'}`} />
            </div>
            <span className="text-[11px] text-white/25 group-hover:text-white/40 transition-colors">NSFW</span>
          </button>
        </div>
      </div>

      {/* Main content area */}
      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-white/30 text-sm">Shuffling...</p>
        </div>
      ) : !currentImage ? (
        <div className="text-center px-6">
          <p className="text-white/40 text-lg mb-2">No results</p>
          <p className="text-white/20 text-sm">
            {mediaType !== 'all'
              ? `No ${mediaType === 'video' ? 'videos or GIFs' : 'images'} yet. Try "All" instead.`
              : 'Try different filters or search terms'}
          </p>
          {mediaType !== 'all' && (
            <button onClick={() => setMediaType('all')}
              className="mt-4 text-[13px] px-5 py-2 rounded-full bg-white/[0.08] border border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.15] transition-all">
              Show all media
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Media display */}
          <div className="relative w-full h-full flex items-center justify-center">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              </div>
            )}
            {isVideo ? (
              <video
                ref={videoRef}
                key={currentImage.id}
                src={currentImage.image_url}
                className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoadedData={() => setImageLoaded(true)}
                autoPlay loop muted={isMuted} playsInline draggable={false}
              />
            ) : (
              <img
                key={currentImage.id}
                src={currentImage.image_url}
                alt={currentImage.title || 'AI generated image'}
                className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
                onDoubleClick={handleLike}
                draggable={false}
              />
            )}
            {/* Double-tap heart animation */}
            {likeAnim && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="#e8d5b7" className="animate-ping opacity-80">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
            )}
          </div>

          {/* Right side action buttons (TikTok style) */}
          <div className="absolute right-3 sm:right-5 bottom-32 sm:bottom-24 z-30 flex flex-col items-center gap-4">
            {/* Like */}
            <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                isLiked ? 'bg-red-500/20' : 'bg-white/[0.08] hover:bg-white/[0.15]'
              }`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill={isLiked ? '#ef4444' : 'none'} stroke={isLiked ? '#ef4444' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isLiked ? 'scale-110' : 'group-hover:scale-105'}`}>
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <span className="text-[10px] text-white/40">{isLiked ? 'Liked' : 'Like'}</span>
            </button>

            {/* Sound toggle (only show for videos) */}
            {isVideo && (
              <button onClick={toggleMute} className="flex flex-col items-center gap-1 group">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                  !isMuted ? 'bg-accent/20' : 'bg-white/[0.08] hover:bg-white/[0.15]'
                }`}>
                  {isMuted ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isMuted ? 'white' : '#e8d5b7'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  )}
                </div>
                <span className="text-[10px] text-white/40">{isMuted ? 'Muted' : 'Sound'}</span>
              </button>
            )}

            {/* Share */}
            <button onClick={handleShare} className="flex flex-col items-center gap-1 group relative">
              <div className="w-11 h-11 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-105 transition-transform">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </div>
              <span className="text-[10px] text-white/40">Share</span>
              {showCopied && (
                <span className="absolute -left-16 top-2 text-[10px] bg-accent/90 text-black px-2 py-0.5 rounded-full whitespace-nowrap">
                  Link copied!
                </span>
              )}
            </button>

            {/* Download */}
            <button onClick={handleDownload} className="flex flex-col items-center gap-1 group">
              <div className="w-11 h-11 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-105 transition-transform">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
              <span className="text-[10px] text-white/40">Save</span>
            </button>

            {/* Nav arrows (desktop) */}
            <div className="hidden sm:flex flex-col gap-2 mt-2">
              <button onClick={goPrev} disabled={currentIndex === 0}
                className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.12] transition-all disabled:opacity-20">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 15l-6-6-6 6" /></svg>
              </button>
              <button onClick={goNext}
                className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.12] transition-all">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
              </button>
            </div>
          </div>

          {/* Bottom overlay with metadata */}
          <div className="absolute bottom-0 left-0 right-16 sm:right-20 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-20 pb-5 px-4 sm:px-6">
            <div className="max-w-xl space-y-1.5">
              {currentImage.title && (
                <h2 className="text-white font-display text-base sm:text-lg font-medium leading-tight truncate">
                  {currentImage.title}
                </h2>
              )}
              {currentImage.prompt && (
                <p className="text-white/40 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                  {currentImage.prompt}
                </p>
              )}
              <div className="flex items-center gap-3 pt-0.5">
                {currentImage.model && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.08] text-white/40 truncate max-w-[120px]">
                    {currentImage.model}
                  </span>
                )}
                {currentImage.category && currentImage.category !== 'Uncategorized' && (
                  <span className="text-[10px] text-white/25">{currentImage.category}</span>
                )}
                <Link href={`/image/${currentImage.id}`} className="text-[10px] text-accent/60 hover:text-accent transition-colors">
                  details →
                </Link>
              </div>
            </div>
          </div>

          {/* Swipe hint (mobile, first load only) */}
          {currentIndex === 0 && (
            <div className="sm:hidden absolute bottom-28 left-1/2 -translate-x-1/2 z-20 animate-bounce">
              <div className="flex flex-col items-center gap-1 text-white/20">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
                <span className="text-[10px]">swipe up</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Age Verification Modal */}
      {showAgeModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/[0.1] rounded-2xl p-8 max-w-sm mx-4 text-center space-y-5">
            <div className="text-3xl">🔞</div>
            <h2 className="text-xl font-semibold text-white">Age Verification</h2>
            <p className="text-white/50 text-sm leading-relaxed">
              NSFW content may contain mature or explicit imagery. Please confirm you are at least 18 years old.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button onClick={() => setShowAgeModal(false)}
                className="px-5 py-2 rounded-full text-sm text-white/40 bg-white/[0.06] border border-white/[0.08] hover:text-white/60 hover:bg-white/[0.1] transition-all">
                Cancel
              </button>
              <button onClick={confirmAge}
                className="px-5 py-2 rounded-full text-sm font-medium text-[#1a1a1a] bg-[#e8d5b7] hover:bg-[#d4c2a5] transition-all">
                I&apos;m 18+, continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
