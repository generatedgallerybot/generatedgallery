import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getServerSupabase } from '@/lib/server-db';
import { isMissingGenerationSchema, listAllLocalGenerationJobs, listLocalLedgerEntries } from '@/lib/local-generation-store';

export const dynamic = 'force-dynamic';

function sumCredits(entries: any[]) {
  return entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.user) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const supabase = getServerSupabase();
  let storage: 'supabase' | 'local_fallback' = 'supabase';
  let jobs: any[] = [];
  let ledger: any[] = [];
  let totals = { creditsIssued: 0, creditsSpent: 0, queued: 0, completed: 0, failed: 0 };
  let funnelEvents: any[] = [];
  let funnelSummary: Record<string, number> = {};
  let outputs: any[] = [];

  const [jobsResult, ledgerResult, outputsResult] = await Promise.all([
    supabase.from('generation_jobs').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('credit_ledger').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('generation_outputs').select('*').order('created_at', { ascending: false }).limit(200),
  ]);

  if (jobsResult.error || ledgerResult.error) {
    if (!isMissingGenerationSchema(jobsResult.error || ledgerResult.error)) {
      return NextResponse.json({ error: (jobsResult.error || ledgerResult.error)?.message || 'Could not load admin data' }, { status: 500 });
    }
    storage = 'local_fallback';
    jobs = await listAllLocalGenerationJobs(100);
    ledger = await listLocalLedgerEntries(100);
  } else {
    jobs = jobsResult.data || [];
    ledger = ledgerResult.data || [];
    outputs = outputsResult.data || [];
  }

  const outputsByJob = outputs.reduce((acc: Record<string, any[]>, output: any) => {
    acc[output.job_id] = acc[output.job_id] || [];
    acc[output.job_id].push(output);
    return acc;
  }, {});
  jobs = jobs.map(job => ({ ...job, outputs: outputsByJob[job.id] || [] }));

  totals = {
    creditsIssued: sumCredits(ledger.filter(entry => Number(entry.amount) > 0)),
    creditsSpent: Math.abs(sumCredits(ledger.filter(entry => Number(entry.amount) < 0))),
    queued: jobs.filter(job => job.status === 'queued').length,
    completed: jobs.filter(job => job.status === 'completed').length,
    failed: jobs.filter(job => job.status === 'failed').length,
  };

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: eventsData } = await supabase
    .from('generation_events')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500)
    .then((result) => result, () => ({ data: null } as any));
  funnelEvents = eventsData || [];
  funnelSummary = funnelEvents.reduce((acc: Record<string, number>, event: any) => {
    acc[event.event] = (acc[event.event] || 0) + 1;
    return acc;
  }, {});

  const { data: usersData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 }).catch(() => ({ data: null } as any));

  const users = usersData?.users || [];
  const jobCountsByUser = jobs.reduce((acc: Record<string, number>, job: any) => {
    acc[job.user_id] = (acc[job.user_id] || 0) + 1;
    return acc;
  }, {});
  const outputCountsByUser = outputs.reduce((acc: Record<string, number>, output: any) => {
    acc[output.user_id] = (acc[output.user_id] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    ok: true,
    storage,
    totals,
    jobs,
    outputs,
    ledger,
    users: users.map((user: any) => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      banned_until: user.banned_until,
      providers: user.identities?.map((identity: any) => identity.provider).filter(Boolean) || [],
      jobCount: jobCountsByUser[user.id] || 0,
      outputCount: outputCountsByUser[user.id] || 0,
    })).slice(0, 100),
    funnel: { summary: funnelSummary, events: funnelEvents.slice(0, 100) },
  });
}
