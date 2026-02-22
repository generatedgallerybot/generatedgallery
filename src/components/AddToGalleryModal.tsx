'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserGalleries, createGallery, addToGallery, type Gallery } from '@/lib/user-data';

interface Props {
  imageId: string;
  onClose: () => void;
}

export function AddToGalleryModal({ imageId, onClose }: Props) {
  const { user, setShowAuthModal } = useAuth();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    getUserGalleries(user.id).then(data => {
      setGalleries(data);
      setLoading(false);
    });
  }, [user]);

  if (!user) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-surface-2 border border-white/[0.08] rounded-2xl p-8 max-w-sm mx-4 text-center space-y-4" onClick={e => e.stopPropagation()}>
          <p className="text-white/50 text-sm">Sign in to save images to galleries.</p>
          <button onClick={() => { onClose(); setShowAuthModal(true); }} className="px-5 py-2 rounded-xl text-[13px] font-medium text-[#1a1a1a] bg-[#e8d5b7] hover:bg-[#d4c2a5] transition-all">
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const handleAdd = async (galleryId: string) => {
    await addToGallery(galleryId, imageId);
    setAdded(prev => new Set(prev).add(galleryId));
  };

  const handleCreate = async () => {
    if (!newName.trim() || !user) return;
    setCreating(true);
    try {
      const g = await createGallery(user.id, newName.trim());
      await addToGallery(g.id, imageId);
      setGalleries(prev => [g, ...prev]);
      setAdded(prev => new Set(prev).add(g.id));
      setNewName('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-2 border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-display font-semibold text-white">Add to gallery</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* Create new */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New gallery name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-[12px] placeholder:text-white/20 focus:outline-none focus:border-accent/30"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="px-3 py-2 rounded-lg text-[12px] font-medium text-[#1a1a1a] bg-[#e8d5b7] hover:bg-[#d4c2a5] disabled:opacity-40 transition-all"
          >
            {creating ? '...' : 'Create'}
          </button>
        </div>

        {/* Gallery list */}
        <div className="max-h-60 overflow-y-auto space-y-1">
          {loading ? (
            <p className="text-white/20 text-[12px] text-center py-4">Loading...</p>
          ) : galleries.length === 0 ? (
            <p className="text-white/20 text-[12px] text-center py-4">No galleries yet. Create one above.</p>
          ) : (
            galleries.map(g => (
              <button
                key={g.id}
                onClick={() => handleAdd(g.id)}
                disabled={added.has(g.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left hover:bg-white/[0.04] transition-colors disabled:opacity-50"
              >
                <span className="text-[13px] text-white/70 truncate">{g.name}</span>
                {added.has(g.id) ? (
                  <span className="text-[11px] text-green-400 flex-shrink-0">Added</span>
                ) : (
                  <span className="text-[11px] text-white/20 flex-shrink-0">+ Add</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
