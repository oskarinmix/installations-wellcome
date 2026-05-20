export default function Loading() {
  return (
    <div className="space-y-6 max-w-2xl animate-pulse">
      <div className="space-y-3">
        <div className="h-3.5 w-24 rounded bg-muted" />
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-7 w-44 rounded-md bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
          </div>
          <div className="h-9 w-28 rounded-md bg-muted" />
        </div>
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex gap-2">
            <div className="size-3.5 rounded bg-muted" />
            <div className="h-3.5 w-28 rounded bg-muted" />
          </div>
          <div className="px-4 divide-y divide-border">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="flex justify-between py-2.5">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
