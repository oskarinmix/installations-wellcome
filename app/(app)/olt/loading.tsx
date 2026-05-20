export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-6 w-40 rounded-md bg-muted" />
        <div className="h-4 w-64 rounded-md bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-5 space-y-3">
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-7 w-28 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
