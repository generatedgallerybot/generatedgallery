'use client';

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] mt-24">
      <div className="max-w-[1800px] mx-auto px-6 lg:px-10 py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <p className="font-display text-sm font-medium text-white/40">Generated Gallery</p>
            <p className="text-xs text-white/20">
              AI art from across the internet. Free to browse, search, and download.
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/20">
            <a href="https://github.com/justacatbot/generatedgallery" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">
              GitHub
            </a>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
