import { createClient } from '@supabase/supabase-js';
import { MetadataRoute } from 'next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://generatedgallery.com';
  
  // Static pages
  const routes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/trending`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/upload`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];
  
  // Image detail pages (latest 1000)
  try {
    const { data: images } = await supabase
      .from('images')
      .select('id, crawled_at')
      .order('crawled_at', { ascending: false })
      .limit(1000);
    
    if (images) {
      for (const img of images) {
        routes.push({
          url: `${baseUrl}/image/${img.id}`,
          lastModified: new Date(img.crawled_at),
          changeFrequency: 'monthly',
          priority: 0.5,
        });
      }
    }
  } catch (e) {
    console.error('Sitemap error:', e);
  }
  
  return routes;
}
