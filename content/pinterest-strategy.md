# Pinterest Strategy - GeneratedGallery

## Board Names to Create

1. **AI Generated Art** - General best-of board, high quality picks across all styles
2. **AI Portraits** - Photorealistic and stylized human portraits
3. **AI Fantasy Art** - Dragons, castles, magical scenes, DnD vibes
4. **AI Landscapes** - Nature, cityscapes, sci-fi environments
5. **AI Anime & Manga** - Anime-style illustrations and characters
6. **AI Concept Art** - Game and film concept art style images
7. **AI Abstract Art** - Abstract, surreal, and experimental generations
8. **AI Architecture** - Buildings, interiors, futuristic structures
9. **AI Fashion** - AI-generated fashion, outfits, textile designs
10. **Stable Diffusion Showcase** - Best of SD specifically
11. **AI Art Inspiration** - Curated picks for creative inspiration
12. **AI Wallpapers** - High-res images good for desktop/phone wallpapers

## Pin Description Template

```
[Short description of what's in the image]. AI-generated art from GeneratedGallery.com, a free gallery of 276k+ AI images. Browse, search, and discover more at generatedgallery.com

#AIart #AIgenerated #[style tag] #[subject tag] #GeneratedGallery #StableDiffusion #AIillustration
```

**Example:**
```
Stunning fantasy castle on a floating island at sunset. AI-generated art from GeneratedGallery.com, a free gallery of 276k+ AI images. Browse, search, and discover more at generatedgallery.com

#AIart #AIgenerated #FantasyArt #Castle #GeneratedGallery #StableDiffusion #DigitalArt
```

## Automation Plan

### Approach: Scheduled Script with Pinterest API

1. **Query Supabase** for top-performing or recent high-quality images
   - Filter: SFW only, good dimensions (minimum 512x512), has tags
   - Sort by: engagement score or random selection from curated pool

2. **Generate pin metadata** from image data
   - Title: pull from first 100 chars of prompt or generate from tags
   - Description: use template above, fill in style/subject from tags
   - Board: map image tags/categories to the appropriate board
   - Link: `https://generatedgallery.com/image/[id]`

3. **Upload via Pinterest API**
   - Use Pinterest API v5 (requires business account)
   - POST to `/v5/pins` with image URL, title, description, board ID, link
   - Rate limit: 50 pins per day is a good starting pace, ramp to 100-150 over weeks

4. **Schedule**
   - Pin 10-15 images per day spread across boards
   - Best times: 8-11 PM EST and weekends for art content
   - Vary the boards, don't dump 15 pins on one board in one day

5. **Tracking**
   - Log which images have been pinned to avoid duplicates
   - Add a `pinned_at` column to the images table or a separate `pinterest_pins` table
   - Track click-throughs in analytics

### Alternative: Tailwind or Pinact

If the Pinterest API is too restrictive, use Tailwind (tailwindapp.com) for scheduling. It handles:
- Smart scheduling (finds optimal times)
- Interval pinning (spaces pins out naturally)
- Analytics
- Costs about $15/month for the basic plan

## SEO Keywords to Target

### High Volume
- ai generated art
- ai art gallery
- ai images
- stable diffusion art
- ai generated images
- free ai art

### Medium Volume
- ai artwork
- ai illustration
- ai portrait
- ai fantasy art
- ai landscape art
- ai anime art
- ai concept art
- stable diffusion images
- ai generated wallpaper

### Long Tail
- best ai generated art 2024
- free ai art gallery online
- browse ai images
- ai art inspiration
- stable diffusion showcase
- ai generated fantasy art
- ai portrait generator results
- beautiful ai art
- ai digital art gallery
- free stock ai images

### Pinterest-Specific Tags (use as hashtags)
#AIart #AIgenerated #StableDiffusion #Midjourney #DigitalArt #AIillustration #GeneratedGallery #AIportrait #FantasyArt #ConceptArt #AIwallpaper #ArtInspiration
