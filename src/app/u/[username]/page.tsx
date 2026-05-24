import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/server-db';
import { attachProfiles, publicProfileFromRow } from '@/lib/profiles';

export const dynamic = 'force-dynamic';

type PageProps = { params: { username: string } };

function displayUrl(url?: string | null) {
  if (!url) return '';
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

export async function generateMetadata({ params }: PageProps) {
  const username = decodeURIComponent(params.username || '').toLowerCase();
  return {
    title: `@${username} | Generated Gallery`,
    description: `Creator profile for @${username} on Generated Gallery.`,
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const username = decodeURIComponent(params.username || '').toLowerCase().trim();
  if (!username || username.length < 3) notFound();

  const supabase = getServerSupabase();
  const { data: profileRow, error } = await supabase
    .from('profiles')
    .select('user_id,username,display_name,bio,avatar_url,website_url,is_private,created_at')
    .eq('username', username)
    .single();

  if (error || !profileRow) notFound();

  const publicProfile = publicProfileFromRow(profileRow);
  const isPrivate = Boolean(profileRow.is_private);
  const { data: assetRows } = isPrivate ? { data: [] as any[] } : await supabase
    .from('model_assets')
    .select('*')
    .eq('user_id', profileRow.user_id)
    .eq('status', 'published')
    .eq('is_nsfw', false)
    .order('created_at', { ascending: false })
    .limit(60);

  const assets = attachProfiles(assetRows || [], { [profileRow.user_id]: publicProfile });
  const totalLikes = assets.reduce((sum: number, asset: any) => sum + Number(asset.likes || 0), 0);
  const totalUses = assets.reduce((sum: number, asset: any) => sum + Number(asset.uses || 0), 0);
  const joined = profileRow.created_at ? new Date(profileRow.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'recently';

  return <main className="lora-explorer-page">
    <Link href="/upload" className="text-[13px] text-white/35 hover:text-accent">← Back to model board</Link>

    <section className="lora-hero asset-detail-hero">
      <div>
        <span className="eyebrow">Creator profile · joined {joined}</span>
        <h1>{isPrivate ? 'anonymous gallery creature' : (profileRow.display_name || `@${profileRow.username}`)}</h1>
        <p>{isPrivate ? 'This creator keeps their profile private. The mask stays on. Good for them, honestly.' : (profileRow.bio || 'No bio yet. Mysterious creature, possibly powerful.')}</p>
        {!isPrivate && profileRow.website_url && <p><a href={profileRow.website_url} target="_blank" rel="noopener noreferrer">{displayUrl(profileRow.website_url)}</a></p>}
        <div className="lora-search-row asset-actions">
          {!isPrivate && <span>@{profileRow.username}</span>}
          <span>{assets.length} asset{assets.length === 1 ? '' : 's'}</span>
          <span>{totalLikes} likes</span>
          <span>{totalUses} uses</span>
        </div>
      </div>
      {!isPrivate && profileRow.avatar_url ? <img src={profileRow.avatar_url} alt="" loading="lazy" /> : <div className="lora-preview-fallback">{isPrivate ? 'private' : 'creator'}</div>}
    </section>

    {isPrivate ? <section className="empty-generations"><b>Private profile</b><span>Public assets are hidden while this creator is in private mode.</span></section> : <section className="lora-explorer-grid">
      {assets.length ? assets.map((asset: any) => <article key={asset.id} className="lora-explorer-card">
        {asset.preview_url ? <img src={asset.preview_url} alt="" loading="lazy" /> : <div className="lora-preview-fallback">{asset.asset_type}</div>}
        <div>
          <span>{asset.base_model} · {asset.asset_type}</span>
          <h2><Link href={`/asset/${asset.id}`}>{asset.name}</Link></h2>
          <p>{asset.description || asset.trigger_words?.join(', ') || 'No notes yet.'}</p>
          <small>{asset.likes || 0} likes · {asset.uses || 0} uses · {asset.downloads || 0} downloads</small>
        </div>
        <div className="lora-card-actions three">
          <Link href={`/asset/${asset.id}`}>Details</Link>
          <Link href={`/generate?prompt=${encodeURIComponent(asset.trigger_words?.join(', ') || asset.name)}`}>Use</Link>
          <a href={asset.file_url} target="_blank" rel="noopener noreferrer">File</a>
        </div>
      </article>) : <div className="empty-generations"><b>No public assets yet</b><span>This creator has not released any model creatures.</span></div>}
    </section>}
  </main>;
}
