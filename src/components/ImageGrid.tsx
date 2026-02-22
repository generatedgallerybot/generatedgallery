'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Image as ImageType } from '@/types';

interface ImageGridProps {
  images: ImageType[];
}

export function ImageGrid({ images }: ImageGridProps) {
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const [errored, setErrored] = useState<Set<string>>(new Set());

  const fmt = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);

  return (
    <div className="masonry stagger-children">
      {images.filter(img => !errored.has(img.id)).map((image) => (
        <Link
          key={image.id}
          href={`/image/${image.id}`}
          className="masonry-item group block relative bg-surface-2 rounded-2xl overflow-hidden cursor-pointer border border-white/[0.04] hover:border-white/[0.08] transition-all duration-300 hover:shadow-lg hover:shadow-black/20"
        >
          {/* Image */}
          <div className="relative overflow-hidden" style={{ minHeight: '150px' }}>
            <Image
              src={image.thumbnail_url || image.image_url}
              alt={image.title || image.prompt || 'AI Generated Image'}
              width={image.width || 400}
              height={image.height || 600}
              className={`w-full h-auto transition-all duration-500 group-hover:scale-[1.03] ${
                loaded.has(image.id) ? 'opacity-100' : 'opacity-0'
              }`}
              loading="lazy"
              onLoad={() => setLoaded(prev => new Set(prev).add(image.id))}
              onError={() => setErrored(prev => new Set(prev).add(image.id))}
              unoptimized
            />

            {/* Loading shimmer */}
            {!loaded.has(image.id) && (
              <div className="absolute inset-0 img-loading" style={{ minHeight: '200px' }} />
            )}

            {/* Hover overlay — desktop only */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:block" />

            {/* Bottom info on hover — desktop */}
            <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hidden md:block">
              {image.title && (
                <h3 className="text-sm font-medium text-white line-clamp-1 mb-1">
                  {image.title}
                </h3>
              )}
              <div className="flex items-center gap-4 text-[11px] text-white/60">
                <span className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 2L7.2 4.5L10 4.9L8 6.8L8.4 9.6L6 8.3L3.6 9.6L4 6.8L2 4.9L4.8 4.5L6 2Z" fill="currentColor" />
                  </svg>
                  {fmt(image.upvotes)}
                </span>
                <span className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 2V8M6 8L3.5 5.5M6 8L8.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 9.5H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  {fmt(image.downloads)}
                </span>
                {image.model && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-white/10 text-white/50 text-[10px]">
                    {image.model}
                  </span>
                )}
              </div>
            </div>

            {/* NSFW badge */}
            {image.is_nsfw && (
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-red-500/80 text-[10px] font-medium text-white uppercase tracking-wider">
                NSFW
              </div>
            )}
          </div>

          {/* Mobile metadata bar — always visible */}
          <div className="md:hidden px-3 py-2 bg-surface-2">
            {image.title && (
              <h3 className="text-xs font-medium text-white/80 line-clamp-1 mb-1">
                {image.title}
              </h3>
            )}
            <div className="flex items-center gap-3 text-[10px] text-white/45">
              <span className="flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M6 2L7.2 4.5L10 4.9L8 6.8L8.4 9.6L6 8.3L3.6 9.6L4 6.8L2 4.9L4.8 4.5L6 2Z" fill="currentColor" />
                </svg>
                {fmt(image.upvotes)}
              </span>
              <span className="flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M6 2V8M6 8L3.5 5.5M6 8L8.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 9.5H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                {fmt(image.downloads)}
              </span>
              {image.model && (
                <span className="ml-auto px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/40 text-[9px]">
                  {image.model}
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
