const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Category mapping for auto-categorization
const categoryMap = {
  'portrait': 'portraits',
  'landscape': 'landscapes',
  'architecture': 'architecture',
  'abstract': 'abstract',
  'animal': 'animals',
  'food': 'food',
  'fashion': 'fashion',
  'interior': 'interior-design',
  'car': 'vehicles',
  'vehicle': 'vehicles',
  'fantasy': 'fantasy',
  'scifi': 'sci-fi',
  'sci-fi': 'sci-fi',
  'anime': 'anime',
  'photorealistic': 'photorealistic',
  'digital art': 'digital-art',
  '3d': '3d-render',
  'render': '3d-render',
};

// Tag extraction from prompts
function extractTags(prompt) {
  if (!prompt) return [];
  
  const commonTags = [
    'portrait', 'landscape', 'abstract', 'photorealistic', 'anime', 'fantasy',
    'cyberpunk', 'steampunk', 'digital art', '3d render', 'concept art',
    'character design', 'environment', 'architecture', 'nature', 'urban',
    'futuristic', 'retro', 'vintage', 'modern', 'minimalist', 'detailed'
  ];
  
  const tags = [];
  const lowerPrompt = prompt.toLowerCase();
  
  commonTags.forEach(tag => {
    if (lowerPrompt.includes(tag.toLowerCase())) {
      tags.push(tag);
    }
  });
  
  return tags;
}

// Auto-categorize based on prompt
function categorizeImage(prompt, tags) {
  if (!prompt) return null;
  
  const lowerPrompt = prompt.toLowerCase();
  
  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (lowerPrompt.includes(keyword) || tags.some(tag => tag.toLowerCase().includes(keyword))) {
      return category;
    }
  }
  
  return null;
}

// Check if image already exists (disabled due to slow queries - use upsert instead)
async function imageExists(sourceUrl) {
  // Disabled: causes statement timeouts on large tables
  // Use ON CONFLICT DO NOTHING in insert instead
  return false;
}

// Insert image into database (simple insert, unique index handles dupes)
async function insertImage(imageData) {
  try {
    const { data, error } = await supabase
      .from('images')
      .insert(imageData);
    
    if (error) {
      // Ignore duplicate key errors (unique constraint violation)
      if (error.code === '23505') {
        return true; // Treat as success - duplicate
      }
      console.error('Failed to insert image:', error);
      return false;
    }
    
    console.log(`✅ Inserted image: ${imageData.title || imageData.prompt?.slice(0, 50) || 'Unknown'}`);
    return true;
  } catch (error) {
    console.error('Failed to insert image:', error);
    return false;
  }
}

// Lexica.art crawler
async function crawlLexica(limit = 50) {
  console.log('🔍 Crawling Lexica.art...');
  
  try {
    // Lexica API endpoint (this is a public API)
    const queries = ['product photography', 'landscape', 'portrait', 'fantasy art', 'architecture', 'animals', 'digital art', 'sci-fi'];
    const q = queries[Math.floor(Math.random() * queries.length)];
    const response = await fetch(`https://lexica.art/api/v1/search?q=${encodeURIComponent(q)}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GeneratedGallery/1.0)'
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch from Lexica:', response.statusText);
      return 0;
    }
    
    const data = await response.json();
    let inserted = 0;
    
    for (const item of data.images?.slice(0, limit) || []) {
      try {
        // Skip imageExists check - unique index on source_url handles dedup at DB level
        const tags = extractTags(item.prompt);
        const category = categorizeImage(item.prompt, tags);
        
        const imageData = {
          title: null,
          description: null,
          prompt: item.prompt || null,
          negative_prompt: item.negativePrompt || null,
          model: item.model || 'Lexica Aperture',
          source_url: item.srcURL || item.src,
          source_site: 'lexica.art',
          image_url: item.srcURL || item.src,
          thumbnail_url: item.srcURL || item.src, // Lexica serves optimized images
          width: item.width || null,
          height: item.height || null,
          tags: tags,
          category: category,
          upvotes: 0,
          downloads: 0,
          views: 0,
          is_nsfw: item.nsfw || false,
          crawled_at: new Date().toISOString(),
        };
        
        if (await insertImage(imageData)) {
          inserted++;
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error('Error processing Lexica item:', error);
      }
    }
    
    console.log(`📊 Lexica.art: ${inserted} images inserted`);
    return inserted;
    
  } catch (error) {
    console.error('Error crawling Lexica:', error);
    return 0;
  }
}

// Civitai crawler
async function crawlCivitai(limit = 50, forceSort = null, includeNsfw = false, startCursor = undefined) {
  console.log(`🔍 Crawling Civitai (${includeNsfw ? 'NSFW' : 'SFW'}${startCursor ? ', cursor=' + startCursor : ''})...`);
  
  try {
    const sort = forceSort || 'Newest';
    const period = 'Day';
    const nsfwParam = includeNsfw ? 'true' : 'None';
    let url = `https://civitai.com/api/v1/images?limit=${limit}&sort=${encodeURIComponent(sort)}&period=${period}&nsfw=${nsfwParam}`;
    if (startCursor) url += `&cursor=${startCursor}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GeneratedGallery/1.0)'
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch from Civitai:', response.statusText);
      return 0;
    }
    
    const data = await response.json();
    let inserted = 0;
    
    for (const item of data.items || []) {
      try {
        // Skip imageExists check - unique index on source_url handles dedup at DB level
        const meta = item.meta || {};
        const tags = extractTags(meta.prompt);
        const category = categorizeImage(meta.prompt, tags);
        
        // Determine media type from Civitai's type field or URL extension
        const mediaType = item.type === 'video' ? 'video' 
          : /\.(mp4|webm|mov)(\?|$)/i.test(item.url) ? 'video'
          : /\.gif(\?|$)/i.test(item.url) ? 'gif'
          : 'image';

        // Civitai nsfwLevel: "None", "Soft", "Mature", "X" (string, not number)
        const nsfwLevels = { 'None': 0, 'Soft': 1, 'Mature': 2, 'X': 3 };
        const nsfwScore = nsfwLevels[item.nsfwLevel] ?? 0;
        const isNsfw = item.nsfw === true || nsfwScore >= 2;

        const imageData = {
          title: null,
          description: null,
          prompt: meta.prompt || null,
          negative_prompt: meta.negativePrompt || null,
          model: meta.Model || meta.model || null,
          source_url: item.url,
          source_site: 'civitai.com',
          image_url: item.url,
          thumbnail_url: item.url,
          width: item.width || null,
          height: item.height || null,
          tags: tags,
          category: category,
          media_type: mediaType,
          upvotes: 0,
          downloads: 0,
          views: 0,
          is_nsfw: isNsfw,
          crawled_at: new Date().toISOString(),
        };
        
        if (await insertImage(imageData)) {
          inserted++;
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        console.error('Error processing Civitai item:', error);
      }
    }
    
    // Get next cursor from metadata
    const nextCursor = data.metadata?.nextCursor || null;
    console.log(`📊 Civitai: ${inserted} new (${(data.items||[]).length} fetched, next: ${nextCursor || 'none'})`);
    return { inserted, nextCursor };
    
  } catch (error) {
    console.error('Error crawling Civitai:', error);
    return { inserted: 0, nextCursor: null };
  }
}

// Update category counts
async function updateCategoryCounts() {
  console.log('📊 Updating category counts...');
  
  try {
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('slug');
    
    if (categoriesError) {
      console.error('Failed to fetch categories:', categoriesError);
      return;
    }
    
    for (const category of categories) {
      const { count, error } = await supabase
        .from('images')
        .select('*', { count: 'exact', head: true })
        .eq('category', category.slug);
      
      if (!error) {
        await supabase
          .from('categories')
          .update({ count: count || 0 })
          .eq('slug', category.slug);
      }
    }
    
    console.log('✅ Category counts updated');
  } catch (error) {
    console.error('Error updating category counts:', error);
  }
}

// PromptHero crawler — scrapes homepage HTML (no public API)
async function crawlPromptHero(limit = 25) {
  console.log('🔍 Crawling PromptHero (HTML scrape)...');
  
  try {
    // Scrape different pages for variety
    const pages = ['/', '/top', '/new', '/search?q=landscape', '/search?q=portrait', '/search?q=fantasy', '/search?q=sci-fi', '/search?q=architecture'];
    const page = pages[Math.floor(Math.random() * pages.length)];
    
    const response = await fetch(`https://prompthero.com${page}`, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html'
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch from PromptHero:', response.statusText);
      return 0;
    }
    
    const html = await response.text();
    let inserted = 0;
    
    // Extract prompt slugs and CDN image URLs from HTML
    const slugRegex = /\/prompt\/([a-f0-9]+)-([^"\\]+)/g;
    const cdnRegex = /https:\/\/cdn\.prompthero\.com\/[a-z0-9]+-([^"\\]+\.(?:png|jpg|webp))/g;
    
    // Build a map of slugs (deduplicated by id)
    const slugMap = new Map();
    let match;
    while ((match = slugRegex.exec(html)) !== null) {
      if (!slugMap.has(match[1])) {
        slugMap.set(match[1], { id: match[1], slug: match[2], fullPath: match[0] });
      }
    }
    
    // Build a map of CDN images keyed by slug text (without extension)
    const cdnBySlug = new Map();
    const cdnFullRegex = /https:\/\/cdn\.prompthero\.com\/[a-z0-9]+-([^\x22\\]+\.(?:png|jpg|webp))/g;
    while ((match = cdnFullRegex.exec(html)) !== null) {
      const slugPart = match[1].replace(/\.(png|jpg|webp)$/, '');
      const fullUrl = match[0];
      cdnBySlug.set(slugPart, fullUrl);
    }
    
    const uniqueSlugs = [...slugMap.values()].slice(0, limit);
    
    for (let i = 0; i < uniqueSlugs.length; i++) {
      try {
        const { id, slug, fullPath } = uniqueSlugs[i];
        
        // Reconstruct prompt from slug (replace hyphens with spaces)
        const promptFromSlug = slug.replace(/-/g, ' ');
        
        // Try to find matching CDN image by slug text
        const matchingCdn = cdnBySlug.get(slug);
        if (!matchingCdn) continue;
        
        const sourceUrl = `https://prompthero.com${fullPath}`;
        if (await imageExists(sourceUrl)) continue;
        
        // Extract model from slug prefix (common patterns)
        let model = 'Unknown';
        const modelPatterns = ['midjourney', 'stable-diffusion', 'flux', 'dall-e', 'chatgpt-image', 'juggernaut', 'hero-10', 'nano-banana'];
        for (const mp of modelPatterns) {
          if (slug.startsWith(mp.replace(/-/g, '-'))) {
            model = mp.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            break;
          }
        }
        
        const tags = extractTags(promptFromSlug);
        const category = categorizeImage(promptFromSlug, tags);
        const nsfw = promptFromSlug.match(/nsfw|nude|naked|explicit|erotic/) ? true : false;
        
        const imageData = {
          title: promptFromSlug.slice(0, 100),
          prompt: promptFromSlug,
          model: model,
          source_url: sourceUrl,
          source_site: 'prompthero',
          image_url: matchingCdn,
          thumbnail_url: matchingCdn,
          width: null,
          height: null,
          tags,
          category,
          is_nsfw: nsfw,
          crawled_at: new Date().toISOString()
        };
        
        if (await insertImage(imageData)) inserted++;
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        // skip individual items
      }
    }
    
    console.log(`📊 PromptHero: ${inserted} images inserted`);
    return inserted;
  } catch (error) {
    console.error('Error crawling PromptHero:', error.message || error);
    return 0;
  }
}

// OpenArt crawler — disabled (SPA, no public API, needs browser)
async function crawlOpenArt(limit = 25) {
  console.log('⏭️  OpenArt: skipped (SPA, no public API)');
  return 0;
}

// Main crawler function
async function runCrawler() {
  console.log('🚀 Starting GeneratedGallery crawler...');
  
  const startTime = Date.now();
  let totalInserted = 0;
  
  // Civitai: paginate through ALL new content until we hit duplicates
  // Do SFW and NSFW separately, keep going until a page returns 0 new inserts
  for (const nsfw of [false, true]) {
    let cursor = undefined;
    let consecutiveEmpty = 0;
    let nsfwInserted = 0;
    const maxPages = 20; // safety cap
    console.log(`🚀 Starting ${nsfw ? 'NSFW' : 'SFW'} crawl...`);
    for (let page = 0; page < maxPages; page++) {
      const { inserted, nextCursor } = await crawlCivitai(20, 'Newest', nsfw, cursor);
      nsfwInserted += inserted;
      totalInserted += inserted;
      if (inserted === 0) {
        consecutiveEmpty++;
        if (consecutiveEmpty >= 2) break; // 2 empty pages = caught up
      } else {
        consecutiveEmpty = 0;
      }
      if (!nextCursor) break;
      cursor = nextCursor;
      await new Promise(r => setTimeout(r, 1500));
    }
    console.log(`📊 Civitai ${nsfw ? 'NSFW' : 'SFW'}: ${nsfwInserted} new images (cumulative: ${totalInserted})`);
  }
  
  // PromptHero — HTML scrape
  try {
    const phCount = await crawlPromptHero(25);
    totalInserted += phCount;
  } catch (e) {
    console.error('PromptHero error:', e.message);
  }
  
  // Update category counts
  await updateCategoryCounts();
  
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  console.log('');
  console.log('🎉 Crawler completed!');
  console.log(`📊 Total images inserted: ${totalInserted}`);
  console.log(`⏱️  Time taken: ${duration}s`);
  console.log('');
}

// Run the crawler
if (require.main === module) {
  runCrawler().catch(console.error);
}

module.exports = {
  runCrawler,
  crawlLexica,
  crawlCivitai,
  crawlPromptHero,
  crawlOpenArt,
  updateCategoryCounts
};