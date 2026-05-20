export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-6 w-44 rounded-md bg-muted" />
        <div className="h-3.5 w-64 rounded bg-muted" />
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="border-b border-border bg-muted/40 px-4 py-2.5 flex gap-8">
          {["PON", "Serial", "Modelo", ""].map((_, i) => (
            <div key={i} className="h-3 w-16 rounded bg-muted" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-8 px-4 py-3 border-b border-border last:border-0 items-center">
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="h-3 w-28 rounded bg-muted" />
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="ml-auto h-8 w-40 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
