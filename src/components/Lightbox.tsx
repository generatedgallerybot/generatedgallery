'use client';

import { useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { Image as ImageType } from '@/types';

interface LightboxProps {
  image: ImageType;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

function isVideo(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.includes('/video');
}

function isGif(url: string): boolean {
  if (!url) return false;
  return url.toLowerCase().endsWith('.gif');
}

export function Lightbox({ image, onClose, onPrev, onNext }: LightboxProps) {
  const url = image.image_url || image.thumbnail_url || '';
  const video = isVideo(url);
  const gif = isGif(url);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft' && onPrev) onPrev();
    if (e.key === 'ArrowRight' && onNext) onNext();
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [handleKey]);

  const fmt = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Nav arrows */}
      {onPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      {onNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M7 4L12 9L7 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {/* Image + info */}
      <div className="relative z-10 flex flex-col items-center max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="relative rounded-xl overflow-hidden">
          {video ? (
            <video
              src={url}
              autoPlay
              muted
              loop
              playsInline
              className="max-w-[85vw] max-h-[75vh] object-contain"
            />
          ) : gif ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={image.title || image.prompt || 'AI Generated Image'}
              className="max-w-[85vw] max-h-[75vh] object-contain"
            />
          ) : (
            <Image
              src={url}
              alt={image.title || image.prompt || 'AI Generated Image'}
              width={image.width || 800}
              height={image.height || 1200}
              className="max-w-[85vw] max-h-[75vh] object-contain"
              unoptimized
              priority
            />
          )}
        </div>

        {/* Info bar */}
        <div className="mt-4 flex items-center gap-6 text-sm text-white/60">
          {image.title && (
            <span className="text-white/80 font-medium max-w-md truncate">{image.title}</span>
          )}
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M6 2L7.2 4.5L10 4.9L8 6.8L8.4 9.6L6 8.3L3.6 9.6L4 6.8L2 4.9L4.8 4.5L6 2Z" fill="currentColor" /></svg>
            {fmt(image.upvotes)}
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M6 2V8M6 8L3.5 5.5M6 8L8.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M2 9.5H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
            {fmt(image.downloads)}
          </span>
          {image.model && (
            <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/50 text-xs">{image.model}</span>
          )}
          <a
            href={`/image/${image.id}`}
            className="ml-auto px-4 py-1.5 rounded-full bg-accent/15 text-accent text-xs font-medium hover:bg-accent/25 transition-colors"
          >
            Details →
          </a>
        </div>
      </div>
    </div>
  );
}
