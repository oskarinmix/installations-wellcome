export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-6 w-16 rounded-md bg-muted" />
          <div className="h-3.5 w-32 rounded bg-muted" />
        </div>
        <div className="h-8 w-24 rounded-md bg-muted" />
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-4 flex items-center gap-4">
            <div className="size-9 rounded-md bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-48 rounded bg-muted" />
            </div>
            <div className="flex gap-1">
              <div className="size-7 rounded bg-muted" />
              <div className="size-7 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
