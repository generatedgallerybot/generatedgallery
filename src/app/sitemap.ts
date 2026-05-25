import { createClient } from '@supabase/supabase-js';
import { MetadataRoute } from 'next';
import { MODELS, PROMPT_TOPICS, SEARCHES, SOURCES, TAGS } from '@/lib/discovery';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://generatedgallery.com';
  
  const CATEGORY_SLUGS = [
    'portraits', 'landscapes', 'fantasy', 'anime', 'abstract',
    'sci-fi', 'animals', '3d-render', 'photorealistic', 'digital-art',
    'architecture', 'fashion',
  ]

  // Static pages
  const routes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/ai-art-gallery`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.95 },
    { url: `${baseUrl}/ai-image-prompts`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/ai-image-dataset`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.88 },
    { url: `${baseUrl}/ai-prompt-dataset`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.87 },
    { url: `${baseUrl}/jsonl-ai-image-dataset`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.86 },
    { url: `${baseUrl}/stable-diffusion-prompt-dataset`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.86 },
    { url: `${baseUrl}/generated-gallery-alternative`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.75 },
    { url: `${baseUrl}/protocol`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/protocol/creator-kit`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.84 },
    { url: `${baseUrl}/trending`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/daily`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/machine-dream-finds`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.86 },
    { url: `${baseUrl}/galleries`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.82 },
    { url: `${baseUrl}/models`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.86 },
    { url: `${baseUrl}/upload`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/llms.txt`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/llms-full.txt`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.65 },
    ...CATEGORY_SLUGS.map(slug => ({
      url: `${baseUrl}/style/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    })),
    ...TAGS.map(item => ({
      url: `${baseUrl}/tag/${item.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.88,
    })),
    ...MODELS.map(item => ({
      url: `${baseUrl}/model/${item.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.86,
    })),
    ...PROMPT_TOPICS.map(item => ({
      url: `${baseUrl}/prompts/${item.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    })),
    ...SOURCES.map(item => ({
      url: `${baseUrl}/source/${item.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.78,
    })),
    ...SEARCHES.map(item => ({
      url: `${baseUrl}/search/${item.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.84,
    })),
  ];
  
  // Public galleries are crawlable collection pages.
  try {
    const { data: galleries } = await supabase
      .from('galleries')
      .select('id, created_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(1000);

    for (const gallery of galleries || []) {
      const { count } = await supabase
        .from('gallery_images')
        .select('id, images!inner(is_nsfw)', { count: 'exact', head: true })
        .eq('gallery_id', gallery.id)
        .eq('images.is_nsfw', false);
      if (!count) continue;
      routes.push({
        url: `${baseUrl}/gallery/${gallery.id}`,
        lastModified: gallery.created_at ? new Date(gallery.created_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.64,
      });
    }
  } catch (e) {
    console.error('Gallery sitemap error:', e);
  }

  // Image detail pages (latest 10k). This is the main long-tail SEO surface.
  try {
    const pageSize = 1000;
    const maxImages = 10000;
    for (let offset = 0; offset < maxImages; offset += pageSize) {
      const { data: images } = await supabase
        .from('images')
        .select('id, crawled_at')
        .order('crawled_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (!images || images.length === 0) break;
      for (const img of images) {
        routes.push({
          url: `${baseUrl}/image/${img.id}`,
          lastModified: img.crawled_at ? new Date(img.crawled_at) : new Date(),
          changeFrequency: 'monthly',
          priority: 0.5,
        });
      }
      if (images.length < pageSize) break;
    }
  } catch (e) {
    console.error('Sitemap error:', e);
  }
  
  return routes;
}
