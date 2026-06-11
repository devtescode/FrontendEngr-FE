export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="size-8 rounded bg-brand-navy flex items-center justify-center">
        <div className="size-3 rounded-full bg-brand-gold" />
      </div>
      <span className="text-xl font-bold tracking-tight text-brand-navy">
        PULSE<span className="font-light text-slate-400">LAB</span>
      </span>
    </div>
  );
}