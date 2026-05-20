export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-6 w-16 rounded-md bg-muted" />
          <div className="h-3.5 w-24 rounded bg-muted" />
        </div>
        <div className="h-9 w-24 rounded-md bg-muted" />
      </div>
      <div className="h-8 w-64 rounded-md bg-muted" />
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="border-b border-border bg-muted/40 px-3 py-2.5 flex gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-3 w-12 rounded bg-muted" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-6 px-3 py-2.5 border-b border-border last:border-0">
            {Array.from({ length: 9 }).map((_, j) => (
              <div key={j} className="h-3 w-12 rounded bg-muted" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
