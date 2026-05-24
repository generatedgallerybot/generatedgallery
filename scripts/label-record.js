const LABELER_VERSION = 'generatedgallery-rules-v0.2.0';

const SUBJECT_RULES = [
  ['person', /\b(1girl|1boy|woman|man|person|people|portrait|face|girl|boy|female|male|human|character)\b/i],
  ['animal', /\b(cat|dog|horse|bird|wolf|fox|lion|tiger|dragon|animal|pet)\b/i],
  ['vehicle', /\b(car|truck|motorcycle|bike|bicycle|spaceship|ship|boat|train|airplane|jet|vehicle)\b/i],
  ['landscape', /\b(landscape|mountain|forest|river|ocean|beach|desert|valley|waterfall|sunset|skyline)\b/i],
  ['architecture', /\b(building|house|interior|room|city|architecture|castle|temple|street|apartment)\b/i],
  ['product', /\b(product|bottle|sneaker|shoe|bag|watch|jewelry|furniture|chair|lamp|packaging)\b/i],
  ['food', /\b(food|meal|burger|pizza|cake|coffee|drink|fruit|dessert|restaurant)\b/i],
  ['robot', /\b(robot|android|cyborg|mecha|mechanical)\b/i]
];

const STYLE_RULES = [
  ['anime', /\b(anime|manga|waifu|chibi|1girl|1boy|bishoujo)\b/i],
  ['photorealistic', /\b(photo(realistic)?|photography|dslr|35mm|85mm|f\/\d|cinestill|kodak|raw photo)\b/i],
  ['cinematic', /\b(cinematic|film still|movie still|dramatic lighting|anamorphic|color grading)\b/i],
  ['3d-render', /\b(3d|octane|blender|unreal engine|c4d|render|cgi|ray tracing)\b/i],
  ['pixel-art', /\b(pixel art|8-bit|16-bit|sprite)\b/i],
  ['watercolor', /\b(watercolor|watercolour|gouache)\b/i],
  ['oil-painting', /\b(oil painting|impasto|canvas painting)\b/i],
  ['line-art', /\b(line art|ink drawing|sketch|black and white drawing)\b/i],
  ['fantasy', /\b(fantasy|wizard|elf|dragon|magic|spell|mythical)\b/i],
  ['sci-fi', /\b(sci-fi|science fiction|cyberpunk|futuristic|space station|spaceship)\b/i]
];

const AESTHETIC_RULES = [
  ['dark', /\b(dark|noir|gothic|shadow|moody|black background)\b/i],
  ['pastel', /\b(pastel|soft colors|soft colour|kawaii)\b/i],
  ['neon', /\b(neon|glowing|cyberpunk|synthwave)\b/i],
  ['minimal', /\b(minimal|minimalist|clean background|simple background)\b/i],
  ['high-detail', /\b(highly detailed|intricate|ultra detailed|masterpiece|best quality)\b/i],
  ['vintage', /\b(vintage|retro|old photo|film grain|analog)\b/i]
];

const MEDIUM_RULES = [
  ['photo', /\b(photo|photography|dslr|camera|lens|raw photo)\b/i],
  ['illustration', /\b(illustration|drawing|artwork|digital art|concept art)\b/i],
  ['painting', /\b(painting|watercolor|oil painting|gouache|acrylic)\b/i],
  ['poster', /\b(poster|cover art|album cover|movie poster)\b/i],
  ['render', /\b(render|3d|cgi|octane|blender|unreal engine)\b/i]
];

const COMPOSITION_RULES = [
  ['portrait', /\b(portrait|headshot|close-up|closeup|face)\b/i],
  ['full-body', /\b(full body|standing pose|head to toe)\b/i],
  ['wide-shot', /\b(wide shot|landscape|panorama|establishing shot)\b/i],
  ['macro', /\b(macro|extreme close-up|detail shot)\b/i],
  ['isometric', /\b(isometric|orthographic)\b/i]
];

const USE_CASE_RULES = [
  ['wallpaper', /\b(wallpaper|background|desktop background)\b/i],
  ['character-reference', /\b(character|oc|reference sheet|turnaround|full body)\b/i],
  ['product-mockup', /\b(product|mockup|packshot|commercial photography|ecommerce)\b/i],
  ['concept-art', /\b(concept art|environment design|creature design|vehicle design)\b/i],
  ['social-avatar', /\b(profile picture|avatar|pfp|headshot)\b/i]
];

const QUALITY_RULES = [
  ['watermark', /\b(watermark|signature|logo|artist name)\b/i],
  ['text-artifacts', /\b(text|letters|caption|typography|words)\b/i],
  ['bad-hands', /\b(bad hands|deformed hands|extra fingers|missing fingers)\b/i],
  ['low-detail', /\b(low quality|lowres|blurry|jpeg artifacts|worst quality|low effort)\b/i],
  ['anatomy-issues', /\b(bad anatomy|deformed|mutated|extra limbs|missing limb)\b/i]
];

function unique(values, limit = 20) {
  return [...new Set(values.filter(Boolean))].slice(0, limit);
}

function matches(text, rules) {
  return rules.filter(([, regex]) => regex.test(text)).map(([label]) => label);
}

function inferModelFamily(model, text) {
  const source = `${model || ''} ${text || ''}`.toLowerCase();
  if (/sdxl|stable diffusion xl|pony diffusion|juggernaut|realvisxl|animagine/.test(source)) return 'stable-diffusion-xl';
  if (/stable diffusion|\bsd\s?1\.?5\b|\bsd\s?2\b|checkpoint|lora|civitai/.test(source)) return 'stable-diffusion';
  if (/midjourney|\b--v\s?6\b|\b--ar\b/.test(source)) return 'midjourney';
  if (/dall[ -]?e|openai/.test(source)) return 'dall-e';
  if (/flux|black forest labs/.test(source)) return 'flux';
  return null;
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function scoreConfidence(labels, text) {
  if (labels.length === 0) return 0;
  const promptBonus = text.length > 60 ? 0.14 : 0;
  return Number(clamp(0.55 + promptBonus + Math.min(labels.length, 4) * 0.06).toFixed(2));
}

function qualityScore(record, qualityFlags) {
  let score = 0.5;
  const prompt = record.generation?.prompt || '';
  const width = record.media?.width || 0;
  const height = record.media?.height || 0;
  const views = record.stats?.views || 0;
  const upvotes = record.stats?.upvotes || 0;
  const downloads = record.stats?.downloads || 0;

  if (prompt.length > 40) score += 0.12;
  if (prompt.length > 160) score += 0.08;
  if (width >= 768 && height >= 768) score += 0.08;
  if (width >= 1024 && height >= 1024) score += 0.06;
  if (upvotes > 0) score += Math.min(0.12, upvotes * 0.01);
  if (downloads > 0) score += Math.min(0.08, downloads * 0.005);
  if (views > 50) score += 0.04;
  if (!prompt) score -= 0.18;
  if (record.safety?.nsfw) score -= 0.05;
  if (qualityFlags.includes('low-detail')) score -= 0.14;
  if (qualityFlags.includes('anatomy-issues')) score -= 0.08;
  if (qualityFlags.includes('watermark')) score -= 0.06;

  return Number(clamp(score).toFixed(3));
}

function labelRecord(record) {
  const prompt = record.generation?.prompt || '';
  const negativePrompt = record.generation?.negativePrompt || '';
  const tags = Array.isArray(record.taxonomy?.tags) ? record.taxonomy.tags.join(' ') : '';
  const category = record.taxonomy?.category || '';
  const title = record.title || '';
  const description = record.description || '';
  const positiveText = [prompt, tags, category, title, description].filter(Boolean).join(' ');
  const allText = [positiveText, negativePrompt].filter(Boolean).join(' ');

  const subjects = unique(matches(positiveText, SUBJECT_RULES));
  const styles = unique([...matches(positiveText, STYLE_RULES), category && STYLE_RULES.some(([label]) => label === category) ? category : null]);
  const aesthetic = unique(matches(positiveText, AESTHETIC_RULES));
  const medium = unique(matches(positiveText, MEDIUM_RULES));
  const composition = unique(matches(positiveText, COMPOSITION_RULES));
  const useCases = unique(matches(positiveText, USE_CASE_RULES));
  const qualityFlags = unique(matches(positiveText, QUALITY_RULES));
  const avoidanceFlags = unique(matches(negativePrompt, QUALITY_RULES));
  const safety = record.safety?.nsfw ? ['nsfw'] : ['sfw'];
  const modelFamily = inferModelFamily(record.generation?.model, `${positiveText} ${record.source?.site || ''}`);

  return {
    subjects,
    styles,
    aesthetic,
    medium,
    composition,
    use_cases: useCases,
    quality_flags: qualityFlags,
    avoidance_flags: avoidanceFlags,
    safety,
    model_family: modelFamily,
    confidence: {
      subjects: scoreConfidence(subjects, positiveText),
      styles: scoreConfidence(styles, positiveText),
      quality_flags: scoreConfidence(qualityFlags, positiveText)
    },
    quality_score: qualityScore(record, qualityFlags),
    labeler: LABELER_VERSION
  };
}

function enrichRecord(record) {
  return {
    ...record,
    protocolVersion: '0.2.0',
    labels: labelRecord(record),
    rights: {
      metadata: 'CC0 where possible',
      media: 'upstream terms apply',
      training_use: 'unknown',
      notes: 'GeneratedGallery exports metadata and source URLs. Verify upstream media rights before image training or redistribution.'
    },
    provenance: {
      source_site: record.source?.site || null,
      source_url: record.source?.url || record.url || null,
      indexed_by: 'generatedgallery.com',
      indexed_at: record.indexedAt || null
    }
  };
}

module.exports = { LABELER_VERSION, labelRecord, enrichRecord };
