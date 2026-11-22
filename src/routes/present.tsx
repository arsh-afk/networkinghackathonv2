import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Pause, Maximize, QrCode } from "lucide-react";
import { useEventState, useCountdown, LABELS, PEOPLE, SPECTRUM } from "@/app/state";
import { Bar, Kicker, Logo } from "@/app/ui";

export const Route = createFileRoute("/present")({
  head: () => ({ meta: [
    { title: "Projector — Networkathon" },
    { name: "description", content: "Full-screen projector view for the Networkathon live event." },
    { property: "og:title", content: "Projector — Networkathon" },
    { property: "og:description", content: "Live instructions, timers and results for the room." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Present,
});

export function PresentStage({ compact }: { compact?: boolean }) {
  const [ev] = useEventState();
  const timer = useCountdown(ev.timerEnd);
  const T = ev.timerEnd ? timer : "05:00";
  const body = (() => {
    switch (ev.state) {
      case "waiting_room":
        return (
          <div className="grid h-full grid-cols-[1.3fr_1fr] items-center gap-16">
            <div><Kicker className="text-deck-lime">Scan to join</Kicker><Logo className="mt-4 block text-[7vw] leading-none" /><p className="mt-6 text-3xl text-deck-dim">networkathon.app — name + student ID</p></div>
            <div className="text-center"><div className="mx-auto flex aspect-square w-3/4 items-center justify-center rounded-[40px] bg-deck-ink"><QrCode className="h-3/4 w-3/4 text-deck-bg" /></div><div className="mt-6 font-display text-6xl font-bold text-deck-lime">142</div><div className="text-2xl text-deck-dim">people in the room</div></div>
          </div>
        );
      case "opening_spectrum":
        return (
          <div className="flex h-full flex-col justify-center gap-10">
            <div><Kicker className="text-deck-sky">Question 1</Kicker><h1 className="mt-3 font-display text-[5vw] font-bold leading-none">Morning person or night owl?</h1></div>
            {SPECTRUM.map((s, i) => <Bar key={s.l} big label={s.l} pct={s.p} tone={["bg-deck-sky", "bg-deck-violet", "bg-deck-coral"][i] ?? "bg-deck-sky"} />)}
          </div>
        );
      case "planes":
        return (
          <div className="grid h-full grid-cols-2 items-center gap-16">
            <div><Kicker>Flight path · round {ev.round}</Kicker><div className="font-display text-[11vw] font-bold leading-none text-deck-lime">{T}</div></div>
            <div className="space-y-3">{PEOPLE.slice(0, 6).map((p, i) => (
              <div key={p.id} className={`flex items-center gap-6 rounded-2xl px-6 py-4 text-3xl ${i === 0 ? "bg-deck-lime text-deck-bg" : "bg-deck-surface"}`}><span className="w-8 font-mono">{i + 1}</span><span className="flex-1">{p.name}</span><b>{p.score}</b></div>
            ))}</div>
          </div>
        );
      case "shuffle":
        return (
          <div className="grid h-full grid-cols-3 overflow-hidden rounded-[40px]">
            {[{ I: ArrowRight, t: "Clockwise", c: "bg-deck-lime" }, { I: Pause, t: "Stay put", c: "bg-deck-sky" }, { I: ArrowLeft, t: "Anti-clockwise", c: "bg-deck-coral" }].map(({ I, t, c }) => (
              <div key={t} className={`flex flex-col items-center justify-center gap-6 ${c} text-deck-bg`}><I className="h-1/3 w-1/3" strokeWidth={2.5} /><div className="font-display text-5xl font-bold">{t}</div><div className="font-mono text-2xl">⅓ of the room</div></div>
            ))}
          </div>
        );
      case "infomercial":
        return (
          <div className="grid h-full grid-cols-2 items-center gap-16">
            <div><Kicker className="text-deck-sky">On stage · Table 5</Kicker><h1 className="mt-3 font-display text-7xl font-bold">Nap Pods</h1><div className="mt-8 font-display text-[9vw] font-bold leading-none text-deck-sky">{ev.timerEnd ? timer : "01:00"}</div></div>
            <div className="space-y-8">{[["SnackDrone", 28], ["Nap Pods", 47], ["Pocket Plant", 25]].map(([n, p]) => <Bar key={n} big label={n as string} pct={p as number} tone="bg-deck-sky" />)}</div>
          </div>
        );
      case "crisis":
        return (
          <div className="flex h-full flex-col justify-center gap-10">
            <div className="flex items-end justify-between"><h1 className="font-display text-7xl font-bold text-deck-coral">⚠ Red alert</h1><div className="font-display text-[8vw] font-bold leading-none">{T}</div></div>
            <div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4, 5, 6, 7, 8].map((t) => <div key={t} className={`rounded-2xl p-6 text-2xl ${t % 3 ? "bg-deck-surface" : "border-2 border-deck-lime"}`}>Table {t}<div className="mt-2 text-base text-deck-dim">{t % 3 ? "Discussing…" : "✓ Solution ready"}</div></div>)}</div>
          </div>
        );
      case "silent_ranking":
        return <div className="flex h-full flex-col items-center justify-center text-center"><div className="text-[10vw]">🤫</div><h1 className="font-display text-8xl font-bold">Rank in silence</h1><p className="mt-6 text-4xl text-deck-dim">Line up by birthday — Jan to Dec. No talking.</p></div>;
      case "item_trade":
        return (
          <div className="flex h-full flex-col justify-center gap-6">
            <h1 className="font-display text-7xl font-bold">Trade floor <span className="text-deck-lime">live</span></h1>
            {[["Omar", "has a ☕ Coffee voucher"], ["Lin", "has a 🎙️ Podcast slot"], ["Priya", "needs a 🎨 Design review"], ["Sam", "has a 📸 Headshot session"]].map(([n, t], i) => (
              <div key={n} className="flex items-center gap-6 rounded-2xl bg-deck-surface px-8 py-5 text-4xl" style={{ opacity: 1 - i * 0.18 }}>📣 <b>{n}</b> <span className="text-deck-dim">{t}</span></div>
            ))}
          </div>
        );
      case "final_summary":
        return (
          <div className="flex h-full flex-col justify-center">
            <h1 className="text-center font-display text-7xl font-bold">Final leaderboard</h1>
            <div className="mt-12 flex items-end justify-center gap-10">
              {[[1, "h-[40vh]", "bg-deck-sky"], [0, "h-[52vh]", "bg-deck-lime"], [2, "h-[30vh]", "bg-deck-coral"]].map(([i, h, c]) => { const p = PEOPLE[i as number]!; return (
                <div key={p.id} className="flex w-[18vw] flex-col items-center gap-4"><div className="text-center text-3xl font-bold">{p.name}<div className="text-xl text-deck-dim">{p.score} pts · {p.skills} skills</div></div><div className={`flex w-full items-start justify-center rounded-t-3xl pt-6 font-display text-7xl font-bold text-deck-bg ${h} ${c}`}>{(i as number) + 1}</div></div>
              ); })}
            </div>
          </div>
        );
      case "closing":
        return <div className="flex h-full flex-col items-center justify-center text-center"><Logo className="text-[8vw]" /><p className="mt-6 text-4xl text-deck-dim">Thank you — see you next time 🎉</p></div>;
    }
  })();
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-deck-bg text-deck-ink" style={compact ? { fontSize: "40%" } : undefined}>
      <div className="deck-grid-bg absolute inset-0" />
      <div className="relative flex items-center justify-between px-[4vw] pt-[3vh]"><Logo className="text-2xl" /><Kicker className="text-deck-lime">● {LABELS[ev.state]}</Kicker></div>
      <div className="relative flex-1 px-[6vw] py-[5vh]">{body}</div>
      {ev.paused && <div className="absolute inset-0 flex items-center justify-center bg-deck-bg/85 font-display text-8xl font-bold">Paused</div>}
    </div>
  );
}

function Present() {
  return (
    <div className="group relative h-screen">
      <PresentStage />
      <button aria-label="Full screen" onClick={() => document.documentElement.requestFullscreen?.()} className="absolute bottom-6 right-6 rounded-full border border-deck-line bg-deck-surface p-3 text-deck-ink opacity-0 transition group-hover:opacity-100"><Maximize size={20} /></button>
    </div>
  );
}
