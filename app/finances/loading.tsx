export default function FinancesLoading() {
  return (
    <div className="p-4 lg:p-6">
      {/* Tab bar skeleton */}
      <div className="flex gap-4 border-b border-line mb-6 pb-2.5">
        {[60, 80, 50].map((w, i) => (
          <div key={i} className="h-3 bg-raised rounded animate-pulse" style={{ width: w }} />
        ))}
      </div>

      {/* Net worth bar skeleton */}
      <div className="bg-card border border-line rounded-lg p-5 mb-4">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-2.5 w-20 bg-raised rounded animate-pulse mb-2" />
              <div className="h-7 w-32 bg-raised rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* 2-column skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2].map((col) => (
          <div key={col} className="space-y-4">
            <div className="bg-card border border-line rounded-lg p-4 h-48 animate-pulse" />
            <div className="bg-card border border-line rounded-lg p-4 h-40 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
