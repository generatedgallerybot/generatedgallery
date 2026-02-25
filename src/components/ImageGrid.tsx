'use client';

import { useState, useCallback, useEffect, useRef, memo, useMemo } from 'react';
import Image from 'next/image';
import { Lightbox } from '@/components/Lightbox';
import { useAuth } from '@/contexts/AuthContext';
import { toggleUserLike, getUserLikedImageIds } from '@/lib/user-data';
import { upvoteImage } from '@/lib/supabase';
import type { Image as ImageType } from '@/types';

interface ImageGridProps {
  images: ImageType[];
}

function isVideo(url: string, mediaType?: string | null): boolean {
  if (mediaType === 'video') return true;
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.includes('/video');
}

function isGif(url: string, mediaType?: string | null): boolean {
  if (mediaType === 'gif') return true;
  if (!url) return false;
  return url.toLowerCase().endsWith('.gif');
}

const GAP = 16;

function getColumnCount(width: number): number {
  if (width >= 1024) return 4;
  if (width >= 768) return 3;
  return 2;
}

interface LayoutItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function computeLayout(
  images: ImageType[],
  containerWidth: number,
  erroredSet: Set<string>,
  measuredHeights: Map<string, number>
): { items: LayoutItem[]; totalHeight: number } {
  const cols = getColumnCount(containerWidth);
  const colWidth = (containerWidth - GAP * (cols - 1)) / cols;
  const colHeights = new Array(cols).fill(0);
  const items: LayoutItem[] = [];

  for (const img of images) {
    if (erroredSet.has(img.id)) continue;

    let itemHeight: number;
    const measured = measuredHeights.get(img.id);
    if (measured) {
      itemHeight = measured;
    } else {
      const w = img.width || 400;
      const h = img.height || 500;
      itemHeight = (h / w) * colWidth + 44;
    }

    let shortest = 0;
    for (let c = 1; c < cols; c++) {
      if (colHeights[c] < colHeights[shortest]) shortest = c;
    }

    items.push({
      id: img.id,
      x: shortest * (colWidth + GAP),
      y: colHeights[shortest],
      w: colWidth,
      h: itemHeight,
    });

    colHeights[shortest] += itemHeight + GAP;
  }

  return { items, totalHeight: Math.max(...colHeights) };
}

// Clean model name for display: "prefectIllustriousXL_40" → "Prefect Illustrious XL"
function cleanModelName(raw: string): string {
  // Remove version suffixes, file extensions, urn prefixes
  let name = raw.replace(/^urn:air:[^:]+:[^:]+:[^:]+:/, '').replace(/\.safetensors$/, '');
  // Remove trailing version numbers like _v70, _40, @2484701
  name = name.replace(/[_@]v?\d+\w*$/i, '');
  // Split camelCase and underscores
  name = name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ');
  // Capitalize first letter of each word, limit length
  name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return name.length > 28 ? name.slice(0, 26) + '…' : name;
}

// Get a display label for the card
function getCardLabel(image: ImageType): string {
  if (image.title) return image.title;
  if (image.category) return image.category;
  return 'AI Artwork';
}

// Heart SVG paths
const HEART_OUTLINE = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

const GridItem = memo(function GridItem({ image, layout, loaded, onLoad, onError, onMeasure, fmt, onClick, isNew, isVisible, isLiked, onLike }: {
  image: ImageType;
  layout: LayoutItem;
  loaded: boolean;
  onLoad: () => void;
  onError: () => void;
  onMeasure: (id: string, height: number) => void;
  fmt: (n: number) => string;
  onClick: () => void;
  isNew: boolean;
  isVisible: boolean;
  isLiked: boolean;
  onLike: (e: React.MouseEvent) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);
  const url = image.thumbnail_url || image.image_url;
  const videoUrl = isVideo(url, image.media_type);
  const gifUrl = isGif(url, image.media_type);
  const handleError = () => { setHasError(true); onError(); };

  useEffect(() => {
    if (loaded && ref.current) {
      const h = ref.current.offsetHeight;
      if (h > 0) onMeasure(image.id, h);
    }
  }, [loaded, image.id, onMeasure]);

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`masonry-item group block bg-gradient-to-br from-[#1a1815] via-[#141210] to-[#0f0d0b] rounded-2xl cursor-pointer border border-white/[0.04] hover:border-white/[0.08] hover:shadow-lg hover:shadow-black/20 ${isNew ? 'animate-fadeIn' : ''}`}
      style={{
        left: layout.x,
        top: layout.y,
        width: layout.w,
        overflow: 'hidden',
      }}
    >
      <div className="relative overflow-hidden" style={{ minHeight: '150px' }}>
        {videoUrl ? (
          isVisible ? (
            <video
              src={url}
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              className={`w-full h-auto transition-all duration-500 group-hover:scale-[1.05] ${loaded ? 'opacity-100' : 'opacity-0'}`}
              style={{ transition: 'opacity 0.5s, transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)' }}
              onLoadedData={onLoad}
              onError={handleError}
            />
          ) : (
            <div className="w-full bg-gradient-to-br from-[#1a1815] via-[#141210] to-[#0f0d0b]" style={{ minHeight: '200px', aspectRatio: (image.width && image.height) ? `${image.width}/${image.height}` : '3/4' }} />
          )
        ) : gifUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={isVisible ? url : undefined}
            data-src={url}
            alt={image.title || image.prompt || 'AI Generated Image'}
            className={`w-full h-auto transition-all duration-500 group-hover:scale-[1.05] ${loaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ transition: 'opacity 0.5s, transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)' }}
            loading="lazy"
            onLoad={onLoad}
            onError={handleError}
          />
        ) : isVisible ? (
          <Image
            src={url}
            alt={image.title || image.prompt || 'AI Generated Image'}
            width={image.width || 400}
            height={image.height || 600}
            className={`w-full h-auto transition-all duration-500 group-hover:scale-[1.05] ${loaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ transition: 'opacity 0.5s, transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)' }}
            loading="eager"
            onLoad={onLoad}
            onError={handleError}
            unoptimized
          />
        ) : (
          <div
            className="w-full bg-gradient-to-br from-[#1a1815] via-[#141210] to-[#0f0d0b]"
            style={{ aspectRatio: `${image.width || 400}/${image.height || 600}` }}
          />
        )}

        {!loaded && !hasError && (
          <div className="absolute inset-0 img-loading" style={{ minHeight: '200px' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1815] via-[#141210] to-[#0f0d0b]" />
          </div>
        )}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0f0e0d]" style={{ minHeight: '200px' }}>
            <div className="text-center text-white/20">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              <p className="text-[10px]">Failed to load</p>
            </div>
          </div>
        )}

        {/* Permanent subtle gradient - desktop (always visible for context) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent hidden md:block pointer-events-none" />
        {/* Enhanced hover overlay - desktop */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 hidden md:block" />

        {/* Like button - always visible on hover (desktop), always on mobile */}
        <button
          onClick={onLike}
          className={`absolute top-3 right-3 z-10 p-1.5 rounded-full transition-all duration-200 ${
            isLiked
              ? 'bg-red-500/80 text-white opacity-100'
              : 'bg-black/50 text-white/70 opacity-0 group-hover:opacity-100 hover:bg-black/70 hover:text-white md:opacity-0'
          }`}
          style={isLiked ? {} : undefined}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d={HEART_OUTLINE} />
          </svg>
        </button>

        {/* Permanent title hint - desktop (always visible) */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 hidden md:block group-hover:opacity-0 transition-opacity duration-200 pointer-events-none">
          <h3 className="text-[11px] font-medium text-white/50 line-clamp-1">{getCardLabel(image)}</h3>
        </div>
        {/* Full info on hover - desktop */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hidden md:block">
          <h3 className="text-sm font-medium text-white line-clamp-1 mb-1">{getCardLabel(image)}</h3>
          <div className="flex items-center gap-4 text-[11px] text-white/60">
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d={HEART_OUTLINE} /></svg>
              {fmt(image.upvotes)}
            </span>
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2V8M6 8L3.5 5.5M6 8L8.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M2 9.5H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
              {fmt(image.downloads)}
            </span>
            {image.model && (
              <span className="ml-auto px-2 py-0.5 rounded-full bg-white/10 text-white/50 text-[10px]">{cleanModelName(image.model)}</span>
            )}
          </div>
        </div>

        {image.is_nsfw && (
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-red-500/80 text-[10px] font-medium text-white uppercase tracking-wider">NSFW</div>
        )}

        {videoUrl && !isLiked && (
          <div className="absolute top-3 right-3 px-1.5 py-0.5 rounded-md bg-black/60 text-[10px] text-white/70 group-hover:opacity-0 transition-opacity">▶</div>
        )}
      </div>

      {/* Mobile info bar */}
      <div className="md:hidden px-3 py-2 bg-surface-2">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-medium text-white/80 line-clamp-1 mb-1">{getCardLabel(image)}</h3>
            <div className="flex items-center gap-3 text-[10px] text-white/45">
              <span className="flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d={HEART_OUTLINE} /></svg>
                {fmt(image.upvotes)}
              </span>
              <span className="flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 2V8M6 8L3.5 5.5M6 8L8.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M2 9.5H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                {fmt(image.downloads)}
              </span>
              {image.model && (
                <span className="ml-auto px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/40 text-[9px]">{cleanModelName(image.model)}</span>
              )}
            </div>
          </div>
          <button
            onClick={onLike}
            className={`ml-2 p-1.5 rounded-full transition-colors ${isLiked ? 'text-red-500' : 'text-white/30 hover:text-white/60'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d={HEART_OUTLINE} />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});

// Track visible item IDs based on actual layout positions + container offset
function useVisibleIds(layoutItems: LayoutItem[], containerRef: React.RefObject<HTMLDivElement | null>, buffer = 1500) {
  // Start with ALL items visible until first real computation succeeds
  const [visibleIds, setVisibleIds] = useState<Set<string> | null>(null);
  const hasComputed = useRef(false);

  useEffect(() => {
    if (layoutItems.length === 0) return;

    const computeVisible = () => {
      const el = containerRef.current;
      if (!el) return;
      const vh = window.innerHeight;
      const scrollY = window.scrollY;
      const containerTop = el.getBoundingClientRect().top;
      const containerOffset = scrollY + containerTop;
      const viewTop = scrollY - buffer;
      const viewBottom = scrollY + vh + buffer;
      const ids = new Set<string>();
      for (const item of layoutItems) {
        const itemPageY = containerOffset + item.y;
        if (itemPageY + item.h >= viewTop && itemPageY <= viewBottom) {
          ids.add(item.id);
        }
      }
      // Only apply if we found visible items (guards against bad measurements)
      if (ids.size > 0 || hasComputed.current) {
        hasComputed.current = true;
        setVisibleIds(ids);
      }
    };

    // Run immediately, after short delay, and after longer delay for layout settle
    computeVisible();
    const t1 = setTimeout(computeVisible, 100);
    const t2 = setTimeout(computeVisible, 500);
    window.addEventListener('scroll', computeVisible, { passive: true });
    window.addEventListener('resize', computeVisible, { passive: true });
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('scroll', computeVisible);
      window.removeEventListener('resize', computeVisible);
    };
  }, [layoutItems, buffer, containerRef]);

  // If visibility hasn't been computed yet, treat ALL items as visible
  if (visibleIds === null) {
    return new Set(layoutItems.map(i => i.id));
  }
  return visibleIds;
}

// localStorage like tracking for anonymous users
function getAnonLikes(): Set<string> {
  try {
    const raw = localStorage.getItem('gg_liked');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}
function setAnonLikes(ids: Set<string>) {
  localStorage.setItem('gg_liked', JSON.stringify(Array.from(ids)));
}

export function ImageGrid({ images }: ImageGridProps) {
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const [errored, setErrored] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [prevCount, setPrevCount] = useState(0);
  const newItemStart = useRef(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredHeights, setMeasuredHeights] = useState<Map<string, number>>(new Map());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  // Load liked IDs
  useEffect(() => {
    if (user) {
      getUserLikedImageIds(user.id).then(setLikedIds);
    } else {
      setLikedIds(getAnonLikes());
    }
  }, [user]);

  // Measure container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (images.length > prevCount && prevCount > 0) {
      newItemStart.current = prevCount;
    } else if (images.length < prevCount) {
      newItemStart.current = 0;
      setMeasuredHeights(new Map());
    }
    setPrevCount(images.length);
  }, [images.length, prevCount]);

  const handleMeasure = useCallback((id: string, height: number) => {
    setMeasuredHeights(prev => {
      if (prev.get(id) === height) return prev;
      const next = new Map(prev);
      next.set(id, height);
      return next;
    });
  }, []);

  const handleLike = useCallback(async (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation();
    const wasLiked = likedIds.has(imageId);

    // Optimistic update
    setLikedIds(prev => {
      const next = new Set(prev);
      if (wasLiked) next.delete(imageId);
      else next.add(imageId);
      if (!user) setAnonLikes(next);
      return next;
    });

    try {
      if (user) {
        await toggleUserLike(user.id, imageId, wasLiked);
      }
      if (!wasLiked) {
        await upvoteImage(imageId, 'grid');
      }
    } catch (err) {
      // Revert on error
      setLikedIds(prev => {
        const next = new Set(prev);
        if (wasLiked) next.add(imageId);
        else next.delete(imageId);
        if (!user) setAnonLikes(next);
        return next;
      });
    }
  }, [likedIds, user]);

  const fmt = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);

  const { items: layoutItems, totalHeight } = useMemo(() => {
    if (containerWidth === 0) return { items: [], totalHeight: 0 };
    return computeLayout(images, containerWidth, errored, measuredHeights);
  }, [images, containerWidth, errored, measuredHeights]);

  const layoutMap = useMemo(() => {
    const m = new Map<string, LayoutItem>();
    for (const item of layoutItems) m.set(item.id, item);
    return m;
  }, [layoutItems]);

  const visibleImages = useMemo(() => images.filter(img => !errored.has(img.id)), [images, errored]);
  // On mobile, skip virtualization entirely — all items visible (only 24 per page, no perf issue)
  const isMobile = containerWidth > 0 && containerWidth < 768;
  const desktopVisibleIds = useVisibleIds(layoutItems, containerRef, 2500);
  const allIds = useMemo(() => new Set(layoutItems.map(i => i.id)), [layoutItems]);
  const visibleIds = isMobile ? allIds : desktopVisibleIds;

  const handlePrev = useCallback(() => {
    setLightboxIndex(i => i !== null && i > 0 ? i - 1 : i);
  }, []);

  const handleNext = useCallback(() => {
    setLightboxIndex(i => i !== null && i < visibleImages.length - 1 ? i + 1 : i);
  }, [visibleImages.length]);

  return (
    <>
      <div ref={containerRef} className="masonry" style={{ height: totalHeight }}>
        {visibleImages.map((image, index) => {
          const layout = layoutMap.get(image.id);
          if (!layout) return null;
          return (
            <GridItem
              key={image.id}
              image={image}
              layout={layout}
              loaded={loaded.has(image.id)}
              onLoad={() => setLoaded(prev => new Set(prev).add(image.id))}
              onError={() => setErrored(prev => new Set(prev).add(image.id))}
              onMeasure={handleMeasure}
              fmt={fmt}
              onClick={() => setLightboxIndex(index)}
              isNew={index >= newItemStart.current && newItemStart.current > 0}
              isVisible={visibleIds.has(image.id)}
              isLiked={likedIds.has(image.id)}
              onLike={(e) => handleLike(e, image.id)}
            />
          );
        })}
      </div>
      {lightboxIndex !== null && visibleImages[lightboxIndex] && (
        <Lightbox
          image={visibleImages[lightboxIndex]}
          onClose={() => setLightboxIndex(null)}
          onPrev={lightboxIndex > 0 ? handlePrev : undefined}
          onNext={lightboxIndex < visibleImages.length - 1 ? handleNext : undefined}
        />
      )}
    </>
  );
}
