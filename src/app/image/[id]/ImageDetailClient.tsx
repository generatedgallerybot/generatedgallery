'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { upvoteImage, incrementDownloads, incrementViews } from '@/lib/supabase';
import { toggleUserLike } from '@/lib/user-data';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AddToGalleryModal } from '@/components/AddToGalleryModal';
import { mediaCacheUrl } from '@/lib/media-cache';
import { MODELS, PROMPT_TOPICS, TAGS } from '@/lib/discovery';
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

function cleanModelLabel(raw?: string | null): string | null {
  if (!raw) return null;
  let name = raw.replace(/^urn:air:[^:]+:[^:]+:[^:]+:/, '').replace(/\.safetensors$/i, '');
  name = name.replace(/[_@]v?\d+\w*$/i, '');
  name = name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ');
  return name.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const STOP_WORDS = new Set(['with', 'and', 'the', 'for', 'from', 'into', 'that', 'this', 'very', 'high', 'best', 'realistic', 'beautiful', 'detailed', 'quality', 'masterpiece', 'style', 'image', 'photo', 'portrait']);

function promptTerms(prompt?: string | null): string[] {
  if (!prompt) return [];
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !STOP_WORDS.has(word));
  const counts = new Map<string, number>();
  words.forEach(word => counts.set(word, (counts.get(word) || 0) + 1));
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([word]) => word);
}

export function ImageDetailClient({ initialImage, initialRelated }: { initialImage: ImageType; initialRelated: ImageType[] }) {
  const { user, session, setShowAuthModal } = useAuth();
  const [image, setImage] = useState<ImageType | null>(initialImage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [related, setRelated] = useState<ImageType[]>(initialRelated);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentMessage, setCommentMessage] = useState('');

  useEffect(() => {
    const id = initialImage.id;
    incrementViews(id).catch(() => {});
    const upvoted = JSON.parse(localStorage.getItem('gg_upvoted') || '[]');
    setHasUpvoted(upvoted.includes(id));
    fetch(`/api/comments?targetType=image&targetId=${encodeURIComponent(id)}`)
      .then(res => res.ok ? res.json() : null)
      .then(body => setComments(body?.comments || []))
      .catch(() => {});
  }, [initialImage.id]);

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
        // Also track in user_likes for logged-in users
        if (user) {
          try { await toggleUserLike(user.id, image.id, false); } catch {}
        }
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

  const copyPromptAndLink = async () => {
    if (!image) return;
    const url = window.location.href;
    const text = image.prompt ? `${image.prompt}\n\n${url}` : url;
    await navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) return;
    if (!user || !session?.access_token) { setShowAuthModal(true); return; }
    setCommentBusy(true);
    setCommentMessage('');
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ targetType: 'image', targetId: image.id, body: commentBody }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Comment failed');
      setComments(prev => [...prev, body.comment]);
      setCommentBody('');
      setCommentMessage('Posted.');
    } catch (error) {
      setCommentMessage(error instanceof Error ? error.message : 'Comment failed');
    } finally {
      setCommentBusy(false);
    }
  };

  const shareImage = async () => {
    if (!image) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: image.title || 'Generated Gallery image', text: image.prompt?.slice(0, 140) || 'AI generated image from Generated Gallery', url });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const fmt = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
  const tagSlug = (tag: string) => TAGS.find((item) => item.slug === tag.toLowerCase().replace(/\s+/g, '-') || item.query.toLowerCase() === tag.toLowerCase())?.slug;
  const modelSlug = image?.model ? MODELS.find((item) => image.model?.toLowerCase().includes(item.query.toLowerCase()))?.slug : undefined;
  const promptTopic = image?.prompt ? PROMPT_TOPICS.find((item) => image.prompt?.toLowerCase().includes(item.query.toLowerCase())) : undefined;
  const modelLabel = cleanModelLabel(image?.model);
  const terms = useMemo(() => promptTerms(image?.prompt), [image?.prompt]);
  const nextRelated = related[0];
  const generateLikeHref = image?.prompt ? `/generate?prompt=${encodeURIComponent(image.prompt)}&preset=flux_krea` : '/generate';

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

  const displayUrl = isVideo(image.image_url) ? image.image_url : mediaCacheUrl(image.image_url, 1400);

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
                src={displayUrl}
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
                src={displayUrl}
                alt={image.title || image.prompt || 'AI Generated Image'}
                className={`w-full h-auto transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
              />
            ) : (
              <Image
                src={displayUrl}
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

            <button
              onClick={() => setShowGalleryModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium bg-surface-3 text-white/60 border border-white/[0.06] hover:text-white hover:bg-surface-4 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
                <path d="M7 5V9M5 7H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              Add to gallery
            </button>

            <Link
              href={generateLikeHref}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold bg-[#e8d5b7] text-[#090909] hover:bg-[#d8c5a6] transition-all"
            >
              Generate like this
            </Link>

            <button
              onClick={copyPromptAndLink}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium bg-surface-3 text-white/60 border border-white/[0.06] hover:text-white hover:bg-surface-4 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="3" y="3" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5 1.8H11V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {copiedLink ? 'Copied' : 'Prompt + link'}
            </button>

            {nextRelated && (
              <Link
                href={`/image/${nextRelated.id}`}
                prefetch={false}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/15 transition-all"
              >
                More like this
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            )}

            <button
              onClick={shareImage}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium bg-surface-3 text-white/60 border border-white/[0.06] hover:text-white hover:bg-surface-4 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5.5 8.5L8.5 10.2M8.5 3.8L5.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="4" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="10" cy="3" r="1.8" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="10" cy="11" r="1.8" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              Share
            </button>
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
              <Link href={generateLikeHref} className="mt-3 inline-flex items-center justify-center rounded-full bg-accent/15 text-accent px-4 py-2 text-[12px] font-semibold hover:bg-accent/25 transition-colors">
                Open this prompt in Studio
              </Link>
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
                {modelSlug ? (
                  <Link href={`/model/${modelSlug}`} className="text-sm text-accent/70 hover:text-accent">{modelLabel || image.model}</Link>
                ) : (
                  <p className="text-sm text-white/60">{modelLabel || image.model}</p>
                )}
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
                <Link href={`/style/${image.category.toLowerCase().replace(/\s+/g, '-')}`} className="text-sm text-accent/70 hover:text-accent">{image.category}</Link>
              </div>
            )}
          </div>

          {/* Tags */}
          {image.tags && image.tags.length > 0 && (
            <div>
              <h3 className="text-[11px] uppercase tracking-widest text-white/20 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {image.tags.map((tag, i) => {
                  const slug = tagSlug(tag);
                  const className = "px-3 py-1 rounded-full bg-white/[0.04] text-white/35 text-[12px] border border-white/[0.04] hover:text-accent hover:border-accent/20";
                  return slug ? (
                    <Link key={i} href={`/tag/${slug}`} className={className}>{tag}</Link>
                  ) : (
                    <span key={i} className="px-3 py-1 rounded-full bg-white/[0.04] text-white/30 text-[12px] border border-white/[0.04]">{tag}</span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Discovery links */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
            <h3 className="text-[11px] uppercase tracking-widest text-white/20 mb-3">Keep exploring</h3>
            <div className="flex flex-wrap gap-2 text-[12px]">
              {promptTopic && <Link href={`/prompts/${promptTopic.slug}`} className="rounded-full bg-accent/10 text-accent/80 px-3 py-1 hover:text-accent">{promptTopic.name} prompts</Link>}
              {modelSlug && <Link href={`/model/${modelSlug}`} className="rounded-full bg-white/[0.05] text-white/45 px-3 py-1 hover:text-accent">More from {modelLabel || 'this model'}</Link>}
              {image.category && <Link href={`/style/${image.category.toLowerCase().replace(/\s+/g, '-')}`} className="rounded-full bg-white/[0.05] text-white/45 px-3 py-1 hover:text-accent">More {image.category}</Link>}
              {terms.slice(0, 4).map(term => (
                <Link key={term} href={`/?q=${encodeURIComponent(term)}`} className="rounded-full bg-white/[0.05] text-white/45 px-3 py-1 hover:text-accent">{term}</Link>
              ))}
              <Link href="/shuffle" className="rounded-full bg-white/[0.05] text-white/45 px-3 py-1 hover:text-accent">Shuffle rabbit hole</Link>
            </div>
          </div>

          {terms.length > 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-surface-2 p-4">
              <h3 className="text-[11px] uppercase tracking-widest text-white/20 mb-3">Prompt ingredients</h3>
              <div className="grid grid-cols-2 gap-2">
                {terms.map(term => (
                  <Link
                    key={term}
                    href={`/?q=${encodeURIComponent(term)}`}
                    className="rounded-xl border border-white/[0.04] bg-white/[0.03] px-3 py-2 text-[12px] text-white/45 hover:text-accent hover:border-accent/20 transition-colors"
                  >
                    {term}
                  </Link>
                ))}
              </div>
            </div>
          )}


          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-[11px] uppercase tracking-widest text-white/20">Comments</h3>
                <p className="mt-1 text-[12px] text-white/30">Tiny social layer v1. Be useful, not cursed.</p>
              </div>
              {!user && <button onClick={() => setShowAuthModal(true)} className="rounded-full bg-accent/15 text-accent px-3 py-1 text-[12px] font-semibold">Sign in</button>}
            </div>
            <div className="space-y-3 mb-4 max-h-80 overflow-auto">
              {comments.length ? comments.map(comment => (
                <div key={comment.id} className="rounded-xl border border-white/[0.05] bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {comment.profile?.isPrivate || !comment.username ? <span className="text-[12px] text-white/55">@{comment.displayName || comment.username || 'gallery-creature'}</span> : <Link href={`/u/${comment.username}`} className="text-[12px] text-white/55 hover:text-accent">@{comment.displayName || comment.username}</Link> }
                    <span className="text-[11px] text-white/20">{new Date(comment.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-white/55 leading-6">{comment.body}</p>
                </div>
              )) : <p className="text-sm text-white/30">No comments yet. Be the first raccoon in the dumpster.</p>}
            </div>
            <form onSubmit={submitComment} className="space-y-3">
              <textarea
                value={commentBody}
                onChange={e => setCommentBody(e.target.value)}
                placeholder={user ? 'Add a comment...' : 'Sign in to comment'}
                disabled={!user || commentBusy}
                maxLength={1000}
                className="w-full min-h-[88px] rounded-xl bg-black/25 border border-white/[0.08] px-3 py-3 text-sm text-white/70 placeholder:text-white/25 focus:outline-none focus:border-accent/30"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-white/30">{commentMessage}</span>
                <button disabled={commentBusy || !commentBody.trim()} className="rounded-full bg-accent text-[#15110a] px-4 py-2 text-[12px] font-bold disabled:opacity-40">{commentBusy ? 'Posting...' : 'Post comment'}</button>
              </div>
            </form>
          </div>

          {/* Date */}
          <div className="pt-4 border-t border-white/[0.04] text-[12px] text-white/15">
            Added {new Date(image.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {showGalleryModal && image && (
        <AddToGalleryModal imageId={image.id} onClose={() => setShowGalleryModal(false)} />
      )}

      {/* Related Images */}
      {related.length > 0 && (
        <div className="mt-16">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-white/20 mb-2">Rabbit hole</p>
              <h2 className="font-display text-2xl font-semibold text-white/85">More like this</h2>
            </div>
            {nextRelated && (
              <Link href={`/image/${nextRelated.id}`} prefetch={false} className="hidden sm:inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-[13px] text-accent hover:bg-accent/15">
                Next similar
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {related.map((rel) => (
              <Link
                key={rel.id}
                href={`/image/${rel.id}`}
                prefetch={false}
                className="group relative bg-surface-2 rounded-xl overflow-hidden border border-white/[0.04] hover:border-white/[0.08] transition-all"
              >
                <Image
                  src={mediaCacheUrl(rel.thumbnail_url || rel.image_url, 480)}
                  alt={rel.title || rel.prompt || 'Related image'}
                  width={240}
                  height={240}
                  className="w-full aspect-square object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  loading="lazy"
                  unoptimized
                />
                <div className="absolute inset-x-0 bottom-0 hidden md:block translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <p className="text-[11px] text-white/70 line-clamp-2">{rel.prompt || rel.title || rel.category || 'AI image'}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
