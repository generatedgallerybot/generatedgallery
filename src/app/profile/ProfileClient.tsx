'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileClient() {
  const { user, session, loading, setShowAuthModal } = useAuth();
  const [form, setForm] = useState({ username: '', displayName: '', bio: '', websiteUrl: '', avatarUrl: '', isPrivate: false });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session?.access_token) return;
    fetch('/api/profile', { headers: { authorization: `Bearer ${session.access_token}` } })
      .then(res => res.ok ? res.json() : null)
      .then(body => {
        const profile = body?.profile;
        if (profile) setForm({ username: profile.username || '', displayName: profile.displayName || '', bio: profile.bio || '', websiteUrl: profile.websiteUrl || '', avatarUrl: profile.avatarUrl || '', isPrivate: Boolean(profile.isPrivate) });
      })
      .catch(() => {});
  }, [session?.access_token]);

  function setField(name: string, value: string | boolean) { setForm(prev => ({ ...prev, [name]: value })); }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!session?.access_token) { setShowAuthModal(true); return; }
    setBusy(true); setMessage('');
    try {
      const res = await fetch('/api/profile', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(form) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not save profile');
      setForm(prev => ({ ...prev, ...body.profile }));
      setMessage('Profile saved. PII stays hidden, the goblin mask remains on.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save profile'); }
    finally { setBusy(false); }
  }

  if (loading) return <main className="lora-explorer-page"><div className="empty-generations"><b>Loading...</b></div></main>;
  if (!user) return <main className="lora-explorer-page"><section className="lora-hero"><span className="eyebrow">Profile</span><h1>Sign in to claim your gallery creature name.</h1><p>Your email is never shown publicly. Comments and assets use a changeable anonymous handle.</p><button onClick={() => setShowAuthModal(true)}>Sign in</button></section></main>;

  return <main className="lora-explorer-page">
    <section className="lora-hero">
      <span className="eyebrow">Private account, public mask</span>
      <h1>Your profile</h1>
      <p>Pick a changeable anonymous username. Generated Gallery will show this instead of email on comments, assets, and social surfaces.</p>
      {message && <p className="studio-message">{message}</p>}
    </section>
    <section className="lora-user-panel profile-panel">
      <form onSubmit={save} className="lora-upload-card">
        <span className="eyebrow">Public profile</span>
        <h2>@{form.username || 'gallery-creature'}</h2>
        <input value={form.username} onChange={e => setField('username', e.target.value)} placeholder="username, e.g. neon-raccoon" />
        <input value={form.displayName} onChange={e => setField('displayName', e.target.value)} placeholder="Display name" />
        <input value={form.avatarUrl} onChange={e => setField('avatarUrl', e.target.value)} placeholder="Avatar URL, optional" />
        <input value={form.websiteUrl} onChange={e => setField('websiteUrl', e.target.value)} placeholder="Website URL, optional" />
        <textarea value={form.bio} onChange={e => setField('bio', e.target.value)} placeholder="Short bio, optional" />
        <label><input type="checkbox" checked={form.isPrivate} onChange={e => setField('isPrivate', e.target.checked)} /> Private mode, show me as anonymous gallery creature</label>
        <button disabled={busy}>{busy ? 'Saving...' : 'Save profile'}</button>
      </form>
      <div className="lora-upload-card">
        <span className="eyebrow">Privacy rules</span>
        <h2>No email leakage</h2>
        <p>Your login email is only for auth, billing, and admin-only operations. Public comments and model assets use your username or anonymous mode.</p>
        <p>You can change this handle later. If you turn on private mode, public surfaces avoid your display name too.</p>
      </div>
    </section>
  </main>;
}
