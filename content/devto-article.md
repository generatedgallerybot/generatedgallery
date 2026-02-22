---
title: How I Built a Gallery of 276,000+ AI-Generated Images
published: false
tags: nextjs, ai, webdev, opensource
---

# How I Built a Gallery of 276,000+ AI-Generated Images

I wanted an Unsplash for AI art. A place where you could browse, search, and discover AI-generated images without wading through Reddit threads or Discord servers. So I built [GeneratedGallery.com](https://generatedgallery.com).

It now has over 276,000 images and growing. Here's how I put it together.

## The Problem

AI image generation exploded over the past couple years. Millions of people are creating incredible stuff with Stable Diffusion, Midjourney, DALL-E, and other tools. But finding and browsing that work? Still a mess.

Images are scattered across Discord servers, subreddits, and model hosting sites. There's no central place to just... look at AI art. Browse it. Get inspired. Find stuff you didn't know you were looking for.

I wanted to fix that.

## The Stack

Nothing fancy here:

- **Next.js 14** with App Router for the frontend and API routes
- **Supabase** for the database (PostgreSQL) and auth
- **Tailwind CSS** for styling
- **Vercel** for hosting

I picked this stack because it's fast to build with and scales well enough for what I needed. Supabase in particular made the database side painless. Row-level security, real-time subscriptions, and a generous free tier to start with.

## Getting 276k Images

The bulk of the images come from crawling the [Civitai](https://civitai.com) API. Civitai is the biggest community hub for Stable Diffusion models and the images people create with them.

Their API is pretty straightforward. I wrote a crawler that:

1. Paginates through their image endpoint
2. Pulls metadata (prompt, model used, dimensions, NSFW rating, tags)
3. Stores everything in Supabase
4. Runs on a schedule to pick up new images

The tricky part was being a good API citizen. Rate limiting, exponential backoff, and not hammering their servers. I also had to handle pagination cursors carefully because their API uses cursor-based pagination and if you mess that up you end up re-fetching the same pages forever.

```javascript
async function crawlImages(cursor = null) {
  const params = new URLSearchParams({
    limit: '100',
    sort: 'Newest',
    ...(cursor && { cursor })
  });

  const response = await fetch(
    `https://civitai.com/api/v1/images?${params}`
  );

  const data = await response.json();

  // Store images in Supabase
  await supabase.from('images').upsert(
    data.items.map(transformImage),
    { onConflict: 'external_id' }
  );

  // Continue with next page
  if (data.metadata?.nextCursor) {
    await sleep(1000); // Be nice
    return crawlImages(data.metadata.nextCursor);
  }
}
```

## Features That Actually Matter

### Search

Full-text search across prompts, tags, and model names. Supabase has built-in full-text search with PostgreSQL's `tsvector`, which works great once you set up the right indexes.

### Categories

Images are organized by what was used to create them and what they depict. You can browse by model, by style, by subject. This took a lot of tagging work but it makes the browsing experience way better than just an infinite scroll of random stuff.

### NSFW Toggle

AI art communities produce a lot of NSFW content. Rather than pretending it doesn't exist or blocking it entirely, there's a toggle. Off by default, easy to turn on if you want. Civitai's API includes NSFW ratings which made this relatively simple to implement.

### Shuffle Mode

Sometimes you don't know what you want. Hit shuffle and get a random selection. This is surprisingly fun and one of the features people use the most. Under the hood it's just a random offset query, but it feels like discovering something new every time.

### Preference Learning

The site watches what you click on and browse, then gradually surfaces more of what you seem to like. Nothing creepy, no accounts required. It's all done with local storage and some simple scoring on the backend. If you keep clicking on anime-style portraits, you'll start seeing more of those.

## The Hard Parts

### Media Type Detection

Not every URL that looks like an image is actually an image. Some are videos. Some are broken. Some redirect to login pages. I had to build a pipeline that checks content types, validates dimensions, and filters out anything that isn't actually a usable image.

The worst offenders were URLs that returned a 200 status code with an HTML error page instead of the actual image. You can't just check the status code. You have to check the Content-Type header and sometimes even the first few bytes of the response.

### Performance at Scale

276k images means a lot of database rows. The naive approach of `SELECT * FROM images ORDER BY created_at DESC LIMIT 20 OFFSET 1000` falls apart fast. PostgreSQL offset-based pagination gets slower the deeper you go.

I switched to cursor-based pagination on the frontend too, using the image ID as a cursor. Combined with proper indexes, this keeps page loads fast no matter how deep you scroll.

```sql
-- Instead of this (slow at high offsets)
SELECT * FROM images ORDER BY created_at DESC LIMIT 20 OFFSET 50000;

-- Do this (fast regardless of position)
SELECT * FROM images
WHERE created_at < $cursor_timestamp
ORDER BY created_at DESC
LIMIT 20;
```

### Database Indexing

With 276k+ rows and full-text search, indexes are everything. I spent more time tweaking indexes than I'd like to admit. The key ones:

- Composite index on `(created_at DESC, id)` for pagination
- GIN index on the `tsvector` column for full-text search
- Partial indexes for NSFW filtering (so queries with `WHERE nsfw = false` are fast)
- Index on `external_id` for upsert deduplication during crawls

Every time a query felt slow, the answer was almost always a missing or poorly designed index.

## What's Next

I'm working on adding more sources beyond Civitai. There's amazing AI art on DeviantArt, ArtStation, and various other platforms. The goal is to be the most comprehensive place to browse AI-generated images on the internet.

I'm also exploring better recommendation algorithms. The current preference learning is pretty basic. There's a lot of room to improve it without getting into creepy surveillance territory.

## Check It Out

[GeneratedGallery.com](https://generatedgallery.com) is free to use, no account required. Go browse some AI art.

If you're building something similar or have questions about the stack, drop a comment. Happy to chat about the technical details.
