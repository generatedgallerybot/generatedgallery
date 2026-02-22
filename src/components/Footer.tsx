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
              AI art from across the internet. Free to browse, search, and download. No account needed.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h4 className="text-[11px] uppercase tracking-widest text-white/40">Explore</h4>
            <div className="flex flex-col gap-2">
              <a href="/" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">Browse</a>
              <a href="/trending" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">Trending</a>
              <a href="/upload" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">Submit</a>
            </div>
          </div>

          {/* Open Source */}
          <div className="space-y-3">
            <h4 className="text-[11px] uppercase tracking-widest text-white/40">Open Source</h4>
            <div className="flex flex-col gap-2">
              <a href="https://github.com/justacatbot/generatedgallery" target="_blank" rel="noopener noreferrer" className="text-[13px] text-white/50 hover:text-white/80 transition-colors">GitHub</a>
            </div>
            <p className="text-[12px] text-white/30 pt-4">&copy; {new Date().getFullYear()} Generated Gallery</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
