import { NextRequest, NextResponse } from 'next/server';
import { appendFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getBearerUser } from '@/lib/server-auth';
import { getServerSupabase } from '@/lib/server-db';
import { sanitizePrompt } from '@/lib/generation';

export const dynamic = 'force-dynamic';

const ASSETS_DIR = path.join(process.cwd(), '.cache', 'model-assets');
const ASSETS_FILE = path.join(ASSETS_DIR, 'assets.jsonl');
const TYPES = new Set(['lora', 'checkpoint', 'textual_inversion', 'vae', 'workflow', 'dataset', 'other']);
const BASE_MODELS = new Set(['flux', 'sdxl', 'sd15', 'pony', 'wan', 'hunyuan', 'other']);

type AssetRecord = {
  id: string;
  user_id: string;
  user_email: string | null;
  name: string;
  description: string | null;
  asset_type: string;
  base_model: string;
  file_url: string;
  source_url: string | null;
  license: string | null;
  trigger_words: string[];
  tags: string[];
  preview_url: string | null;
  is_nsfw: boolean;
  status: 'published' | 'hidden';
  created_at: string;
};

async function readAssets(): Promise<AssetRecord[]> {
  try {
    const raw = await readFile(ASSETS_FILE, 'utf8');
    return raw.split('\n').filter(Boolean).map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

function csv(value: unknown, max = 24) {
  if (Array.isArray(value)) return value.map(v => sanitizePrompt(String(v))).filter(Boolean).slice(0, max);
  return String(value || '').split(',').map(v => sanitizePrompt(v)).filter(Boolean).slice(0, max);
}

function cleanUrl(value: unknown) {
  const url = String(value || '').trim().slice(0, 1600);
  if (!url) return '';
  if (/^(https?:\/\/|ipfs:\/\/|ar:\/\/)/i.test(url)) return url;
  if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)?$/.test(url)) return url;
  return '';
}

async function isBanned(userId: string) {
  try {
    const supabase = getServerSupabase();
    const { data } = await supabase.auth.admin.getUserById(userId);
    const bannedUntil = data.user?.banned_until;
    return Boolean(bannedUntil && new Date(bannedUntil).getTime() > Date.now());
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const includeNsfw = searchParams.get('nsfw') === 'true';
  const q = (searchParams.get('q') || '').toLowerCase().trim();
  const type = searchParams.get('type') || '';
  const assets = (await readAssets())
    .filter(asset => asset.status === 'published')
    .filter(asset => includeNsfw || !asset.is_nsfw)
    .filter(asset => !type || asset.asset_type === type)
    .filter(asset => !q || [asset.name, asset.description, asset.base_model, asset.asset_type, ...asset.tags, ...asset.trigger_words].filter(Boolean).join(' ').toLowerCase().includes(q))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 120);
  return NextResponse.json({ ok: true, assets });
}

export async function POST(request: NextRequest) {
  const { user, error } = await getBearerUser(request);
  if (!user) return NextResponse.json({ error }, { status: 401 });
  if (await isBanned(user.id)) return NextResponse.json({ error: 'User is banned' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const name = sanitizePrompt(String(body.name || '')).slice(0, 160);
  const fileUrl = cleanUrl(body.fileUrl || body.file_url || body.downloadUrl);
  const assetType = TYPES.has(String(body.assetType || body.asset_type)) ? String(body.assetType || body.asset_type) : 'other';
  const baseModel = BASE_MODELS.has(String(body.baseModel || body.base_model)) ? String(body.baseModel || body.base_model) : 'other';
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!fileUrl) return NextResponse.json({ error: 'A valid file URL, IPFS URL, Arweave URL, or Replicate owner/model slug is required' }, { status: 400 });

  const record: AssetRecord = {
    id: crypto.randomUUID(),
    user_id: user.id,
    user_email: user.email || null,
    name,
    description: sanitizePrompt(String(body.description || '')).slice(0, 1200) || null,
    asset_type: assetType,
    base_model: baseModel,
    file_url: fileUrl,
    source_url: cleanUrl(body.sourceUrl || body.source_url) || null,
    license: sanitizePrompt(String(body.license || '')).slice(0, 120) || null,
    trigger_words: csv(body.triggerWords || body.trigger_words),
    tags: csv(body.tags, 32),
    preview_url: cleanUrl(body.previewUrl || body.preview_url) || null,
    is_nsfw: Boolean(body.isNsfw || body.is_nsfw),
    status: 'published',
    created_at: new Date().toISOString(),
  };
  await mkdir(ASSETS_DIR, { recursive: true });
  await appendFile(ASSETS_FILE, JSON.stringify(record) + '\n', 'utf8');
  return NextResponse.json({ ok: true, asset: record });
}
