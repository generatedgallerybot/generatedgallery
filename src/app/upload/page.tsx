'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const categories = [
  'portraits', 'landscapes', 'fantasy', 'sci-fi', 'anime', 'abstract',
  'photorealistic', 'architecture', 'animals', 'digital-art', '3d-render',
  'food', 'fashion', 'interior-design', 'vehicles', 'product-photography',
];

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', prompt: '', negativePrompt: '',
    model: '', category: '', tags: '', isNsfw: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('image/')) handleFile(f);
  };

  const update = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Select an image first.'); return; }
    setLoading(true);
    setError(null);
    try {
      await new Promise(r => setTimeout(r, 2000));
      setSuccess(true);
      setTimeout(() => router.push('/'), 3000);
    } catch {
      setError('Upload failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="pt-28 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 10L9 14L15 6" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h2 className="font-display text-xl font-bold text-white mb-2">Uploaded</h2>
        <p className="text-sm text-white/35">Redirecting to gallery...</p>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-12 px-6 lg:px-10 max-w-3xl mx-auto">
      <div className="mb-10">
        <h1 className="font-display text-3xl font-bold text-white tracking-tight mb-2">Submit an image</h1>
        <p className="text-sm text-white/35">Share your AI-generated artwork with the community.</p>
      </div>

      <form onSubmit={submit} className="space-y-8">
        {/* File upload */}
        {!file ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border border-dashed border-white/[0.08] rounded-2xl p-12 text-center hover:border-white/[0.15] transition-colors cursor-pointer"
          >
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" id="file-input" />
            <label htmlFor="file-input" className="cursor-pointer">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mx-auto mb-4 text-white/20">
                <path d="M16 6V22M16 6L10 12M16 6L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 26H26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className="text-sm text-white/40 mb-1">Drop image here or click to browse</p>
              <p className="text-xs text-white/20">JPG, PNG, GIF up to 10MB</p>
            </label>
          </div>
        ) : (
          <div className="relative bg-surface-2 rounded-2xl p-4 border border-white/[0.04]">
            <button
              type="button"
              onClick={() => { setFile(null); if (preview) URL.revokeObjectURL(preview); setPreview(null); }}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.1] transition-all z-10"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
            <div className="flex items-start gap-4">
              {preview && <Image src={preview} alt="Preview" width={120} height={120} className="w-24 h-24 object-cover rounded-xl" />}
              <div>
                <p className="text-sm text-white/70">{file.name}</p>
                <p className="text-xs text-white/25">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          </div>
        )}

        {/* Fields */}
        <div className="grid md:grid-cols-2 gap-5">
          <Field label="Title" name="title" value={form.title} onChange={update} placeholder="Give it a name" />
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-widest text-white/25">Category</label>
            <select
              name="category"
              value={form.category}
              onChange={update}
              className="w-full px-4 py-3 bg-surface-2 border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-white/[0.12] transition-colors"
            >
              <option value="">Select</option>
              {categories.map(c => (
                <option key={c} value={c}>{c.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
              ))}
            </select>
          </div>
        </div>

        <FieldArea label="Description" name="description" value={form.description} onChange={update} placeholder="Describe the image" rows={2} />
        <FieldArea label="Prompt" name="prompt" value={form.prompt} onChange={update} placeholder="The prompt used to generate this image" rows={3} required />
        <FieldArea label="Negative Prompt" name="negativePrompt" value={form.negativePrompt} onChange={update} placeholder="Negative prompt if used" rows={2} />

        <div className="grid md:grid-cols-2 gap-5">
          <Field label="Model" name="model" value={form.model} onChange={update} placeholder="e.g. Flux, SDXL, Midjourney" />
          <Field label="Tags" name="tags" value={form.tags} onChange={update} placeholder="Comma separated" />
        </div>

        {/* NSFW */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" name="isNsfw" checked={form.isNsfw} onChange={update} className="sr-only peer" />
          <div className="relative w-9 h-5 rounded-full bg-white/[0.06] peer-checked:bg-red-500/60 transition-colors">
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.isNsfw ? 'left-[18px]' : 'left-0.5'}`} />
          </div>
          <span className="text-[13px] text-white/40">Contains NSFW content</span>
        </label>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !file}
          className="w-full py-3 rounded-xl text-[14px] font-medium bg-white text-surface-0 hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Uploading...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, name, value, onChange, placeholder, required }: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] uppercase tracking-widest text-white/25">{label}</label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 bg-surface-2 border border-white/[0.06] rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/[0.12] transition-colors"
      />
    </div>
  );
}

function FieldArea({ label, name, value, onChange, placeholder, rows = 3, required }: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string; rows?: number; required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] uppercase tracking-widest text-white/25">{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className="w-full px-4 py-3 bg-surface-2 border border-white/[0.06] rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/[0.12] transition-colors resize-none"
      />
    </div>
  );
}
