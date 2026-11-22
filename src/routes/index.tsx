import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize, Grid3x3, Printer } from "lucide-react";
import { slides } from "@/deck/slides";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { slide?: number; print?: boolean } => ({
    slide: Math.min(Math.max(Number(s["slide"]) || 1, 1), slides.length),
    ...(s["print"] !== undefined ? { print: true } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Networkathon — UI Blueprint Deck" },
      { name: "description", content: "UI designs, connectors and build template for the Networkathon live event platform." },
      { property: "og:title", content: "Networkathon — UI Blueprint Deck" },
      { property: "og:description", content: "Participant app, projector view and host panel designs plus build template." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Deck,
});

function Scaled({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(0.5);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setS(Math.min(el.clientWidth / 1920, el.clientHeight / 1080)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-1/2" style={{ width: 1920, height: 1080, marginLeft: -960, marginTop: -540, transform: `scale(${s})` }}>{children}</div>
    </div>
  );
}

function Deck() {
  const search = Route.useSearch();
  const slide = search.slide ?? 1;
  const print = search.print;
  const nav = useNavigate({ from: "/" });
  const [grid, setGrid] = useState(false);
  const i = slide - 1;
  const go = (n: number) => nav({ search: { slide: Math.min(Math.max(n, 1), slides.length) }, replace: true });

  useEffect(() => {
    document.title = `${slide}/${slides.length} — ${slides[i]?.title ?? ""}`;
  }, [slide, i]);
  useEffect(() => {
    if (print) setTimeout(() => window.print(), 600);
  }, [print]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (["ArrowRight", " ", "PageDown"].includes(e.key)) go(slide + 1);
      else if (["ArrowLeft", "PageUp"].includes(e.key)) go(slide - 1);
      else if (e.key === "g") setGrid((g) => !g);
      else if (e.key === "f") document.documentElement.requestFullscreen?.();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  const tx = useRef(0);

  if (print)
    return <div>{slides.map(({ C, title }) => <div key={title} className="print-slide"><C /></div>)}</div>;

  const Cur = slides[i]!.C;
  return (
    <div className="flex h-screen flex-col bg-deck-bg text-deck-ink">
      <div className="flex items-center gap-2 border-b border-deck-line px-4 py-2 font-mono text-sm">
        <span className="flex-1 truncate text-deck-dim">Networkathon · UI Blueprint</span>
        <button aria-label="Grid" onClick={() => setGrid(!grid)} className="rounded p-2 hover:bg-deck-surface"><Grid3x3 size={18} /></button>
        <button aria-label="Export PDF" onClick={() => window.open("/?print", "_blank")} className="rounded p-2 hover:bg-deck-surface"><Printer size={18} /></button>
        <button aria-label="Present" onClick={() => document.documentElement.requestFullscreen?.()} className="rounded p-2 hover:bg-deck-surface"><Maximize size={18} /></button>
      </div>
      {grid ? (
        <div className="grid flex-1 grid-cols-2 gap-4 overflow-auto p-6 md:grid-cols-3 lg:grid-cols-4">
          {slides.map(({ C, title }, n) => (
            <button key={title} onClick={() => { go(n + 1); setGrid(false); }} className={`relative aspect-video overflow-hidden rounded-lg border-2 ${n === i ? "border-deck-lime" : "border-deck-line"}`}>
              <Scaled><C /></Scaled>
            </button>
          ))}
        </div>
      ) : (
        <div className="relative min-h-0 flex-1"
          onTouchStart={(e) => (tx.current = e.touches[0]?.clientX ?? 0)}
          onTouchEnd={(e) => { const d = (e.changedTouches[0]?.clientX ?? 0) - tx.current; if (Math.abs(d) > 50) go(slide + (d < 0 ? 1 : -1)); }}>
          <Scaled><Cur /></Scaled>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-deck-line bg-deck-surface px-3 py-1 font-mono text-sm">
            <button aria-label="Previous" onClick={() => go(slide - 1)}><ChevronLeft size={18} /></button>
            {slide} / {slides.length}
            <button aria-label="Next" onClick={() => go(slide + 1)}><ChevronRight size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
