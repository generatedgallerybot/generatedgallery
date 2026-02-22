'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getImage, upvoteImage, incrementDownloads, incrementViews } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { Image as ImageType } from '@/types';

function isVideo(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.includes('/video');
}

function isGif(url: string): boolean {
  if (!url) return false;
  return url.toLowerCase().endsWith('.gif');
}

export default function ImageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [image, setImage] = useState<ImageType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (params.id) loadImage(params.id as string);
  }, [params.id]);

  const loadImage = async (id: string) => {
    try {
      setLoading(true);
      const data = await getImage(id);
      setImage(data);
      await incrementViews(id);
      const upvoted = JSON.parse(localStorage.getItem('gg_upvoted') || '[]');
      setHasUpvoted(upvoted.includes(id));
    } catch {
      setError('Image not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (!image || hasUpvoted) return;
    try {
      const ok = await upvoteImage(image.id, '0.0.0.0');
      if (ok) {
        setImage(prev => prev ? { ...prev, upvotes: prev.upvotes + 1 } : null);
        setHasUpvoted(true);
        const upvoted = JSON.parse(localStorage.getItem('gg_upvoted') || '[]');
        upvoted.push(image.id);
        localStorage.setItem('gg_upvoted', JSON.stringify(upvoted));
      }
    } catch {}
  };

  const handleDownload = async () => {
    if (!image) return;
    await incrementDownloads(image.id);
    setImage(prev => prev ? { ...prev, downloads: prev.downloads + 1 } : null);
    const a = document.createElement('a');
    a.href = image.image_url;
    a.download = `generated-${image.id}.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyPrompt = () => {
    if (!image?.prompt) return;
    navigator.clipboard.writeText(image.prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const fmt = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);

  if (loading) return <div className="pt-24"><LoadingSpinner /></div>;

  if (error || !image) {
    return (
      <div className="pt-24 text-center">
        <p className="text-white/40 mb-4">{error}</p>
        <Link href="/" className="text-[13px] text-white/30 hover:text-white/60 transition-colors">
          &larr; Back to gallery
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-12 px-6 lg:px-10 max-w-7xl mx-auto">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-[13px] text-white/30 hover:text-white/60 transition-colors mb-8"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </Link>

      <div className="grid lg:grid-cols-[1fr,400px] gap-10">
        {/* Image */}
        <div className="space-y-4">
          <div className="relative bg-surface-2 rounded-2xl overflow-hidden">
            {isVideo(image.image_url) ? (
              <video
                src={image.image_url}
                autoPlay
                muted
                loop
                playsInline
                controls
                className={`w-full h-auto transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoadedData={() => setImageLoaded(true)}
              />
            ) : isGif(image.image_url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.image_url}
                alt={image.title || image.prompt || 'AI Generated Image'}
                className={`w-full h-auto transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
              />
            ) : (
              <Image
                src={image.image_url}
                alt={image.title || image.prompt || 'AI Generated Image'}
                width={image.width || 800}
                height={image.height || 800}
                className={`w-full h-auto transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
                unoptimized
              />
            )}
            {!imageLoaded && <div className="absolute inset-0 img-loading" style={{ minHeight: '400px' }} />}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleUpvote}
              disabled={hasUpvoted}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
                hasUpvoted
                  ? 'bg-accent/10 text-accent border border-accent/20'
                  : 'bg-surface-3 text-white/60 border border-white/[0.06] hover:text-white hover:bg-surface-4'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill={hasUpvoted ? 'currentColor' : 'none'}>
                <path d="M7 2L8.5 5H11.5L9 7L10 10.5L7 8.5L4 10.5L5 7L2.5 5H5.5L7 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
              {fmt(image.upvotes)}
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium bg-white text-surface-0 hover:bg-white/90 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2V9M7 9L4.5 6.5M7 9L9.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 11H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Download
            </button>

            {image.source_url && (
              <a
                href={image.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium bg-surface-3 text-white/60 border border-white/[0.06] hover:text-white hover:bg-surface-4 transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M10 7.5V11H3V4H6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 2H12V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 2L7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                Source
              </a>
            )}
          </div>
        </div>

        {/* Details sidebar */}
        <div className="space-y-8">
          {image.title && (
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              {image.title}
            </h1>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 text-[13px] text-white/30">
            <span>{fmt(image.upvotes)} stars</span>
            <span>{fmt(image.downloads)} downloads</span>
            <span>{fmt(image.views)} views</span>
          </div>

          {/* Description */}
          {image.description && (
            <div>
              <h3 className="text-[11px] uppercase tracking-widest text-white/20 mb-2">Description</h3>
              <p className="text-sm text-white/50 leading-relaxed">{image.description}</p>
            </div>
          )}

          {/* Prompt */}
          {image.prompt && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] uppercase tracking-widest text-white/20">Prompt</h3>
                <button
                  onClick={copyPrompt}
                  className="text-[11px] text-white/20 hover:text-white/50 transition-colors"
                >
                  {copiedPrompt ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-sm text-white/40 leading-relaxed bg-surface-2 rounded-xl p-4 border border-white/[0.04]">
                {image.prompt}
              </p>
            </div>
          )}

          {/* Negative Prompt */}
          {image.negative_prompt && (
            <div>
              <h3 className="text-[11px] uppercase tracking-widest text-white/20 mb-2">Negative Prompt</h3>
              <p className="text-sm text-white/30 leading-relaxed bg-surface-2 rounded-xl p-4 border border-white/[0.04]">
                {image.negative_prompt}
              </p>
            </div>
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-4">
            {image.model && (
              <div>
                <h4 className="text-[11px] uppercase tracking-widest text-white/15 mb-1">Model</h4>
                <p className="text-sm text-white/60">{image.model}</p>
              </div>
            )}
            {image.width && image.height && (
              <div>
                <h4 className="text-[11px] uppercase tracking-widest text-white/15 mb-1">Size</h4>
                <p className="text-sm text-white/60">{image.width} &times; {image.height}</p>
              </div>
            )}
            {image.source_site && (
              <div>
                <h4 className="text-[11px] uppercase tracking-widest text-white/15 mb-1">Source</h4>
                <p className="text-sm text-white/60">{image.source_site}</p>
              </div>
            )}
            {image.category && (
              <div>
                <h4 className="text-[11px] uppercase tracking-widest text-white/15 mb-1">Category</h4>
                <p className="text-sm text-white/60">{image.category}</p>
              </div>
            )}
          </div>

          {/* Tags */}
          {image.tags && image.tags.length > 0 && (
            <div>
              <h3 className="text-[11px] uppercase tracking-widest text-white/20 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {image.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full bg-white/[0.04] text-white/30 text-[12px] border border-white/[0.04]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Date */}
          <div className="pt-4 border-t border-white/[0.04] text-[12px] text-white/15">
            Added {new Date(image.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  );
}
