export function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-20">
      <div className="flex gap-1.5">
        <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
