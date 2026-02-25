import { useState, useEffect } from 'react';

function SkeletonCard({ height }: { height: number }) {
  return (
    <div 
      className="rounded-2xl overflow-hidden animate-pulse"
      style={{ height }}
    >
      <div className="w-full h-full bg-gradient-to-br from-[#1a1918] via-[#242220] to-[#1a1918]" />
    </div>
  );
}

function SkeletonGrid() {
  const [skeletons, setSkeletons] = useState<{ id: number; height: number }[]>([]);
  
  useEffect(() => {
    // Generate skeleton cards with varied heights to mimic masonry
    const items = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      // Varied heights: mix of tall (portrait), medium, and short images
      height: [280, 220, 320, 240, 300, 260, 350, 230, 290, 270, 310, 250][i],
    }));
    setSkeletons(items);
  }, []);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {skeletons.map((item) => (
        <SkeletonCard key={item.id} height={item.height} />
      ))}
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="py-6">
      <SkeletonGrid />
      <div className="flex justify-center items-center gap-3 py-10">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-accent/30 animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-accent/30 animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-accent/30 animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
