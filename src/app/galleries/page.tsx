'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getUserGalleries, createGallery, deleteGallery, updateGallery, getGalleryImages, type Gallery } from '@/lib/user-data';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function GalleriesPage() {
  const { user, loading: authLoading, setShowAuthModal } = useAuth();
  const [galleries, setGalleries] = useState<(Gallery & { image_count: number; cover_url: string | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const loadGalleries = async () => {
    if (!user) return;
    const data = await getUserGalleries(user.id);
    // Get cover image and count for each gallery
    const enriched = await Promise.all(data.map(async (g) => {
      const imgs = await getGalleryImages(g.id);
      return {
        ...g,
        image_count: imgs.length,
        cover_url: imgs[0]?.thumbnail_url || imgs[0]?.image_url || null,
      };
    }));
    setGalleries(enriched);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    loadGalleries();
  }, [user, authLoading]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;
    setCreating(true);
    try {
      await createGallery(user.id, newName.trim(), newDesc.trim());
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      await loadGalleries();
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this gallery?')) return;
    await deleteGallery(id);
    setGalleries(prev => prev.filter(g => g.id !== id));
  };

  const handleTogglePublic = async (g: Gallery) => {
    await updateGallery(g.id, { is_public: !g.is_public });
    setGalleries(prev => prev.map(gal => gal.id === g.id ? { ...gal, is_public: !gal.is_public } : gal));
  };

  if (authLoading || loading) return <div className="pt-24"><LoadingSpinner /></div>;

  if (!user) {
    return (
      <div className="pt-24 text-center max-w-md mx-auto px-6">
        <h1 className="font-display text-2xl font-bold text-white mb-4">My Galleries</h1>
        <p className="text-white/40 text-sm mb-6">Sign in to create and manage image galleries.</p>
        <button onClick={() => setShowAuthModal(true)} className="px-6 py-2.5 rounded-xl text-[13px] font-medium text-[#1a1a1a] bg-[#e8d5b7] hover:bg-[#d4c2a5] transition-all">
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

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">My Galleries</h1>
          <p className="text-white/40 text-sm">{galleries.length} gallery{galleries.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2 rounded-xl text-[13px] font-medium text-[#1a1a1a] bg-[#e8d5b7] hover:bg-[#d4c2a5] transition-all"
        >
          + New gallery
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-surface-2 border border-white/[0.08] rounded-2xl p-8 max-w-sm w-full mx-4 space-y-5" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-display font-semibold text-white">New Gallery</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                placeholder="Gallery name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] placeholder:text-white/25 focus:outline-none focus:border-accent/30"
              />
              <textarea
                placeholder="Description (optional)"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] placeholder:text-white/25 focus:outline-none focus:border-accent/30 resize-none"
              />
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-[13px] text-white/40 bg-white/[0.06] border border-white/[0.08] hover:text-white/60 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="px-5 py-2 rounded-xl text-[13px] font-medium text-[#1a1a1a] bg-[#e8d5b7] hover:bg-[#d4c2a5] disabled:opacity-50 transition-all">
                  {creating ? '...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {galleries.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-white/30 text-sm">No galleries yet. Create one to start collecting images.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {galleries.map(g => (
            <div key={g.id} className="bg-surface-2 border border-white/[0.04] rounded-2xl overflow-hidden hover:border-white/[0.08] transition-all group">
              <Link href={`/gallery/${g.id}`}>
                <div className="aspect-[16/9] bg-surface-3 relative overflow-hidden">
                  {g.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/10 text-4xl">🖼</div>
                  )}
                </div>
              </Link>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <Link href={`/gallery/${g.id}`} className="font-display text-sm font-medium text-white hover:text-accent transition-colors truncate">
                    {g.name}
                  </Link>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleTogglePublic(g)}
                      className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
                      title={g.is_public ? 'Public' : 'Private'}
                    >
                      {g.is_public ? '🌐' : '🔒'}
                    </button>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="text-[10px] text-white/20 hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <p className="text-[12px] text-white/30">{g.image_count} image{g.image_count !== 1 ? 's' : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
