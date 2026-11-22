import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Pause } from "lucide-react";
import { useEventState, useCountdown, LABELS, PEOPLE } from "@/app/state";
import { Btn, Card, Kicker } from "@/app/ui";

export const Route = createFileRoute("/live")({
  head: () => ({ meta: [
    { title: "Live — Networkathon" },
    { name: "description", content: "Your live Networkathon dashboard: current activity, skills and score." },
    { property: "og:title", content: "Live — Networkathon" },
    { property: "og:description", content: "Follow the event live on your phone." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Live,
});

const SKILLS = ["✈️ Precision", "🤝 Team player", "💡 Fast thinker"];

function Live() {
  const [ev] = useEventState();
  const [me, setMe] = useState({ name: "Aisha Rahman", id: "22-4817" });
  useEffect(() => { try { const v = localStorage.getItem("nk-me"); if (v) setMe(JSON.parse(v)); } catch { /* ignore */ } }, []);
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 bg-deck-bg px-5 py-5 text-deck-ink">
      <header className="sticky top-0 z-10 -mx-5 space-y-3 bg-deck-bg/95 px-5 pb-2 pt-1 backdrop-blur">
        <div className="flex items-center justify-between">
          <div><div className="font-bold">{me.name}</div><div className="font-mono text-xs text-deck-dim">{me.id}</div></div>
          <span className="rounded-full bg-deck-lime px-3 py-1.5 text-sm font-bold text-deck-bg">★ {SKILLS.length} skills</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-deck-surface px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-deck-lime">
          <span className="h-2 w-2 animate-pulse rounded-full bg-deck-lime" /> Now: {LABELS[ev.state]}{ev.state === "planes" && ` · R${ev.round}`}
        </div>
      </header>
      <View ev={ev} />
      {ev.paused && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-deck-bg/90 backdrop-blur">
          <Pause size={64} className="text-deck-sky" /><div className="font-display text-3xl font-bold">Paused</div><p className="text-deck-dim">Hang tight — the host will resume shortly.</p>
        </div>
      )}
    </main>
  );
}

function View({ ev }: { ev: ReturnType<typeof useEventState>[0] }) {
  const timer = useCountdown(ev.timerEnd);
  const [pick, setPick] = useState<number | null>(null);
  const [q, setQ] = useState(0);
  const [ready, setReady] = useState(false);
  switch (ev.state) {
    case "waiting_room":
      return (
        <div className="flex flex-1 flex-col justify-center gap-3 text-center">
          <Kicker>People in the room</Kicker>
          <div className="font-display text-8xl font-bold text-deck-lime">142</div>
          <p className="text-deck-dim">Sit tight — the host will start soon.</p>
          <Card className="mt-8 text-left text-sm">Keep this tab open. Your screen changes automatically as the event moves along.</Card>
        </div>
      );
    case "opening_spectrum": {
      const qs = ["Morning person or night owl?", "Plan everything or wing it?", "Big group or one-on-one?"];
      const opts = [["🌅 Morning", "sky"], ["⚖️ Somewhere between", "ghost"], ["🌙 Night owl", "coral"]] as const;
      if (q >= qs.length) return <Card className="mt-6 text-center"><div className="text-5xl">🌈</div><div className="mt-3 font-display text-xl font-bold">All answered</div><p className="mt-2 text-deck-dim">Waiting for the room to finish…</p></Card>;
      return (
        <div className="flex flex-col gap-3">
          <Kicker>Question {q + 1} / {qs.length}</Kicker>
          <h2 className="font-display text-3xl font-bold leading-tight">{qs[q]}</h2>
          {opts.map(([l, t]) => <Btn key={l} tone={t} className="py-5 text-lg" onClick={() => setQ(q + 1)}>{l}</Btn>)}
        </div>
      );
    }
    case "planes":
      return (
        <div className="flex flex-col gap-4">
          <Card className="text-center"><Kicker>Round</Kicker><div className="font-display text-8xl font-bold text-deck-lime">{ev.round}</div>{ev.timerEnd && <div className="font-mono text-2xl">{timer}</div>}</Card>
          <Card className="flex justify-between"><span className="text-deck-dim">Your score</span><b className="text-xl">31 pts</b></Card>
          <Kicker>Your skills</Kicker>
          {SKILLS.map((s) => <Card key={s} className="py-3">{s}</Card>)}
        </div>
      );
    case "shuffle":
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-[32px] bg-deck-lime p-8 text-center text-deck-bg">
          <ArrowRight size={140} strokeWidth={2.5} /><div className="font-display text-4xl font-bold">Clockwise</div>
          <div className="text-xl font-bold">Move to Table 7</div><div className="text-sm opacity-70">From Table 6 · one table over</div>
        </div>
      );
    case "infomercial":
      return (
        <div className="flex flex-col gap-3">
          <Card><Kicker className="text-deck-sky">Your script · Table 7</Kicker><p className="mt-2 text-lg font-bold">"Mood Mugs" — a mug that changes colour with your mood. Sell it in 60 seconds.</p></Card>
          <Btn tone={ready ? "ghost" : "sky"} onClick={() => setReady(true)}>{ready ? "✓ Team is ready" : "We are ready"}</Btn>
          <Kicker className="mt-4">Vote for the best pitch</Kicker>
          {["Table 2 · SnackDrone", "Table 5 · Nap Pods", "Table 9 · Pocket Plant"].map((t, i) => <Btn key={t} tone={pick === i ? "lime" : "ghost"} onClick={() => setPick(i)}>{t}</Btn>)}
        </div>
      );
    case "crisis":
      return (
        <div className="flex flex-col gap-4">
          <Card className="border-2 border-deck-coral"><Kicker className="text-deck-coral">⚠ Scenario · Table 7</Kicker><p className="mt-2 text-lg font-bold">The keynote speaker cancelled 10 minutes before doors open. You have 200 guests arriving.</p></Card>
          <div className="text-center font-display text-7xl font-bold text-deck-coral">{ev.timerEnd ? timer : "05:00"}</div>
          <Kicker>Speaking order</Kicker>
          <div className="flex flex-wrap gap-2">{["Omar", "Lin", "You", "Priya"].map((n, i) => <span key={n} className={`rounded-full px-4 py-2 text-sm ${n === "You" ? "bg-deck-coral text-deck-bg" : "bg-deck-surface"}`}>{i + 1}. {n}</span>)}</div>
        </div>
      );
    case "silent_ranking":
      return <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center"><div className="text-7xl">🤫</div><h2 className="font-display text-4xl font-bold">Rank in silence</h2><p className="text-deck-dim">Line up by the host's prompt. No talking — gestures only.</p></div>;
    case "item_trade":
      return (
        <div className="flex flex-col gap-3">
          <Kicker className="text-deck-lime">You have</Kicker>
          {["☕ Coffee voucher", "🧑‍🏫 Mentor intro", "🎟️ Hackathon ticket"].map((s) => <Card key={s} className="flex items-center justify-between py-3">{s}<button className="rounded-lg bg-deck-lime px-3 py-1 text-xs font-bold text-deck-bg">📣 Broadcast</button></Card>)}
          <Kicker className="mt-3 text-deck-coral">You need</Kicker>
          {["🎨 Design review", "🎙️ Podcast slot", "📸 Headshot"].map((s) => <div key={s} className="rounded-3xl border-2 border-dashed border-deck-coral px-5 py-3">{s}</div>)}
        </div>
      );
    case "final_summary":
      return (
        <div className="flex flex-col gap-4">
          <div className="rounded-[32px] bg-deck-lime p-6 text-deck-bg"><Kicker className="text-deck-bg/70">Final rank</Kicker><div className="font-display text-7xl font-bold">#2</div><div className="font-bold">of 142 · 31 pts · 6 skills</div></div>
          <div className="grid grid-cols-3 gap-2 text-center">{["✈️ Precision", "🤝 Team", "💡 Thinker", "🎤 Pitch", "🧭 Leader", "🔁 Trader"].map((e) => <Card key={e} className="px-2 py-4 text-sm"><div className="text-3xl">{e.split(" ")[0]}</div>{e.split(" ")[1]}</Card>)}</div>
          <Kicker className="mt-2">Top of the room</Kicker>
          {PEOPLE.slice(0, 3).map((p, i) => <Card key={p.id} className="flex justify-between py-3"><span><span className="mr-3 font-mono text-deck-lime">{i + 1}</span>{p.name}</span><b>{p.score}</b></Card>)}
        </div>
      );
    case "closing":
      return <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center"><div className="text-7xl">🎉</div><h2 className="font-display text-4xl font-bold">Thanks for coming!</h2><p className="text-deck-dim">Your skills are saved. See you at the next one.</p></div>;
  }
}
