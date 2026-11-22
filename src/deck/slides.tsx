import type { ReactNode } from "react";
import { Phone, PHeader, Btn, Screen, Bar } from "./mock";
import {
  Database, Radio, ShieldCheck, FileSpreadsheet, QrCode, Sparkles, Timer, Server,
  Smartphone, Monitor, LayoutDashboard, ArrowRight, ArrowLeft, Pause, Play, Search, Award,
} from "lucide-react";

function Frame({ n, kicker, title, children }: { n: number; kicker?: string; title?: ReactNode; children: ReactNode }) {
  return (
    <div className="slide-content">
      <div className="deck-grid-bg absolute inset-0" />
      <div className="relative flex h-full flex-col px-[120px] pb-[70px] pt-[90px]">
        {kicker && <div className="slide-kicker mb-5 text-deck-lime">{kicker}</div>}
        {title && <h2 className="slide-title mb-12 max-w-[1500px]">{title}</h2>}
        <div className="flex-1">{children}</div>
        <div className="flex justify-between slide-chrome text-deck-dim">
          <span>NETWORKATHON · UI BLUEPRINT</span><span>{String(n).padStart(2, "0")}</span>
        </div>
      </div>
    </div>
  );
}

const Title = () => (
  <div className="slide-content">
    <div className="deck-grid-bg absolute inset-0" />
    <div className="absolute -right-40 -top-40 h-[900px] w-[900px] rounded-full bg-deck-lime opacity-20 blur-[160px]" />
    <div className="absolute -bottom-60 left-40 h-[700px] w-[700px] rounded-full bg-deck-violet opacity-25 blur-[160px]" />
    <div className="relative flex h-full flex-col justify-between p-[120px]">
      <div className="slide-kicker text-deck-lime">Live event platform · UI design + build template</div>
      <div>
        <h1 className="slide-title-lg">Networkathon<span className="text-deck-lime">.</span><br />The room's central<br />nervous system.</h1>
        <p className="slide-subtitle mt-10 max-w-[1100px] text-deck-dim">Three real-time surfaces. One shared event state. Phones, projector and host — in sync.</p>
      </div>
      <div className="flex gap-4">
        {["Participant App", "Presentation View", "Host Panel"].map((s) => (
          <span key={s} className="slide-chrome rounded-full border-2 border-deck-line px-6 py-3">{s}</span>
        ))}
      </div>
    </div>
  </div>
);

const Surfaces = () => (
  <Frame n={2} kicker="Overview" title="Three surfaces, one source of truth">
    <div className="grid grid-cols-3 gap-10">
      {[
        { i: Smartphone, t: "Participant App", d: "Mobile browser", p: "Join, see the current activity, submit inputs, track skills & scores.", c: "text-deck-lime", r: "/  →  /live" },
        { i: Monitor, t: "Presentation", d: "Projector · full-screen", p: "Host-driven instructions, timers and live results for the whole room.", c: "text-deck-sky", r: "/present" },
        { i: LayoutDashboard, t: "Host Panel", d: "Desktop browser", p: "State-machine control, scoring, skill awarding and exports.", c: "text-deck-coral", r: "/admin" },
      ].map(({ i: I, t, d, p, c, r }) => (
        <div key={t} className="flex min-h-[520px] flex-col rounded-[36px] border-2 border-deck-line bg-deck-surface p-12">
          <I className={c} size={72} strokeWidth={1.5} />
          <div className="mt-10 font-display text-[44px] font-semibold">{t}</div>
          <div className="slide-caption text-deck-dim">{d}</div>
          <p className="slide-body mt-6 flex-1">{p}</p>
          <div className={`slide-chrome ${c}`}>{r}</div>
        </div>
      ))}
    </div>
  </Frame>
);

const PJoin = () => (
  <Frame n={3} kicker="Participant · Entry" title="Join in five seconds. No passwords.">
    <div className="flex items-start gap-16">
      <Phone label="/ · Join form">
        <div className="mt-6 font-display text-2xl font-bold">Networkathon<span className="text-deck-lime">.</span></div>
        <p className="text-deck-dim">Join the room on your phone.</p>
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border-2 border-deck-line px-4 py-3 text-deck-dim">Full name</div>
          <div className="rounded-xl border-2 border-deck-line px-4 py-3 text-deck-dim">Student ID</div>
        </div>
        <Btn className="mt-auto">Join the event →</Btn>
      </Phone>
      <Phone label="Duplicate ID · recovery">
        <div className="mt-10 text-center text-5xl">👋</div>
        <div className="text-center font-display text-xl font-bold">Welcome back</div>
        <p className="text-center text-deck-dim">Student ID 22-4817 has already joined as <b className="text-deck-ink">Aisha R.</b></p>
        <Btn className="mt-auto">That's me — continue</Btn>
        <Btn tone="ghost">Not me</Btn>
      </Phone>
      <Phone label="/live · Waiting room">
        <PHeader now="Waiting room" skills={0} />
        <div className="mt-6 text-center font-mono text-xs uppercase tracking-widest text-deck-dim">People in the room</div>
        <div className="text-center font-display text-7xl font-bold text-deck-lime">142</div>
        <p className="text-center text-deck-dim">Sit tight — the host will start soon.</p>
        <div className="mt-auto rounded-2xl bg-deck-surface p-4 text-sm">Keep this tab open. Your screen updates automatically.</div>
      </Phone>
      <div className="slide-body max-w-[460px] space-y-6 pt-10 text-deck-dim">
        <p><b className="text-deck-ink">Persistent header</b> on every screen: name, skill counter, "Now" banner.</p>
        <p><b className="text-deck-ink">Identity</b> stored on-device; recover anytime via Student ID.</p>
        <p><b className="text-deck-ink">44px+</b> touch targets, dark-first, high contrast.</p>
      </div>
    </div>
  </Frame>
);

const PActivities = () => (
  <Frame n={4} kicker="Participant · Activities" title="One screen per state, driven live">
    <div className="flex justify-between">
      <Phone label="Spectrum">
        <PHeader now="Opening spectrum" />
        <div className="font-mono text-xs text-deck-dim">Q 2 / 5</div>
        <div className="font-display text-lg font-bold">Morning person or night owl?</div>
        <Btn tone="sky">🌅 Morning</Btn><Btn tone="ghost">⚖️ Somewhere between</Btn><Btn tone="coral">🌙 Night owl</Btn>
      </Phone>
      <Phone label="Planes · round 2">
        <PHeader now="Flight path" />
        <div className="rounded-2xl bg-deck-surface p-5 text-center">
          <div className="font-mono text-xs uppercase text-deck-dim">Round</div>
          <div className="font-display text-6xl font-bold text-deck-lime">2</div>
        </div>
        <div className="font-bold">Your skills</div>
        {["✈️ Precision", "🤝 Team player", "💡 Fast thinker"].map((s) => <div key={s} className="rounded-xl border border-deck-line px-3 py-2">{s}</div>)}
      </Phone>
      <Phone label="Shuffle · personalised">
        <PHeader now="Shuffle" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl bg-deck-lime text-deck-bg">
          <ArrowRight size={110} strokeWidth={2.5} />
          <div className="font-display text-3xl font-bold">Clockwise</div>
          <div className="font-bold">Move to Table 7</div>
        </div>
      </Phone>
      <Phone label="Crisis · red alert">
        <PHeader now="Crisis" />
        <div className="rounded-2xl border-2 border-deck-coral p-4">
          <div className="font-mono text-xs uppercase text-deck-coral">Scenario · Table 7</div>
          <div className="mt-2 font-bold">The keynote speaker cancelled 10 minutes before doors open.</div>
        </div>
        <div className="text-center font-display text-6xl font-bold text-deck-coral">04:32</div>
        <div className="text-xs text-deck-dim">Speaking order: Aisha → Omar → Lin → You</div>
      </Phone>
      <Phone label="Trade floor">
        <PHeader now="Item trade" />
        <div className="text-xs font-bold uppercase text-deck-lime">You have</div>
        {["Coffee voucher", "Mentor intro"].map((s) => <div key={s} className="rounded-xl bg-deck-surface px-3 py-2">{s}</div>)}
        <div className="text-xs font-bold uppercase text-deck-coral">You need</div>
        {["Design review", "Podcast slot"].map((s) => <div key={s} className="rounded-xl border border-deck-coral px-3 py-2">{s}</div>)}
        <Btn className="mt-auto">📣 Broadcast "I have…"</Btn>
      </Phone>
    </div>
  </Frame>
);

const PFinal = () => (
  <Frame n={5} kicker="Participant · Wrap-up" title="Every phone ends with a personal scorecard">
    <div className="flex items-start gap-16">
      <Phone label="Spotlight vote">
        <PHeader now="Infomercial" />
        <div className="font-display text-lg font-bold">Vote for the best 60-second pitch</div>
        {["Table 2 · SnackDrone", "Table 5 · Nap Pods", "Table 7 · Mood Mugs"].map((s, i) => <Btn key={s} tone={i === 1 ? "lime" : "ghost"}>{s}</Btn>)}
      </Phone>
      <Phone label="Silent ranking">
        <PHeader now="Silent ranking" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="text-6xl">🤫</div>
          <div className="font-display text-2xl font-bold">Rank in silence</div>
          <p className="text-deck-dim">Line up without speaking. Gestures only.</p>
        </div>
      </Phone>
      <Phone label="Final summary">
        <PHeader now="Final summary" skills={6} />
        <div className="rounded-2xl bg-deck-lime p-5 text-deck-bg">
          <div className="font-mono text-xs uppercase">Final rank</div>
          <div className="font-display text-5xl font-bold">#4</div>
          <div className="font-bold">of 142 · 86 pts</div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-2xl">
          {["✈️", "🤝", "💡", "🎤", "🧭", "🔥"].map((e) => <div key={e} className="rounded-xl bg-deck-surface py-3">{e}</div>)}
        </div>
      </Phone>
      <div className="slide-body max-w-[520px] space-y-6 pt-10 text-deck-dim">
        <p><b className="text-deck-ink">Paused overlay</b> freezes the screen but stays subscribed.</p>
        <p><b className="text-deck-ink">Reconnect banner</b> appears if Wi-Fi drops; state re-fetches on return.</p>
        <p><b className="text-deck-ink">Timers</b> count down locally from a shared end time.</p>
      </div>
    </div>
  </Frame>
);

const Present = () => (
  <Frame n={6} kicker="Presentation · /present" title="Built to be read from the back row">
    <div className="grid grid-cols-2 gap-12">
      <Screen label="Spectrum · live distribution">
        <div className="space-y-6 p-12">
          <div className="font-mono text-sm uppercase tracking-widest text-deck-sky">Question 2</div>
          <div className="font-display text-5xl font-bold">Morning person or night owl?</div>
          <Bar label="🌅 Morning" pct={34} tone="bg-deck-sky" />
          <Bar label="⚖️ Between" pct={21} tone="bg-deck-violet" />
          <Bar label="🌙 Night owl" pct={45} tone="bg-deck-coral" />
        </div>
      </Screen>
      <Screen label="Planes · timer + live rankings">
        <div className="grid grid-cols-[1fr_1.1fr] gap-8 p-12">
          <div>
            <div className="font-mono text-sm uppercase text-deck-dim">Round 2</div>
            <div className="font-display text-[96px] font-bold leading-none text-deck-lime">02:14</div>
          </div>
          <div className="space-y-3">
            {[["Omar K.", 34], ["Aisha R.", 31], ["Lin W.", 29], ["Sam T.", 27], ["Priya D.", 25]].map(([n, s], i) => (
              <div key={n} className="flex items-center gap-4 rounded-xl bg-deck-surface px-4 py-3 text-xl">
                <span className="font-mono text-deck-lime">{i + 1}</span><span className="flex-1">{n}</span><b>{s}</b>
              </div>
            ))}
          </div>
        </div>
      </Screen>
    </div>
  </Frame>
);

const Present2 = () => (
  <Frame n={7} kicker="Presentation · opening + finale" title="Opening loop, shuffle and leaderboard">
    <div className="grid grid-cols-3 gap-10">
      <Screen label="Join the community · QR cards">
        <div className="grid grid-cols-2 gap-4 p-8">
          {["WhatsApp", "Instagram", "LinkedIn", "Website"].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2 rounded-2xl bg-deck-surface p-5">
              <QrCode size={80} className="text-deck-lime" /><span className="text-lg">{s}</span>
            </div>
          ))}
        </div>
      </Screen>
      <Screen label="Shuffle · room instruction">
        <div className="grid h-[386px] grid-cols-3">
          {[
            { I: ArrowRight, t: "Clockwise", c: "bg-deck-lime" },
            { I: Pause, t: "Stay", c: "bg-deck-sky" },
            { I: ArrowLeft, t: "Anti-clockwise", c: "bg-deck-coral" },
          ].map(({ I, t, c }) => (
            <div key={t} className={`flex flex-col items-center justify-center gap-4 ${c} text-deck-bg`}>
              <I size={80} strokeWidth={2.5} /><span className="text-center text-xl font-bold">{t}</span><span className="font-mono">⅓</span>
            </div>
          ))}
        </div>
      </Screen>
      <Screen label="Final leaderboard">
        <div className="flex h-[386px] items-end justify-center gap-6 p-8">
          {[["Aisha", 260, "bg-deck-sky"], ["Omar", 330, "bg-deck-lime"], ["Lin", 200, "bg-deck-coral"]].map(([n, h, c]) => (
            <div key={n as string} className="flex flex-col items-center gap-3">
              <span className="text-xl font-bold">{n}</span>
              <div className={`w-28 rounded-t-2xl ${c}`} style={{ height: (h as number) - 80 }} />
            </div>
          ))}
        </div>
      </Screen>
    </div>
  </Frame>
);

const Admin = () => (
  <Frame n={8} kicker="Host panel · /admin" title="Control · preview · live data">
    <Screen>
      <div className="grid h-[610px] grid-cols-[380px_1fr_440px] gap-6 p-6 text-lg">
        <div className="flex flex-col gap-4 rounded-2xl bg-deck-surface p-6">
          <div className="font-mono text-sm uppercase text-deck-dim">Current state</div>
          <div className="font-display text-3xl font-bold">Planes · R2</div>
          <div className="mt-2 flex items-center justify-center gap-3 rounded-2xl bg-deck-lime py-8 font-display text-2xl font-bold text-deck-bg">Advance → R3 <span className="font-mono text-sm">␣</span></div>
          <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-deck-line py-4"><Pause size={22} /> Pause <span className="font-mono text-sm text-deck-dim">P</span></div>
          <div className="mt-auto rounded-2xl border-2 border-deck-coral py-4 text-center text-deck-coral">⚠ Emergency jump…</div>
        </div>
        <div className="flex flex-col gap-4 rounded-2xl bg-deck-surface p-6">
          <div className="flex justify-between font-mono text-sm uppercase text-deck-dim"><span>Presentation preview</span><span className="text-deck-sky">Open window ↗</span></div>
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl bg-deck-bg">
            <div className="font-mono text-deck-dim">ROUND 2</div>
            <div className="font-display text-[110px] font-bold text-deck-lime">02:14</div>
          </div>
          <div className="flex gap-3"><Btn tone="ghost" className="flex-1 py-3"><Timer className="mr-2 inline" size={18} />+1 min</Btn><Btn tone="ghost" className="flex-1 py-3"><Play className="mr-2 inline" size={18} />Start timer</Btn></div>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl bg-deck-surface p-6">
          <div className="flex justify-between"><span className="font-mono text-sm uppercase text-deck-dim">Live</span><b className="text-deck-lime">142 in room</b></div>
          <div className="flex items-center gap-2 rounded-xl border-2 border-deck-line px-4 py-3 text-deck-dim"><Search size={18} />Search name or ID</div>
          {[["Aisha R.", 31], ["Omar K.", 34], ["Lin W.", 29]].map(([n, s]) => (
            <div key={n} className="flex items-center gap-3 rounded-xl bg-deck-bg px-4 py-3">
              <span className="flex-1">{n}</span><span className="rounded-lg border border-deck-line px-3 font-mono">{s}</span><Award size={20} className="text-deck-lime" />
            </div>
          ))}
          <div className="mt-auto grid grid-cols-2 gap-3"><Btn tone="sky" className="py-3">Shuffle</Btn><Btn className="py-3">Export CSV</Btn></div>
        </div>
      </div>
    </Screen>
  </Frame>
);

const States = () => {
  const s = ["waiting_room", "opening_spectrum", "move_to_table", "planes · round n", "shuffle", "infomercial", "crisis", "silent_ranking", "item_trade", "final_summary", "closing"];
  return (
    <Frame n={9} kicker="State machine" title="One row drives every screen">
      <div className="flex flex-wrap items-center gap-4">
        {s.map((x, i) => (
          <div key={x} className="flex items-center gap-4">
            <span className={`slide-chrome rounded-full px-6 py-4 ${i === 3 ? "bg-deck-lime text-deck-bg" : "border-2 border-deck-line"}`}>{x}</span>
            {i < s.length - 1 && <ArrowRight className="text-deck-dim" />}
          </div>
        ))}
      </div>
      <div className="mt-16 grid grid-cols-3 gap-8">
        {[["event_state", "Single row: current_state, current_round, is_paused, meta JSON (timer_end, team)."], ["useEventState()", "Realtime subscription exposed to every surface via context."], ["StateRouter", "Maps state → component on phone, projector and admin preview."]].map(([t, d]) => (
          <div key={t} className="rounded-3xl border-2 border-deck-line bg-deck-surface p-10">
            <div className="font-mono text-[28px] text-deck-lime">{t}</div><p className="slide-body mt-4 text-deck-dim">{d}</p>
          </div>
        ))}
      </div>
    </Frame>
  );
};

const Connectors = () => (
  <Frame n={10} kicker="Required connectors" title="What you need to plug in">
    <div className="grid grid-cols-4 gap-6">
      {[
        { I: Database, t: "Lovable Cloud · Database", d: "Postgres tables for participants, scores, skills, trades.", req: true },
        { I: Radio, t: "Lovable Cloud · Realtime", d: "Live sync on event_state, scores, skills, responses.", req: true },
        { I: ShieldCheck, t: "Lovable Cloud · Auth", d: "Email login for hosts only + admin role table.", req: true },
        { I: Server, t: "Server functions", d: "Admin-only export, shuffle maths, bulk item import.", req: true },
        { I: FileSpreadsheet, t: "SheetJS (xlsx)", d: "CSV / XLSX results download.", req: true },
        { I: QrCode, t: "QR generator", d: "Join + community QR codes on the projector.", req: false },
        { I: Sparkles, t: "Framer Motion", d: "State transitions and leaderboard animation.", req: false },
        { I: Timer, t: "Service worker", d: "Offline shell cache + reconnect handling.", req: false },
      ].map(({ I, t, d, req }) => (
        <div key={t} className="flex min-h-[300px] flex-col rounded-3xl border-2 border-deck-line bg-deck-surface p-8">
          <div className="flex items-start justify-between">
            <I size={52} className={req ? "text-deck-lime" : "text-deck-sky"} strokeWidth={1.5} />
            <span className={`slide-chrome rounded-full px-4 py-1 ${req ? "bg-deck-lime text-deck-bg" : "border border-deck-sky text-deck-sky"}`}>{req ? "Required" : "Optional"}</span>
          </div>
          <div className="mt-6 text-[30px] font-bold leading-tight">{t}</div>
          <p className="slide-caption mt-3 text-deck-dim">{d}</p>
        </div>
      ))}
    </div>
  </Frame>
);

const Template = () => (
  <Frame n={11} kicker="Build template" title="Project skeleton, ready to fill in">
    <div className="grid grid-cols-[1fr_1fr] gap-12">
      <pre className="rounded-3xl border-2 border-deck-line bg-deck-surface p-10 font-mono text-[22px] leading-[1.45] text-deck-dim">{`src/
  routes/
    index.tsx          `}<span className="text-deck-lime">/ join</span>{`
    live.tsx           `}<span className="text-deck-lime">/live</span>{`
    present.tsx        `}<span className="text-deck-sky">/present</span>{`
    admin.login.tsx    `}<span className="text-deck-coral">/admin/login</span>{`
    _authenticated/admin.tsx
  hooks/  useEventState · useParticipant
          useSkills · useTimer · useAdminAuth
  components/common/  BigButton · Timer
          SkillBadge · StateBanner · PausedOverlay
  participant/  StateRouter + 10 views
  present/      PresentationRouter + slides
  admin/        ControlPanel · LiveData
                ScoreEntry · SkillAwarder
  server/       export.functions.ts`}</pre>
      <div className="space-y-5">
        {[["01", "Scaffold + schema + realtime state", "Day 1"], ["02", "Admin control + presentation skeleton", "Day 2–3"], ["03", "Spectrum, Planes, scoring, skills", "Day 3–4"], ["04", "Shuffle, Spotlight, Crisis, Ranking, Trade", "Day 4–7"], ["05", "Final summary + export", "Day 7"], ["06", "Polish, load test, rehearsal", "Day 8–10"]].map(([n, t, d]) => (
          <div key={n} className="flex items-center gap-6 rounded-2xl border-2 border-deck-line px-8 py-5">
            <span className="font-display text-3xl text-deck-lime">{n}</span><span className="slide-body flex-1">{t}</span><span className="slide-chrome text-deck-dim">{d}</span>
          </div>
        ))}
      </div>
    </div>
  </Frame>
);

const Data = () => (
  <Frame n={12} kicker="Data model" title="Eleven tables, one leaderboard view">
    <div className="grid grid-cols-4 gap-6">
      {[
        ["participants", "full_name · student_id (unique) · is_active"],
        ["event_state", "current_state · current_round · is_paused · meta"],
        ["skills", "name · description"],
        ["participant_skills", "participant → skill · activity_key"],
        ["planes_scores", "participant · round_no · score"],
        ["activity_responses", "activity_key · payload json"],
        ["tables / participant_tables", "table label · direction"],
        ["trade_items", "item_name · owned | needed · claimed"],
        ["crisis_scenarios", "title · body"],
        ["team_scenarios", "table → scenario"],
        ["user_roles", "host admin role (separate table)"],
        ["final_leaderboard", "view · total_score · skill_count"],
      ].map(([t, d]) => (
        <div key={t} className="rounded-2xl border-2 border-deck-line bg-deck-surface p-7">
          <div className="font-mono text-[24px] text-deck-lime">{t}</div><p className="slide-caption mt-3 text-deck-dim">{d}</p>
        </div>
      ))}
    </div>
  </Frame>
);

const Closing = () => (
  <div className="slide-content">
    <div className="deck-grid-bg absolute inset-0" />
    <div className="absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-deck-lime opacity-15 blur-[180px]" />
    <div className="relative flex h-full flex-col items-center justify-center text-center">
      <div className="slide-kicker text-deck-lime">Definition of done</div>
      <h2 className="slide-title-lg mt-8">Ready to build<span className="text-deck-lime">.</span></h2>
      <p className="slide-subtitle mt-8 max-w-[1200px] text-deck-dim">Every phone updates live. The host never loses control. The room ends with a leaderboard and a CSV.</p>
    </div>
  </div>
);

export const slides = [
  { title: "Networkathon", C: Title }, { title: "Three surfaces", C: Surfaces }, { title: "Participant entry", C: PJoin },
  { title: "Participant activities", C: PActivities }, { title: "Participant wrap-up", C: PFinal }, { title: "Presentation view", C: Present },
  { title: "Presentation finale", C: Present2 }, { title: "Host panel", C: Admin }, { title: "State machine", C: States },
  { title: "Connectors", C: Connectors }, { title: "Build template", C: Template }, { title: "Data model", C: Data }, { title: "Ready to build", C: Closing },
];
