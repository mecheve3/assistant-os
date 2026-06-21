export default function ProjectsLoading() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-2.5 w-16 bg-raised rounded mb-2 animate-pulse" />
          <div className="h-6 w-36 bg-raised rounded animate-pulse" />
        </div>
        <div className="h-4 w-48 bg-raised rounded animate-pulse hidden sm:block" />
      </div>

      <div className="space-y-0">
        {/* Header row */}
        <div className="flex gap-4 pb-3 border-b border-line">
          {[120, 80, 100, 80, 200, 80].map((w, i) => (
            <div
              key={i}
              className="h-2.5 bg-raised rounded animate-pulse"
              style={{ width: w }}
            />
          ))}
        </div>

        {/* Data rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 py-4 border-b border-line/40"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="w-8 h-8 bg-raised rounded animate-pulse" />
            <div className="h-4 w-28 bg-raised rounded animate-pulse" />
            <div className="h-4 w-16 bg-raised rounded animate-pulse" />
            <div className="h-4 w-24 bg-raised rounded animate-pulse" />
            <div className="h-3 w-20 bg-raised rounded animate-pulse" />
            <div className="h-3 w-40 bg-raised rounded animate-pulse hidden lg:block" />
            <div className="h-3 w-16 bg-raised rounded animate-pulse hidden md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
