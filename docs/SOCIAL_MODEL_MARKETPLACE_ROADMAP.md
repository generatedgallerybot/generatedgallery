# GeneratedGallery Social + Model Marketplace Roadmap

GeneratedGallery should evolve from gallery/dataset into a Civitai-style community for generated media, LoRAs, checkpoints, prompts, and taste graphs.

## Thesis

The long-term competitor is not another static gallery. It is a social model/prompt marketplace where users can:

- publish generated images
- comment, follow, remix, and collect
- upload/share LoRAs, checkpoints, workflows, and prompt packs
- see examples generated with each asset
- build reputation around taste, curation, and model quality
- export metadata through the GG protocol/dataset

## Product pillars

### 1. Social layer

Minimal v1:

- comments on images, galleries, LoRAs, and generated outputs
- user profiles with display name, avatar, bio, links
- follow users
- activity feed: uploads, generations, liked/saved packs, comments
- report + admin moderation queue
- banned users cannot comment/upload/generate

Nice v2:

- threaded comments
- reactions beyond likes
- mentions
- notifications
- share cards
- creator leaderboards by saves/downloads/remixes

### 2. Model asset sharing

Support asset types:

- LoRA
- checkpoint
- embedding/textual inversion
- ControlNet/IP adapter
- ComfyUI workflow
- prompt pack
- style preset

For each asset:

- name, slug, description
- owner/user id
- base model/family
- trigger words
- recommended prompt/negative prompt
- recommended strength/settings
- preview images
- file URL or external source URL
- license/commercial terms
- NSFW flag
- moderation status
- stats: views, saves, downloads, generations, comments

Important: start with URL/external-source sharing before file hosting. File uploads need storage costs, malware scanning, copyright/ToS abuse handling, and quota rules.

### 3. Remix/generation loop

Every model asset should have obvious actions:

- generate with this LoRA
- remix this prompt
- publish result
- add result to gallery
- show "made with" relationship

This creates defensible graph data:

- asset -> generation jobs
- asset -> outputs
- output -> prompt/settings
- output -> comments/likes/saves
- user -> taste/follows/collections

### 4. Dataset/protocol integration

Social/model records should export through the protocol:

- comments stay private to GG API unless intentionally exported
- public assets export as metadata/provenance records
- model assets get schema extensions: `asset.type`, `asset.base_model`, `asset.trigger_words`, `asset.license`, `asset.source_url`
- generated outputs reference model assets used

## Suggested database tables

- `user_profiles`
  - id, display_name, username, avatar_url, bio, links, created_at
- `comments`
  - id, user_id, target_type, target_id, parent_id, body, status, created_at
- `follows`
  - follower_id, following_id, created_at
- `model_assets`
  - id, owner_id, type, name, slug, description, base_model, model_family, file_url, source_url, license, commercial_use, trigger_words, settings, is_nsfw, moderation_status, created_at
- `model_asset_previews`
  - id, asset_id, image_url, generation_output_id, sort_order
- `model_asset_events`
  - id, asset_id, user_id, event, metadata, created_at
- `reports`
  - id, reporter_id, target_type, target_id, reason, status, created_at

## Build order

### Phase 0, now

- Social auth: Google + GitHub buttons, Supabase provider config needed.
- Admin moderation: user ban/unban, generation outputs visible.
- Existing LoRA URL save/share page is the seed.

### Phase 1, smallest useful social

1. Public user profiles from auth users.
2. Comments on image detail pages and LoRA pages.
3. Report comment/image/asset.
4. Admin comment moderation and user ban enforcement.
5. Activity events for comment/create/save.

### Phase 2, model asset marketplace v1

1. Promote `user_loras` into public `model_assets` with types.
2. Add `/models` browse page and `/model-asset/[slug]` detail page.
3. Let users submit external LoRA/checkpoint URLs with metadata and previews.
4. "Generate with this" button preloads model asset into generator.
5. Public stats: views/saves/generations.

### Phase 3, Civitai-style network effects

1. Follow users and feed.
2. Remix graph and "made with" relationships.
3. Creator pages with assets, galleries, outputs.
4. Trending assets based on generations/saves, not just views.
5. Protocol exports for public assets and outputs.

## Guardrails

- Start URL-first, not arbitrary file uploads.
- Require auth for comments/uploads.
- Banned users cannot comment/upload/generate.
- NSFW defaults off.
- Add report/moderation before scaling uploads.
- Keep license/source fields mandatory for model assets.
- Do not host large model files until storage, quotas, scanning, and abuse paths are designed.

## Why this can compete

Civitai has scale, but GG can differentiate on:

- cleaner UX
- protocol/dataset exports
- agent-readable metadata
- better remix/generation loop
- lightweight social graph around taste
- curated/safer defaults
- model assets tied directly to generated outputs and prompts

The pounce: become the place where agents and humans can both understand generated media, not just scroll it.
