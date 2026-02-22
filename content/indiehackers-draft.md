# Show IH: I built a free AI art gallery with 276k+ images

## The Problem

AI image generation blew up. Millions of people making incredible stuff with Stable Diffusion, Midjourney, DALL-E, you name it. But actually finding and browsing all that work? Painful.

Images are buried in Discord servers, scattered across subreddits, and mixed into model hosting sites where the UI is designed for uploading, not browsing. There was no "Unsplash for AI art" where you could just go look at cool stuff.

## What I Built

[GeneratedGallery.com](https://generatedgallery.com) - a free, searchable gallery of 276,000+ AI-generated images.

You can search by prompt, model, or style. Browse by category. Toggle NSFW on or off. Hit shuffle when you just want to see random cool stuff. The site even learns what you like over time and shows you more of it.

No account required. No paywall. Just a big organized collection of AI art.

## The Tech

- **Next.js 14** (App Router) for frontend and API
- **Supabase** (PostgreSQL) for the database
- **Tailwind CSS** for styling
- **Vercel** for hosting

Images are sourced primarily by crawling the Civitai API. I wrote a crawler that pulls images, metadata, prompts, and tags, then stores everything in Supabase. It runs on a schedule to pick up new content.

The biggest technical challenges were around performance at scale. 276k rows with full-text search requires careful indexing. I switched from offset-based to cursor-based pagination which made a huge difference. Also spent a lot of time on media type detection because not every URL that claims to be an image actually is one.

## Results So Far

- 276k+ images indexed and growing
- Site is live and free at [generatedgallery.com](https://generatedgallery.com)
- Search and browse performance is solid even at this scale
- Getting steady organic traffic from people searching for AI art

## What's Next

- Adding more image sources beyond Civitai (DeviantArt, ArtStation, etc.)
- Better recommendation engine
- Community features like collections and favorites
- Exploring ways to include prompt/generation metadata more prominently

Would love feedback from the IH community. What would make something like this more useful for you? And if you work with AI images at all, go check it out and let me know what you think.

[generatedgallery.com](https://generatedgallery.com)
