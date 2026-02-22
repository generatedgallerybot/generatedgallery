'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getUserLikedImages } from '@/lib/user-data';
import { ImageGrid } from '@/components/ImageGrid';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { Image } from '@/types';

export default function LikesPage() {
  const { user, loading: authLoading, setShowAuthModal } = useAuth();
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    getUserLikedImages(user.id).then(data => {
      setImages(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading || loading) return <div className="pt-24"><LoadingSpinner /></div>;

  if (!user) {
    return (
      <div className="pt-24 text-center max-w-md mx-auto px-6">
        <h1 className="font-display text-2xl font-bold text-white mb-4">My Likes</h1>
        <p className="text-white/40 text-sm mb-6">Sign in to keep track of images you like.</p>
        <button
          onClick={() => setShowAuthModal(true)}
          className="px-6 py-2.5 rounded-xl text-[13px] font-medium text-[#1a1a1a] bg-[#e8d5b7] hover:bg-[#d4c2a5] transition-all"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-12 px-6 lg:px-10 max-w-[1800px] mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 text-[13px] text-white/30 hover:text-white/60 transition-colors mb-6">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Back
      </Link>
      <h1 className="font-display text-3xl font-bold text-white mb-2">My Likes</h1>
      <p className="text-white/40 text-sm mb-8">{images.length} liked image{images.length !== 1 ? 's' : ''}</p>

      {images.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-white/30 text-sm">You haven't liked any images yet.</p>
          <Link href="/" className="inline-block mt-4 text-[13px] text-accent/70 hover:text-accent transition-colors">Browse images</Link>
        </div>
      ) : (
        <ImageGrid images={images} />
      )}
    </div>
  );
}
