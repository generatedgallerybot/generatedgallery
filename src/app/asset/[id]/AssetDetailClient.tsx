'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

type Asset = {
  id: string;
  name: string;
  description?: string | null;
  asset_type: string;
  base_model: string;
  file_url: string;
  source_url?: string | null;
  license?: string | null;
  trigger_words?: string[];
  tags?: string[];
  preview_url?: string | null;
  is_nsfw?: boolean;
  user_email?: string | null;
  created_at: string;
};

type Comment = { id: string; body: string; userEmail?: string | null; createdAt: string };

export default function AssetDetailClient({ id }: { id: string }) {
  const { user, session, setShowAuthModal } = useAuth();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/model-assets?id=${encodeURIComponent(id)}&nsfw=true`).then(r => r.ok ? r.json() : null).then(body => setAsset(body?.asset || null)).catch(() => {});
    fetch(`/api/comments?targetType=model_asset&targetId=${encodeURIComponent(id)}`).then(r => r.ok ? r.json() : null).then(body => setComments(body?.comments || [])).catch(() => {});
  }, [id]);

  function generateHref() {
    if (!asset) return '/generate';
    const params = new URLSearchParams({ prompt: asset.trigger_words?.join(', ') || asset.name });
    if (asset.asset_type === 'lora') {
      params.set('lora', asset.file_url);
      params.set('loraName', asset.name);
      if (asset.trigger_words?.length) params.set('loraTriggers', asset.trigger_words.slice(0, 8).join(','));
    }
    return `/generate?${params.toString()}`;
  }

  async function submitComment(e: FormEvent) {
    e.preventDefault();
    if (!user || !session?.access_token) { setShowAuthModal(true); return; }
    setBusy(true); setMessage('');
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ targetType: 'model_asset', targetId: id, body: commentBody }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Comment failed');
      setComments(prev => [...prev, body.comment]);
      setCommentBody('');
      setMessage('Posted.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Comment failed'); }
    finally { setBusy(false); }
  }

  if (!asset) return <main className="lora-explorer-page"><div className="empty-generations"><b>Loading asset...</b><span>Summoning model goblin.</span></div></main>;

  return <main className="lora-explorer-page">
    <Link href="/upload" className="text-[13px] text-white/35 hover:text-accent">← Back to asset board</Link>
    <section className="lora-hero asset-detail-hero">
      <div>
        <span className="eyebrow">{asset.base_model} · {asset.asset_type}{asset.is_nsfw ? ' · NSFW' : ''}</span>
        <h1>{asset.name}</h1>
        <p>{asset.description || 'No description yet. Mysterious artifact. Possibly powerful. Possibly cursed.'}</p>
        <div className="lora-search-row asset-actions">
          <Link href={generateHref()}>Use in Studio</Link>
          <a href={asset.file_url} target="_blank" rel="noopener noreferrer">Open file</a>
          {asset.source_url && <a href={asset.source_url} target="_blank" rel="noopener noreferrer">Source</a>}
        </div>
      </div>
      {asset.preview_url ? <img src={asset.preview_url} alt="" loading="lazy" /> : <div className="lora-preview-fallback">{asset.asset_type}</div>}
    </section>

    <section className="lora-user-panel">
      <div className="lora-upload-card">
        <span className="eyebrow">Metadata</span>
        <h2>Recipe card</h2>
        <p><b>Trigger words:</b> {asset.trigger_words?.join(', ') || 'none listed'}</p>
        <p><b>Tags:</b> {asset.tags?.join(', ') || 'none listed'}</p>
        <p><b>License:</b> {asset.license || 'not specified'}</p>
        <p><b>Shared by:</b> {asset.user_email || 'gallery creature'}</p>
      </div>

      <div className="lora-upload-card">
        <span className="eyebrow">Comments</span>
        <h2>Notes from the pit</h2>
        <div className="space-y-3">
          {comments.length ? comments.map(comment => <div className="saved-lora-row" key={comment.id}><b>{comment.userEmail || 'gallery creature'}</b><span>{comment.body}</span></div>) : <p>No comments yet.</p>}
        </div>
        <form onSubmit={submitComment} className="space-y-3">
          <textarea value={commentBody} onChange={e => setCommentBody(e.target.value)} placeholder={user ? 'Add settings, examples, warnings...' : 'Sign in to comment'} disabled={!user || busy} />
          <button disabled={busy || !commentBody.trim()}>{busy ? 'Posting...' : 'Post comment'}</button>
          {message && <p className="studio-message">{message}</p>}
        </form>
      </div>
    </section>
  </main>;
}
