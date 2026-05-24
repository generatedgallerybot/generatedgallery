import { NextResponse } from 'next/server';
import { getBearerUser } from '@/lib/server-auth';
import { getServerSupabase } from '@/lib/server-db';
import { cleanUsername, ensureUserProfile, publicProfileFromRow } from '@/lib/profiles';

export const dynamic = 'force-dynamic';

function isMissingProfilesTable(error: any) {
  const msg = String(error?.message || error || '');
  return msg.includes('profiles') && (msg.includes('schema cache') || msg.includes('does not exist'));
}

function publicPayload(profile: any) {
  return {
    username: profile.username,
    displayName: profile.displayName || profile.display_name || profile.username,
    isPrivate: Boolean(profile.isPrivate ?? profile.is_private),
    bio: profile.bio || '',
    avatarUrl: profile.avatar_url || '',
    websiteUrl: profile.website_url || '',
  };
}

export async function GET(request: Request) {
  const { user, error } = await getBearerUser(request);
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const profile = await ensureUserProfile(user);
  const supabase = getServerSupabase();
  const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
  return NextResponse.json({ ok: true, profile: publicPayload(data || profile) });
}

export async function POST(request: Request) {
  const { user, error } = await getBearerUser(request);
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const username = cleanUsername(body.username);
  if (username.length < 3) return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
  const displayName = String(body.displayName || username).replace(/\s+/g, ' ').trim().slice(0, 80);
  const bio = String(body.bio || '').trim().slice(0, 500) || null;
  const websiteUrl = String(body.websiteUrl || '').trim().slice(0, 300) || null;
  const avatarUrl = String(body.avatarUrl || '').trim().slice(0, 800) || null;
  const isPrivate = Boolean(body.isPrivate);

  const supabase = getServerSupabase();
  const row = { user_id: user.id, username, display_name: displayName, bio, website_url: websiteUrl, avatar_url: avatarUrl, is_private: isPrivate };
  const { data, error: updateError } = await supabase.from('profiles').upsert(row, { onConflict: 'user_id' }).select('*').single();
  if (updateError) {
    if (isMissingProfilesTable(updateError)) return NextResponse.json({ error: 'Profiles table migration has not been applied yet.' }, { status: 503 });
    if (updateError.code === '23505') return NextResponse.json({ error: 'Username is taken' }, { status: 409 });
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, profile: publicPayload(data) });
}
