import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Phone({ children, label, className }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-5", className)}>
      <div className="relative h-[640px] w-[316px] rounded-[48px] border-[10px] border-deck-line bg-deck-bg p-4 shadow-[0_40px_80px_-30px_var(--deck-lime)]">
        <div className="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-deck-line" />
        <div className="flex h-full flex-col gap-3 overflow-hidden pt-6 text-[15px]">{children}</div>
      </div>
      {label && <div className="slide-chrome text-deck-dim">{label}</div>}
    </div>
  );
}

export function PHeader({ name = "Aisha R.", skills = 3, now }: { name?: string; skills?: number; now: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold">{name}</span>
        <span className="rounded-full bg-deck-lime px-3 py-1 text-xs font-bold text-deck-bg">★ {skills} skills</span>
      </div>
      <div className="rounded-lg bg-deck-surface px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-deck-lime">● Now: {now}</div>
    </div>
  );
}

export function Btn({ children, tone = "lime", className }: { children: ReactNode; tone?: "lime" | "coral" | "ghost" | "sky"; className?: string }) {
  const t = {
    lime: "bg-deck-lime text-deck-bg",
    coral: "bg-deck-coral text-deck-bg",
    sky: "bg-deck-sky text-deck-bg",
    ghost: "border-2 border-deck-line text-deck-ink",
  }[tone];
  return <div className={cn("rounded-2xl px-4 py-4 text-center font-bold", t, className)}>{children}</div>;
}

export function Screen({ children, label, className }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="overflow-hidden rounded-3xl border-4 border-deck-line bg-deck-bg">
        <div className="flex gap-2 border-b border-deck-line bg-deck-surface px-5 py-3">
          {[0, 1, 2].map((i) => <span key={i} className="h-3 w-3 rounded-full bg-deck-line" />)}
        </div>
        {children}
      </div>
      {label && <div className="slide-chrome text-deck-dim">{label}</div>}
    </div>
  );
}

export function Bar({ label, pct, tone = "bg-deck-lime" }: { label: string; pct: number; tone?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-deck-dim"><span>{label}</span><span>{pct}%</span></div>
      <div className="h-3 rounded-full bg-deck-surface"><div className={cn("h-full rounded-full", tone)} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
