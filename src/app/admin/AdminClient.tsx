'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ADMIN_EMAIL_LABEL, isAdminEmail } from '@/lib/admins';

type Overview = {
  storage: 'supabase' | 'local_fallback';
  socialStorage?: 'supabase' | 'local_fallback';
  totals: { creditsIssued: number; creditsSpent: number; queued: number; completed: number; failed: number };
  jobs: any[];
  outputs?: any[];
  comments?: any[];
  modelAssets?: any[];
  ledger: any[];
  users: any[];
  funnel?: { summary: Record<string, number>; events: any[] };
};

export default function AdminClient() {
  const { user, session, loading, setShowAuthModal } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [userBusy, setUserBusy] = useState<string | null>(null);
  const [moderationBusy, setModerationBusy] = useState<string | null>(null);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantAmount, setGrantAmount] = useState('100');
  const [grantNote, setGrantNote] = useState('admin_credit_grant');
  const isAdmin = isAdminEmail(user?.email);

  async function adminFetch(url: string, options: RequestInit = {}) {
    if (!session?.access_token) throw new Error('Sign in required');
    const res = await fetch(url, { ...options, headers: { ...(options.headers || {}), authorization: `Bearer ${session.access_token}` } });
    const text = await res.text();
    const body = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
    return body;
  }

  async function load() {
    if (!isAdmin || !session?.access_token) return;
    setMessage('');
    try { setOverview(await adminFetch('/api/admin/overview')); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load admin panel'); }
  }

  useEffect(() => { load(); }, [isAdmin, session?.access_token]);

  async function grantCredits(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMessage('');
    try {
      const body = await adminFetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: grantEmail, amount: Number(grantAmount), note: grantNote }),
      });
      setMessage(`Credit entry saved via ${body.storage}.`);
      setGrantEmail('');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Credit grant failed');
    } finally { setBusy(false); }
  }

  async function moderateItem(kind: 'comment' | 'model_asset', id: string, action: 'hide' | 'restore' | 'delete' | 'flag') {
    setModerationBusy(`${kind}:${id}`); setMessage('');
    try {
      const body = await adminFetch('/api/admin/moderation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, id, action }),
      });
      setMessage(`Moderation updated via ${body.storage}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Moderation update failed');
    } finally { setModerationBusy(null); }
  }

  async function updateUserBan(target: any, action: 'ban' | 'unban') {
    const label = target.email || target.id;
    if (action === 'ban' && !window.confirm(`Ban ${label}? They will be blocked from signing in.`)) return;
    setUserBusy(target.id); setMessage('');
    try {
      await adminFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: target.id, action }),
      });
      setMessage(`${action === 'ban' ? 'Banned' : 'Unbanned'} ${label}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'User update failed');
    } finally { setUserBusy(null); }
  }

  const recentUsers = useMemo(() => overview?.users || [], [overview]);
  const usersById = useMemo(() => Object.fromEntries(recentUsers.map((item: any) => [item.id, item])), [recentUsers]);

  if (loading) return <main className="admin-page"><p>Loading...</p></main>;
  if (!user) return <main className="admin-page"><Panel><h1>Admin</h1><p>Sign in as Cody to continue.</p><button className="admin-primary" onClick={() => setShowAuthModal(true)}>Sign in</button></Panel></main>;
  if (!isAdmin) return <main className="admin-page"><Panel><h1>Admin</h1><p>This area is restricted.</p></Panel></main>;

  return <main className="admin-page">
    <section className="admin-hero">
      <div>
        <span className="eyebrow">Admin</span>
        <h1>GeneratedGallery control room</h1>
        <p>Credits, users, generation queue status, outputs, and moderation. Access is restricted to {ADMIN_EMAIL_LABEL}.</p>
      </div>
      <button className="admin-secondary" onClick={load}>Refresh</button>
    </section>

    {message && <p className="admin-message">{message}</p>}

    {overview && <>
      <section className="admin-stats">
        <Stat label="Storage" value={overview.storage === 'local_fallback' ? 'Local fallback' : 'Supabase'} />
        <Stat label="Social DB" value={overview.socialStorage === 'local_fallback' ? 'Local fallback' : 'Supabase'} />
        <Stat label="Credits issued" value={overview.totals.creditsIssued.toLocaleString()} />
        <Stat label="Credits spent" value={overview.totals.creditsSpent.toLocaleString()} />
        <Stat label="Queued jobs" value={overview.totals.queued.toLocaleString()} />
        <Stat label="Completed" value={overview.totals.completed.toLocaleString()} />
        <Stat label="Failed" value={overview.totals.failed.toLocaleString()} />
        <Stat label="Users" value={recentUsers.length.toLocaleString()} />
        <Stat label="Outputs" value={(overview.outputs?.length || 0).toLocaleString()} />
        <Stat label="Comments" value={(overview.comments?.length || 0).toLocaleString()} />
        <Stat label="Assets" value={(overview.modelAssets?.length || 0).toLocaleString()} />
        <Stat label="Gen page views" value={(overview.funnel?.summary?.generate_page_view || 0).toLocaleString()} />
        <Stat label="Gen submits" value={(overview.funnel?.summary?.generate_submit || 0).toLocaleString()} />
        <Stat label="Gen successes" value={(overview.funnel?.summary?.generate_success || 0).toLocaleString()} />
      </section>

      <section className="admin-grid">
        <Panel>
          <h2>Grant credits</h2>
          <form onSubmit={grantCredits} className="admin-form">
            <input value={grantEmail} onChange={e => setGrantEmail(e.target.value)} placeholder="User email" type="email" required />
            <input value={grantAmount} onChange={e => setGrantAmount(e.target.value)} placeholder="Amount" type="number" min="-10000" max="10000" required />
            <input value={grantNote} onChange={e => setGrantNote(e.target.value)} placeholder="Reason" />
            <button className="admin-primary" disabled={busy}>{busy ? 'Saving...' : 'Save credit entry'}</button>
          </form>
        </Panel>

        <Panel>
          <h2>Recent users</h2>
          <div className="admin-list">{recentUsers.length ? recentUsers.map(target => {
            const banned = Boolean(target.banned_until && new Date(target.banned_until).getTime() > Date.now());
            return <div className="admin-row admin-user-row" key={target.id}>
              <b>{target.email || target.id} {banned ? '· banned' : ''}</b>
              <span>{target.providers?.length ? `Providers: ${target.providers.join(', ')}` : 'Provider: email'} · Jobs: {target.jobCount || 0} · Outputs: {target.outputCount || 0}</span>
              <span>Created {new Date(target.created_at).toLocaleString()} · Last sign-in {target.last_sign_in_at ? new Date(target.last_sign_in_at).toLocaleString() : 'never'}</span>
              {target.banned_until && <em>Banned until {new Date(target.banned_until).toLocaleString()}</em>}
              <button className={banned ? 'admin-secondary' : 'admin-danger'} disabled={userBusy === target.id} onClick={() => updateUserBan(target, banned ? 'unban' : 'ban')}>
                {userBusy === target.id ? 'Saving...' : banned ? 'Unban user' : 'Ban user'}
              </button>
            </div>;
          }) : <p>No users loaded.</p>}</div>
        </Panel>
      </section>

      <section className="admin-grid wide">
        <Panel>
          <h2>Generation funnel, last 7 days</h2>
          <div className="admin-list">
            {overview.funnel?.events?.length ? overview.funnel.events.map(event => <Row key={event.id} title={event.event} meta={event.metadata ? JSON.stringify(event.metadata).slice(0, 180) : event.anon_id || event.user_id} sub={new Date(event.created_at).toLocaleString()} />) : <p>No funnel events yet. Apply the migration below, then refresh.</p>}
          </div>
        </Panel>
        <Panel>
          <h2>Recent generation jobs + results</h2>
          <div className="admin-list">{overview.jobs.length ? overview.jobs.map(job => <JobRow key={job.id} job={job} user={usersById[job.user_id]} userBusy={userBusy} onBan={updateUserBan} />) : <p>No jobs yet.</p>}</div>
        </Panel>
      </section>

      <section className="admin-grid wide">
        <Panel>
          <h2>Recent generated outputs</h2>
          <div className="admin-list admin-output-list">{overview.outputs?.length ? overview.outputs.map(output => <OutputThumb key={output.id} output={output} user={usersById[output.user_id]} userBusy={userBusy} onBan={updateUserBan} />) : <p>No outputs yet.</p>}</div>
        </Panel>
        <Panel>
          <h2>Recent comments</h2>
          <div className="admin-list">{overview.comments?.length ? overview.comments.map(comment => <ModerationRow key={comment.id} kind="comment" item={comment} busy={moderationBusy} onModerate={moderateItem} />) : <p>No comments yet.</p>}</div>
        </Panel>
      </section>

      <section className="admin-grid wide">
        <Panel>
          <h2>Model assets</h2>
          <div className="admin-list">{overview.modelAssets?.length ? overview.modelAssets.map(asset => <ModerationRow key={asset.id} kind="model_asset" item={asset} busy={moderationBusy} onModerate={moderateItem} />) : <p>No model assets yet.</p>}</div>
        </Panel>
        <Panel>
          <h2>Recent ledger entries</h2>
          <div className="admin-list">{overview.ledger.length ? overview.ledger.map(entry => <Row key={entry.id} title={`${Number(entry.amount) > 0 ? '+' : ''}${entry.amount} credits · ${entry.reason}`} meta={entry.metadata?.targetEmail || entry.metadata?.customerEmail || entry.user_id} sub={new Date(entry.created_at).toLocaleString()} />) : <p>No ledger entries yet.</p>}</div>
        </Panel>
      </section>
    </>}
  </main>;
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="admin-panel">{children}</div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="admin-stat"><span>{label}</span><b>{value}</b></div>;
}

function Row({ title, meta, sub }: { title: string; meta?: string; sub?: string }) {
  return <div className="admin-row"><b>{title}</b>{meta && <span>{meta}</span>}{sub && <em>{sub}</em>}</div>;
}

function ModerationRow({ kind, item, busy, onModerate }: { kind: 'comment' | 'model_asset'; item: any; busy?: string | null; onModerate: (kind: 'comment' | 'model_asset', id: string, action: 'hide' | 'restore' | 'delete' | 'flag') => void }) {
  const isBusy = busy === `${kind}:${item.id}`;
  const status = item.status || (kind === 'model_asset' ? 'published' : 'visible');
  const title = kind === 'model_asset' ? item.name : `${item.target_type || 'target'} · ${item.target_id || ''}`;
  const body = kind === 'model_asset' ? [item.asset_type, item.base_model, item.user_email].filter(Boolean).join(' · ') : item.body;
  return <div className="admin-row">
    <b>{title} · {status}</b>
    <span>{body}</span>
    <em>{new Date(item.created_at).toLocaleString()}</em>
    <div className="admin-mini-actions">
      <button className="admin-secondary" disabled={isBusy} onClick={() => onModerate(kind, item.id, 'restore')}>Restore</button>
      <button className="admin-secondary" disabled={isBusy} onClick={() => onModerate(kind, item.id, 'flag')}>Flag</button>
      <button className="admin-danger" disabled={isBusy} onClick={() => onModerate(kind, item.id, 'hide')}>Hide</button>
    </div>
  </div>;
}

function JobRow({ job, user, userBusy, onBan }: { job: any; user?: any; userBusy?: string | null; onBan?: (target: any, action: 'ban' | 'unban') => void }) {
  const banned = Boolean(user?.banned_until && new Date(user.banned_until).getTime() > Date.now());
  return <div className="admin-row">
    <b>{job.status} · {job.workflow_key} · {job.credit_cost} credits</b>
    <span>{job.prompt}</span>
    <span>User {user?.email || job.user_id} · {job.outputs?.length || 0} output(s){banned ? ' · banned' : ''}</span>
    {user && onBan && <button className={banned ? 'admin-secondary' : 'admin-danger'} disabled={userBusy === user.id} onClick={() => onBan(user, banned ? 'unban' : 'ban')}>
      {userBusy === user.id ? 'Saving...' : banned ? 'Unban user' : 'Ban user'}
    </button>}
    {job.error && <span>Error: {job.error}</span>}
    <em>{new Date(job.created_at).toLocaleString()}</em>
    {job.outputs?.length ? <div className="admin-thumbs">{job.outputs.map((output: any) => <OutputThumb key={output.id} output={output} compact />)}</div> : null}
  </div>;
}

function OutputThumb({ output, compact = false, user, userBusy, onBan }: { output: any; compact?: boolean; user?: any; userBusy?: string | null; onBan?: (target: any, action: 'ban' | 'unban') => void }) {
  const banned = Boolean(user?.banned_until && new Date(user.banned_until).getTime() > Date.now());
  return <div className={compact ? 'admin-thumb compact' : 'admin-thumb'}>
    <a href={output.image_url} target="_blank" rel="noopener noreferrer"><img src={output.image_url} alt="Generated result" loading="lazy" /></a>
    {!compact && <span>{output.width || '?'}×{output.height || '?'} · {new Date(output.created_at).toLocaleString()}</span>}
    {!compact && <span>User {user?.email || output.user_id}{banned ? ' · banned' : ''}</span>}
    {!compact && user && onBan && <button className={banned ? 'admin-secondary' : 'admin-danger'} disabled={userBusy === user.id} onClick={() => onBan(user, banned ? 'unban' : 'ban')}>
      {userBusy === user.id ? 'Saving...' : banned ? 'Unban user' : 'Ban user'}
    </button>}
  </div>;
}
