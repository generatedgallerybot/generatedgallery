import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const LONG_BAN_DURATION = '876000h'; // ~100 years, Supabase-compatible duration string

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.user) return NextResponse.json({ error: admin.error }, { status: admin.status });

  try {
    const { userId, action } = await request.json();
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    if (!['ban', 'unban'].includes(action)) {
      return NextResponse.json({ error: 'action must be ban or unban' }, { status: 400 });
    }

    const { getServerSupabase } = await import('@/lib/server-db');
    const supabase = getServerSupabase();
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: action === 'ban' ? LONG_BAN_DURATION : 'none',
    } as any);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, user: data.user, action });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'User admin action failed' }, { status: 500 });
  }
}
