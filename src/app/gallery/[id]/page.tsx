'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getGallery, getGalleryImages, updateGallery, removeFromGallery, type Gallery } from '@/lib/user-data';
import { ImageGrid } from '@/components/ImageGrid';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { Image } from '@/types';

export default function GalleryDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const isOwner = user && gallery && user.id === gallery.user_id;

  useEffect(() => {
    if (!params.id) return;
    loadGallery(params.id as string);
  }, [params.id]);

  const loadGallery = async (id: string) => {
    try {
      const g = await getGallery(id);
      if (!g) { setLoading(false); return; }
      setGallery(g);
      setEditName(g.name);
      setEditDesc(g.description || '');
      const imgs = await getGalleryImages(id);
      setImages(imgs);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!gallery) return;
    await updateGallery(gallery.id, { name: editName, description: editDesc });
    setGallery({ ...gallery, name: editName, description: editDesc });
    setEditing(false);
  };

  if (loading) return <div className="pt-24"><LoadingSpinner /></div>;

  if (!gallery) {
    return (
      <div className="pt-24 text-center">
        <p className="text-white/40 mb-4">Gallery not found.</p>
        <Link href="/" className="text-[13px] text-white/30 hover:text-white/60">&larr; Back</Link>
      </div>
    );
  }

  if (!gallery.is_public && !isOwner) {
    return (
      <div className="pt-24 text-center">
        <p className="text-white/40 mb-4">This gallery is private.</p>
        <Link href="/" className="text-[13px] text-white/30 hover:text-white/60">&larr; Back</Link>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-12 px-6 lg:px-10 max-w-[1800px] mx-auto">
      <Link href={isOwner ? '/galleries' : '/'} className="inline-flex items-center gap-2 text-[13px] text-white/30 hover:text-white/60 transition-colors mb-6">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Back
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          {editing ? (
            <div className="space-y-3">
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-white text-lg font-display font-bold focus:outline-none focus:border-accent/30"
              />
              <textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                rows={2}
                className="block w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-white/60 text-sm focus:outline-none focus:border-accent/30 resize-none"
              />
              <div className="flex gap-2">
                <button onClick={handleSave} className="px-4 py-1.5 rounded-lg text-[12px] font-medium text-[#1a1a1a] bg-[#e8d5b7] hover:bg-[#d4c2a5] transition-all">Save</button>
                <button onClick={() => setEditing(false)} className="px-4 py-1.5 rounded-lg text-[12px] text-white/40 bg-white/[0.06] hover:text-white/60 transition-all">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="font-display text-3xl font-bold text-white mb-1">{gallery.name}</h1>
              {gallery.description && <p className="text-white/40 text-sm mb-2">{gallery.description}</p>}
              <p className="text-white/25 text-[12px]">
                {images.length} image{images.length !== 1 ? 's' : ''}
                {' '}&middot; {gallery.is_public ? 'Public' : 'Private'}
              </p>
            </>
          )}
        </div>
        {isOwner && !editing && (
          <button onClick={() => setEditing(true)} className="px-4 py-1.5 rounded-lg text-[12px] text-white/40 bg-white/[0.06] border border-white/[0.08] hover:text-white/60 transition-all">
            Edit
          </button>
        )}
      </div>

      {images.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-white/30 text-sm">This gallery is empty.</p>
        </div>
      ) : (
        <ImageGrid images={images} />
      )}
    </div>
  );
}
