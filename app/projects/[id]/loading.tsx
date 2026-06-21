export default function ProjectDetailLoading() {
  return (
    <div className="p-6">
      {/* Back link */}
      <div className="h-3 w-24 bg-raised rounded animate-pulse mb-5" />

      {/* Header card */}
      <div className="rounded-lg p-4 mb-6 border border-line space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-raised rounded animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-48 bg-raised rounded animate-pulse" />
            <div className="h-3 w-64 bg-raised rounded animate-pulse" />
          </div>
        </div>
        <div className="h-3 w-72 bg-raised rounded animate-pulse" />
      </div>

      {/* Stage pipeline */}
      <div className="bg-card border border-line rounded-lg p-4 mb-6">
        <div className="h-2.5 w-24 bg-raised rounded animate-pulse mb-4" />
        <div className="h-8 w-full bg-raised rounded animate-pulse" />
      </div>

      {/* Two-column */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="border-l-2 border-line pl-4 space-y-2 animate-pulse"
            >
              <div className="h-3 w-28 bg-raised rounded" />
              <div className="h-4 w-full bg-raised rounded" />
              <div className="h-4 w-3/4 bg-raised rounded" />
            </div>
          ))}
        </div>
        <div className="lg:w-72 space-y-4">
          <div className="bg-card border border-line rounded-lg p-4 h-24 animate-pulse" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-raised rounded p-3 h-16 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
