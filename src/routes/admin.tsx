import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pause, Play, Search, Award, Timer, ExternalLink, Shuffle, Download, ChevronDown } from "lucide-react";
import { useEventState, LABELS, STATES, PEOPLE, SPECTRUM } from "@/app/state";
import { Btn, Card, Kicker, Logo, Bar } from "@/app/ui";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Host panel — Networkathon" },
    { name: "description", content: "Control the Networkathon event: advance states, score rounds, award skills, export results." },
    { property: "og:title", content: "Host panel — Networkathon" },
    { property: "og:description", content: "Host control panel for the live event." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Admin,
});

const MAX_ROUNDS = 3;
const SKILLS = ["✈️ Precision", "🤝 Team player", "💡 Fast thinker", "🎤 Pitch pro", "🧭 Leader"];

function Admin() {
  const [ev, set] = useEventState();
  const [q, setQ] = useState("");
  const [jump, setJump] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>(() => Object.fromEntries(PEOPLE.map((p) => [p.id, p.score])));
  const [awarded, setAwarded] = useState<string | null>(null);
  const idx = STATES.indexOf(ev.state);
  const nextLabel = ev.state === "opening_spectrum" ? "Move to Table" : ev.state === "planes" && ev.round < MAX_ROUNDS ? `Next round → R${ev.round + 1}` : idx < STATES.length - 1 ? `Advance → ${LABELS[STATES[idx + 1]!]}` : "Event finished";
  const advance = () => {
    if (ev.state === "planes" && ev.round < MAX_ROUNDS) return set({ round: ev.round + 1, timerEnd: null });
    if (idx < STATES.length - 1) set({ state: STATES[idx + 1]!, round: 1, timerEnd: null });
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.target as HTMLElement).tagName === "INPUT") return; if (e.key === " ") { e.preventDefault(); advance(); } if (e.key === "p") set({ paused: !ev.paused }); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });
  const list = PEOPLE.filter((p) => (p.name + p.id).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flex min-h-screen flex-col bg-deck-bg text-deck-ink">
      <header className="flex items-center gap-4 border-b border-deck-line px-6 py-3">
        <Logo className="text-xl" /><span className="rounded-full bg-deck-surface px-3 py-1 font-mono text-xs text-deck-dim">HOST</span>
        <div className="ml-auto flex items-center gap-3 text-sm"><span className="h-2 w-2 rounded-full bg-deck-lime" /> Live · <b>142</b> in room</div>
      </header>
      <div className="grid flex-1 gap-5 p-5 lg:grid-cols-[320px_1fr_400px]">
        {/* Control */}
        <section className="flex flex-col gap-4">
          <Card><Kicker>Current state</Kicker><div className="mt-2 font-display text-3xl font-bold">{LABELS[ev.state]}{ev.state === "planes" && <span className="text-deck-lime"> · R{ev.round}</span>}</div>
            <div className="mt-4 flex gap-1">{STATES.map((s, i) => <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= idx ? "bg-deck-lime" : "bg-deck-line"}`} />)}</div></Card>
          <button onClick={advance} className="flex min-h-32 flex-col items-center justify-center gap-1 rounded-3xl bg-deck-lime px-4 text-center font-display text-2xl font-bold text-deck-bg transition active:scale-[.98]">{nextLabel}<span className="font-mono text-xs font-normal opacity-60">space</span></button>
          <Btn tone={ev.paused ? "sky" : "ghost"} onClick={() => set({ paused: !ev.paused })} className="flex items-center justify-center gap-2">{ev.paused ? <><Play size={18} />Resume</> : <><Pause size={18} />Pause all screens</>}<span className="font-mono text-xs opacity-60">P</span></Btn>
          <div className="mt-auto">
            <button onClick={() => setJump(!jump)} className="flex w-full items-center justify-between rounded-2xl border-2 border-deck-coral px-4 py-3 font-bold text-deck-coral">⚠ Emergency jump <ChevronDown size={18} className={jump ? "rotate-180" : ""} /></button>
            {jump && <div className="mt-2 grid grid-cols-2 gap-2">{STATES.map((s) => <button key={s} onClick={() => { if (confirm(`Jump to ${LABELS[s]}?`)) set({ state: s, round: 1, timerEnd: null }); }} className={`rounded-xl px-3 py-2 text-left text-sm ${s === ev.state ? "bg-deck-coral text-deck-bg" : "bg-deck-surface hover:bg-deck-line"}`}>{LABELS[s]}</button>)}</div>}
          </div>
        </section>
        {/* Preview */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between"><Kicker>Projector preview</Kicker><Link to="/present" target="_blank" className="flex items-center gap-1 text-sm text-deck-sky">Open in new window <ExternalLink size={14} /></Link></div>
          <div className="aspect-video overflow-hidden rounded-3xl border border-deck-line"><iframe src="/present" title="Projector preview" className="h-[200%] w-[200%] origin-top-left scale-50" /></div>
          <div className="grid grid-cols-3 gap-3">
            <Btn tone="ghost" onClick={() => set({ timerEnd: Date.now() + 5 * 60_000 })} className="flex items-center justify-center gap-2"><Timer size={18} />Start 5:00</Btn>
            <Btn tone="ghost" onClick={() => set({ timerEnd: (ev.timerEnd ?? Date.now()) + 60_000 })}>+1 min</Btn>
            <Btn tone="ghost" onClick={() => set({ timerEnd: null })}>Clear timer</Btn>
          </div>
          {ev.state === "opening_spectrum" && <Card className="space-y-3"><Kicker>Live answers · 128 / 142</Kicker>{SPECTRUM.map((s) => <Bar key={s.l} label={s.l} pct={s.p} />)}<div className="text-sm text-deck-dim">Diversity meter: <b className="text-deck-lime">High</b></div></Card>}
          {ev.state === "crisis" && <Card><Kicker>Scenario distribution</Kicker><div className="mt-3 grid grid-cols-4 gap-2 text-sm">{[1, 2, 3, 4, 5, 6, 7, 8].map((t) => <div key={t} className="rounded-xl bg-deck-bg p-3">T{t}<div className="text-deck-dim">Scenario {String.fromCharCode(64 + ((t % 4) + 1))}</div></div>)}</div></Card>}
        </section>
        {/* Data */}
        <section className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between"><Kicker>Participants · scores R{ev.round}</Kicker><span className="font-mono text-xs text-deck-dim">{list.length} shown</span></div>
            <label className="flex items-center gap-2 rounded-xl border-2 border-deck-line px-3 py-2 focus-within:border-deck-lime"><Search size={16} className="text-deck-dim" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or student ID" className="w-full bg-transparent outline-none" /></label>
            <div className="max-h-[380px] space-y-2 overflow-auto">{list.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl bg-deck-bg px-3 py-2">
                <div className="flex-1"><div className="text-sm font-bold">{p.name}</div><div className="font-mono text-xs text-deck-dim">{p.id} · ★{p.skills}</div></div>
                <input type="number" value={scores[p.id]} onChange={(e) => setScores({ ...scores, [p.id]: Number(e.target.value) })} className="w-16 rounded-lg border border-deck-line bg-deck-surface px-2 py-1 text-right font-mono" aria-label={`Score for ${p.name}`} />
                <button aria-label={`Award ${p.name}`} onClick={() => setAwarded(p.name)} className="rounded-lg p-2 text-deck-lime hover:bg-deck-surface"><Award size={18} /></button>
              </div>
            ))}</div>
          </Card>
          {awarded && <Card className="border-deck-lime"><Kicker className="text-deck-lime">Award skill to {awarded}</Kicker><div className="mt-3 flex flex-wrap gap-2">{SKILLS.map((s) => <button key={s} onClick={() => setAwarded(null)} className="rounded-full border border-deck-line px-3 py-1.5 text-sm hover:bg-deck-lime hover:text-deck-bg">{s}</button>)}</div></Card>}
          <div className="mt-auto grid grid-cols-2 gap-3">
            <Btn tone="sky" onClick={() => set({ state: "shuffle" })} className="flex items-center justify-center gap-2"><Shuffle size={18} />Trigger shuffle</Btn>
            <Btn className="flex items-center justify-center gap-2"><Download size={18} />Export CSV</Btn>
          </div>
        </section>
      </div>
    </div>
  );
}
