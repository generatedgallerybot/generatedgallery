import { getServerSupabase } from './server-db';

export type PublicProfile = {
  userId: string;
  username: string;
  displayName: string;
  isPrivate: boolean;
};

function isMissingProfilesTable(error: any) {
  const msg = String(error?.message || error || '');
  return msg.includes('profiles') && (msg.includes('schema cache') || msg.includes('does not exist'));
}

export function fallbackUsername(userId?: string | null) {
  const suffix = String(userId || 'anon').replace(/-/g, '').slice(0, 8) || 'anon';
  return `gallery-${suffix}`;
}

export function publicProfileFromRow(row: any, userId?: string | null): PublicProfile {
  const id = row?.user_id || userId || '';
  const isPrivate = Boolean(row?.is_private);
  const username = isPrivate ? fallbackUsername(id) : (row?.username || fallbackUsername(id));
  return {
    userId: id,
    username,
    displayName: isPrivate ? 'anonymous gallery creature' : (row?.display_name || username),
    isPrivate,
  };
}

export function attachProfiles<T extends { user_id?: string | null }>(items: T[], profiles: Record<string, PublicProfile>) {
  return items.map((item: any) => {
    const profile = profiles[item.user_id || ''] || publicProfileFromRow(null, item.user_id);
    return {
      ...item,
      user_email: undefined,
      userEmail: undefined,
      username: profile.username,
      display_name: profile.displayName,
      displayName: profile.displayName,
      profile: {
        username: profile.username,
        displayName: profile.displayName,
        isPrivate: profile.isPrivate,
      },
    };
  });
}

export async function getPublicProfiles(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  const fallback = Object.fromEntries(ids.map(id => [id, publicProfileFromRow(null, id)]));
  if (!ids.length) return fallback;
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('profiles').select('user_id,username,display_name,is_private').in('user_id', ids);
  if (error) {
    if (isMissingProfilesTable(error)) return fallback;
    return fallback;
  }
  const profiles = { ...fallback };
  for (const row of data || []) profiles[row.user_id] = publicProfileFromRow(row);
  return profiles;
}

export async function ensureUserProfile(user: { id: string; user_metadata?: any }) {
  const fallback = publicProfileFromRow(null, user.id);
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id,username,display_name,is_private')
    .eq('user_id', user.id)
    .single();
  if (!error && data) return publicProfileFromRow(data);
  if (error && !isMissingProfilesTable(error) && error.code !== 'PGRST116') return fallback;

  const row = {
    user_id: user.id,
    username: fallback.username,
    display_name: fallback.username,
    is_private: false,
  };
  const { data: inserted, error: insertError } = await supabase.from('profiles').upsert(row, { onConflict: 'user_id' }).select('user_id,username,display_name,is_private').single();
  if (insertError) return fallback;
  return publicProfileFromRow(inserted);
}

export function cleanUsername(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}
