'use client';

export function Footer() {
  return (
    <footer className="border-t border-white/[0.1] mt-24">
      <div className="max-w-[1800px] mx-auto px-6 lg:px-10 py-16">
        <div className="grid md:grid-cols-3 gap-10">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-accent/10 border border-accent/15 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-accent/60">
                  <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
                  <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
                  <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                </svg>
              </div>
              <span className="font-display text-sm font-medium text-white/60">Generated Gallery</span>
            </div>
            <p className="text-[13px] text-white/40 leading-relaxed max-w-xs">
              A free AI art gallery from across the internet. Browse prompts, search generated images, and download favorites. No account needed.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h4 className="text-[11px] uppercase tracking-widest text-white/40">Explore</h4>
            <div className="flex flex-col gap-2">
              <a href="/" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">Browse AI images</a>
              <a href="/ai-art-gallery" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">Free AI art gallery</a>
              <a href="/ai-image-prompts" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">AI image prompts</a>
              <a href="/ai-image-dataset" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">AI image dataset</a>
              <a href="/search/free-ai-art" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">Free AI art</a>
              <a href="/search/stable-diffusion-prompts" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">Stable Diffusion prompts</a>
              <a href="/trending" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">Trending AI images</a>
              <a href="/daily" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">Daily best AI images</a>
              <a href="/machine-dream-finds" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">Machine Dream Finds</a>
              <a href="/galleries" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">Public AI image galleries</a>
              <a href="/protocol" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">Open AI dataset</a>
              <a href="/protocol/creator-kit" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">Creator kit</a>
              <a href="/style/portraits" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">AI portraits</a>
              <a href="/prompts/anime-girl" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">Anime girl prompts</a>
              <a href="/model/sdxl" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">SDXL prompts</a>
              <a href="/source/civitai" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">Civitai AI images</a>
              <a href="/upload" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">Submit</a>
            </div>
          </div>

          {/* Open Source */}
          <div className="space-y-3">
            <h4 className="text-[11px] uppercase tracking-widest text-white/40">Open Source</h4>
            <div className="flex flex-col gap-2">
              <a href="https://github.com/generatedgallerybot/generatedgallery" target="_blank" rel="noopener noreferrer" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">GitHub</a>
              <a href="https://github.com/generatedgallerybot/generated-media-protocol" target="_blank" rel="noopener noreferrer" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">Generated media protocol</a>
            </div>
            <p className="text-[12px] text-white/30 pt-4">&copy; {new Date().getFullYear()} Generated Gallery</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
