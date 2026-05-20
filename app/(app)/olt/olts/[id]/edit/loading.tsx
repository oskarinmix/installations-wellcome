export default function Loading() {
  return (
    <div className="space-y-6 max-w-sm animate-pulse">
      <div className="space-y-2">
        <div className="h-3.5 w-24 rounded bg-muted" />
        <div className="h-6 w-28 rounded-md bg-muted" />
        <div className="h-3.5 w-48 rounded bg-muted" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3.5 w-20 rounded bg-muted" />
            <div className="h-9 w-full rounded-md bg-muted" />
          </div>
        ))}
        <div className="h-9 w-full rounded-md bg-muted" />
      </div>
    </div>
  );
}
