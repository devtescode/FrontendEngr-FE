type ComponentGridSkeletonProps = {
  count?: number;
  className?: string;
};

export function ComponentGridSkeleton({
  count = 6,
  className = "",
}: ComponentGridSkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
    >
      <span className="sr-only">Loading components…</span>

      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="h-66 animate-pulse bg-slate-100 motion-reduce:animate-none" />

          <div className="space-y-3 p-5">
            <div className="h-2.5 w-24 animate-pulse rounded-full bg-slate-100 motion-reduce:animate-none" />
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-100 motion-reduce:animate-none" />
            <div className="h-3 w-full animate-pulse rounded-full bg-slate-100 motion-reduce:animate-none" />
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-100 motion-reduce:animate-none" />

            <div className="flex items-center justify-between pt-3">
              <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100 motion-reduce:animate-none" />
              <div className="h-4 w-16 animate-pulse rounded-full bg-slate-100 motion-reduce:animate-none" />
            </div>

            <div className="h-12 w-full animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}
