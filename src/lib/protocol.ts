import type { Database } from './database.types';

type ImageRow = Database['public']['Tables']['images']['Row'] & {
  media_type?: string | null;
  mime_type?: string | null;
  creator?: string | null;
  external_id?: string | null;
};

export const GENERATED_GALLERY_PROTOCOL_VERSION = '0.2.0';

export type GeneratedGalleryLabels = {
  subjects: string[];
  styles: string[];
  aesthetic: string[];
  medium: string[];
  composition: string[];
  use_cases: string[];
  quality_flags: string[];
  avoidance_flags: string[];
  safety: string[];
  model_family: string | null;
  confidence: Record<string, number>;
  quality_score: number;
  labeler: string;
};

export type GeneratedGalleryRecord = {
  protocolVersion?: string;
  id: string;
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
  description: string | null;
  source: {
    site: string;
    url: string | null;
    externalId: string | null;
    creator: string | null;
  };
  media: {
    type: 'image' | 'video' | 'gif' | 'unknown';
    width: number | null;
    height: number | null;
    mimeType: string | null;
  };
  generation: {
    prompt: string | null;
    negativePrompt: string | null;
    model: string | null;
  };
  taxonomy: {
    category: string | null;
    tags: string[];
  };
  labels?: GeneratedGalleryLabels;
  rights?: {
    metadata: string;
    media: string;
    training_use: string;
    notes: string;
  };
  provenance?: {
    source_site: string | null;
    source_url: string | null;
    indexed_by: string;
    indexed_at: string | null;
  };
  safety: {
    nsfw: boolean;
    rating: 'sfw' | 'mature' | 'nsfw' | 'unknown';
  };
  stats: {
    views: number;
    downloads: number;
    upvotes: number;
  };
  createdAt: string | null;
  indexedAt: string;
};

function normalizeMediaType(row: ImageRow): GeneratedGalleryRecord['media']['type'] {
  const explicit = row.media_type?.toLowerCase();
  if (explicit === 'image' || explicit === 'video' || explicit === 'gif') return explicit;
  if (/\.(mp4|webm|mov)(\?|$)/i.test(row.image_url)) return 'video';
  if (/\.gif(\?|$)/i.test(row.image_url)) return 'gif';
  return 'image';
}

function externalIdFromSourceUrl(sourceUrl: string | null): string | null {
  if (!sourceUrl) return null;
  const match = sourceUrl.match(/(?:images|posts|models)\/(\d+)/i);
  return match?.[1] || null;
}

function cleanString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function positiveInt(value: number | null | undefined): number | null {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : null;
}

function nonNegativeInt(value: number | null | undefined): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}

function uniqueTags(tags: string[] | null | undefined): string[] {
  if (!Array.isArray(tags)) return [];
  return Array.from(new Set(tags.map(tag => tag.trim()).filter(Boolean))).slice(0, 50);
}

export function imageRowToProtocolRecord(row: ImageRow): GeneratedGalleryRecord {
  return {
    id: `${cleanString(row.source_site) || 'generatedgallery'}:${row.id}`,
    url: row.image_url,
    thumbnailUrl: row.thumbnail_url || null,
    title: cleanString(row.title),
    description: cleanString(row.description),
    source: {
      site: cleanString(row.source_site) || 'generatedgallery.com',
      url: row.source_url || null,
      externalId: cleanString(row.external_id) || externalIdFromSourceUrl(row.source_url),
      creator: cleanString(row.creator) || cleanString(row.uploaded_by),
    },
    media: {
      type: normalizeMediaType(row),
      width: positiveInt(row.width),
      height: positiveInt(row.height),
      mimeType: cleanString(row.mime_type),
    },
    generation: {
      prompt: cleanString(row.prompt),
      negativePrompt: cleanString(row.negative_prompt),
      model: cleanString(row.model),
    },
    taxonomy: {
      category: cleanString(row.category),
      tags: uniqueTags(row.tags),
    },
    safety: {
      nsfw: row.is_nsfw,
      rating: row.is_nsfw ? 'nsfw' : 'sfw',
    },
    stats: {
      views: nonNegativeInt(row.views),
      downloads: nonNegativeInt(row.downloads),
      upvotes: nonNegativeInt(row.upvotes),
    },
    createdAt: row.created_at,
    indexedAt: row.crawled_at || row.created_at || new Date().toISOString(),
  };
}
