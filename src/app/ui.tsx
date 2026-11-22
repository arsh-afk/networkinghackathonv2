import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Btn({ children, tone = "lime", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "lime" | "coral" | "sky" | "ghost" }) {
  const t = { lime: "bg-deck-lime text-deck-bg", coral: "bg-deck-coral text-deck-bg", sky: "bg-deck-sky text-deck-bg", ghost: "border-2 border-deck-line text-deck-ink hover:bg-deck-surface" }[tone];
  return <button {...p} className={cn("min-h-12 rounded-2xl px-5 py-3 font-bold transition active:scale-[.98]", t, className)}>{children}</button>;
}
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-3xl border border-deck-line bg-deck-surface p-5", className)}>{children}</div>;
}
export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("font-mono text-xs uppercase tracking-[.16em] text-deck-dim", className)}>{children}</div>;
}
export function Bar({ label, pct, tone = "bg-deck-lime", big }: { label: string; pct: number; tone?: string; big?: boolean }) {
  return (
    <div className="space-y-2">
      <div className={cn("flex justify-between", big ? "text-3xl" : "text-sm text-deck-dim")}><span>{label}</span><span className="font-mono">{pct}%</span></div>
      <div className={cn("rounded-full bg-deck-bg", big ? "h-8" : "h-3")}><div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
export function Logo({ className }: { className?: string }) {
  return <span className={cn("font-display font-bold tracking-tight", className)}>Networkathon<span className="text-deck-lime">.</span></span>;
}
