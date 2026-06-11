import logoImg from "./Assets/image.webp";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* ICON */}
      <div className="size-8 rounded bg-brand-navy flex items-center justify-center overflow-hidden">
        <img
          src={logoImg}
          alt="EU Hardstore Logo"
          className="h-full w-full object-cover"
        />
      </div>

      {/* TEXT */}
      <span className="text-xl font-bold tracking-tight">
        <span style={{ color: "#24315D" }}>EU</span>{" "}
        <span style={{ color: "#1F2A44" }} className="font-semibold">
          Hardstore
        </span>
      </span>
    </div>
  );
}