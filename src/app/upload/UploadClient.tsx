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
  likes?: number;
  uses?: number;
  downloads?: number;
  user_email?: string | null;
  username?: string;
  displayName?: string;
  created_at: string;
};

const initialForm = {
  name: '',
  description: '',
  assetType: 'lora',
  baseModel: 'flux',
  fileUrl: '',
  sourceUrl: '',
  previewUrl: '',
  triggerWords: '',
  tags: '',
  license: '',
  isNsfw: false,
};

export default function UploadClient() {
  const { user, session, setShowAuthModal } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [query, setQuery] = useState('');
  const [showNsfw, setShowNsfw] = useState(false);
  const [assetType, setAssetType] = useState('');
  const [baseModel, setBaseModel] = useState('');
  const [sort, setSort] = useState('recent');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function loadAssets() {
    const params = new URLSearchParams({ q: query, nsfw: String(showNsfw), sort });
    if (assetType) params.set('type', assetType);
    if (baseModel) params.set('baseModel', baseModel);
    const res = await fetch(`/api/model-assets?${params.toString()}`);
    if (res.ok) setAssets((await res.json()).assets || []);
  }

  useEffect(() => {
    const timer = setTimeout(() => { loadAssets().catch(() => {}); }, 200);
    return () => clearTimeout(timer);
  }, [query, showNsfw, assetType, baseModel, sort]);

  function setField(name: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user || !session?.access_token) { setShowAuthModal(true); return; }
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch('/api/model-assets', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Publish failed');
      setForm(initialForm);
      setMessage('Published to the asset board. Tiny Civitai goblin step complete.');
      await loadAssets();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  }

  function generateHref(asset: Asset) {
    const params = new URLSearchParams({ prompt: asset.trigger_words?.join(', ') || asset.name });
    if (asset.asset_type === 'lora') {
      params.set('lora', asset.file_url);
      params.set('loraName', asset.name);
      if (asset.trigger_words?.length) params.set('loraTriggers', asset.trigger_words.slice(0, 8).join(','));
    }
    return `/generate?${params.toString()}`;
  }

  return <main className="lora-explorer-page">
    <section className="lora-hero">
      <span className="eyebrow">Model asset marketplace v1</span>
      <h1>Upload and share LoRAs, checkpoints, workflows, and datasets.</h1>
      <p>Not trying to clone Civitai overnight. We are building the sharp wedge: useful metadata, generation links, comments, and a public board for reusable model assets.</p>
      <div className="lora-search-row asset-board-filters">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search assets, triggers, base models..." />
        <select value={assetType} onChange={e => setAssetType(e.target.value)}>
          <option value="">All types</option>
          <option value="lora">LoRA</option>
          <option value="checkpoint">Checkpoint</option>
          <option value="textual_inversion">Textual inversion</option>
          <option value="vae">VAE</option>
          <option value="workflow">Workflow</option>
          <option value="dataset">Dataset</option>
        </select>
        <select value={baseModel} onChange={e => setBaseModel(e.target.value)}>
          <option value="">All bases</option>
          <option value="flux">Flux</option>
          <option value="sdxl">SDXL</option>
          <option value="sd15">SD 1.5</option>
          <option value="pony">Pony</option>
          <option value="wan">Wan</option>
          <option value="hunyuan">Hunyuan</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)}>
          <option value="recent">Recent</option>
          <option value="popular">Most liked</option>
          <option value="used">Most used</option>
          <option value="downloaded">Most downloaded</option>
        </select>
        <button onClick={() => setShowNsfw(v => !v)}>{showNsfw ? 'NSFW on' : 'SFW only'}</button>
        <Link href="/loras">LoRA explorer</Link>
      </div>
      {message && <p className="studio-message">{message}</p>}
    </section>

    <section className="lora-user-panel">
      <form onSubmit={submit} className="lora-upload-card">
        <span className="eyebrow">Publish asset</span>
        <h2>Share a model thing</h2>
        <input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Name, e.g. Product Photo Lighting LoRA" />
        <div className="asset-form-grid">
          <select value={form.assetType} onChange={e => setField('assetType', e.target.value)}>
            <option value="lora">LoRA</option>
            <option value="checkpoint">Checkpoint</option>
            <option value="textual_inversion">Textual inversion</option>
            <option value="vae">VAE</option>
            <option value="workflow">Workflow</option>
            <option value="dataset">Dataset</option>
            <option value="other">Other</option>
          </select>
          <select value={form.baseModel} onChange={e => setField('baseModel', e.target.value)}>
            <option value="flux">Flux</option>
            <option value="sdxl">SDXL</option>
            <option value="sd15">SD 1.5</option>
            <option value="pony">Pony</option>
            <option value="wan">Wan</option>
            <option value="hunyuan">Hunyuan</option>
            <option value="other">Other</option>
          </select>
        </div>
        <input value={form.fileUrl} onChange={e => setField('fileUrl', e.target.value)} placeholder="File/download URL, IPFS/Arweave URL, or Replicate owner/model slug" />
        <input value={form.sourceUrl} onChange={e => setField('sourceUrl', e.target.value)} placeholder="Source page URL, optional" />
        <input value={form.previewUrl} onChange={e => setField('previewUrl', e.target.value)} placeholder="Preview image URL, optional" />
        <input value={form.triggerWords} onChange={e => setField('triggerWords', e.target.value)} placeholder="Trigger words, comma separated" />
        <input value={form.tags} onChange={e => setField('tags', e.target.value)} placeholder="Tags, comma separated" />
        <input value={form.license} onChange={e => setField('license', e.target.value)} placeholder="License, optional" />
        <textarea value={form.description} onChange={e => setField('description', e.target.value)} placeholder="What it does, best settings, gotchas..." />
        <label><input type="checkbox" checked={form.isNsfw} onChange={e => setField('isNsfw', e.target.checked)} /> NSFW</label>
        <button disabled={busy}>{user ? (busy ? 'Publishing...' : 'Publish asset') : 'Sign in to publish'}</button>
      </form>

      <div className="lora-upload-card">
        <span className="eyebrow">Why this matters</span>
        <h2>Civitai wedge</h2>
        <p>Every asset should become immediately useful: open in Studio, copy triggers, remix prompts, comment, and eventually fork into datasets.</p>
        <p>Next layers after this: asset detail pages, ratings, version history, file hosting, creator profiles, and auto-generated example grids.</p>
      </div>
    </section>

    <section className="lora-explorer-grid">
      {assets.length ? assets.map(asset => <article key={asset.id} className="lora-explorer-card">
        {asset.preview_url ? <img src={asset.preview_url} alt="" loading="lazy" /> : <div className="lora-preview-fallback">{asset.asset_type}</div>}
        <div>
          <span>{asset.base_model} · {asset.asset_type}{asset.is_nsfw ? ' · NSFW' : ''}</span>
          <h2><Link href={`/asset/${asset.id}`}>{asset.name}</Link></h2>
          <p>{asset.description || asset.trigger_words?.join(', ') || 'No notes yet.'}</p>
          <small>{asset.trigger_words?.join(', ') || asset.tags?.join(', ') || asset.file_url}</small>
          <small>{asset.likes || 0} likes · {asset.uses || 0} uses · {asset.downloads || 0} downloads</small>
        </div>
        <div className="lora-card-actions three">
          <Link href={`/asset/${asset.id}`}>Details</Link>
          <Link href={generateHref(asset)}>Use</Link>
          <a href={asset.file_url} target="_blank" rel="noopener noreferrer">File</a>
        </div>
      </article>) : <div className="empty-generations"><b>No assets yet</b><span>Upload the first useful model creature.</span></div>}
    </section>
  </main>;
}
