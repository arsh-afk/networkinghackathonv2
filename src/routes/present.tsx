import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Maximize } from "lucide-react";
import { useEventSettings, useEventState, useCountdown, LABELS } from "@/app/state";
import {
  getSpectrumDistribution,
  getFlightPathScores,
  getSpotlightTeams,
  getSilentOrderLines,
  type FlightPathScore,
  type SpotlightTeam,
  type SilentOrderLine,
} from "@/app/backend";
import { Kicker, Logo } from "@/app/ui";
import { SPECTRUM_DURATION_SECONDS, type PromoSection } from "@/app/config";

export const Route = createFileRoute("/present")({
  head: () => ({
    meta: [
      { title: "Projector — Networkathon" },
      { name: "description", content: "Projector view for the Networkathon live event." },
    ],
  }),
  component: Present,
});

export function PresentStage({ compact }: { compact?: boolean }) {
  const [event] = useEventState();
  const [settings] = useEventSettings();
  const timer = useCountdown(event.timerEnd);
  const [origin, setOrigin] = useState("");
  const promoOrder = settings.promoOrder;
  const promoIndex = event.promoIndex % promoOrder.length;
  const activeSection = promoOrder[promoIndex] ?? "brand";

  useEffect(() => setOrigin(window.location.origin), []);
  const body = event.promoActive ? (
    <PromoSlide section={activeSection} settings={settings} joinUrl={settings.joinUrl || origin} />
  ) : (
    <LiveSlide
      state={event.state}
      round={event.round}
      spectrumQuestion={event.spectrumQuestion}
      currentSpotlightTeam={event.currentSpotlightTeam}
      participantCount={event.participantCount}
      timer={timer}
      timerEnd={event.timerEnd}
      settings={settings}
      joinUrl={settings.joinUrl || origin}
    />
  );

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-deck-bg text-deck-ink">
      <div className="deck-grid-bg absolute inset-0" />
      <div className="relative flex items-center justify-between gap-6 px-[4vw] pt-[3vh]">
        <Logo className="text-[clamp(16px,2vw,32px)]" />
        <Kicker className={event.paused ? "text-deck-coral" : "text-deck-lime"}>
          ● {event.promoActive ? "Club promo" : LABELS[event.state]}
        </Kicker>
      </div>
      <div className={`relative flex-1 px-[5vw] py-[4vh] ${compact ? "text-[40%]" : ""}`}>
        {body}
      </div>
      {event.paused && (
        <div className="absolute inset-0 flex items-center justify-center bg-deck-bg/90 font-display text-[8vw] font-bold">
          Paused
        </div>
      )}
      {event.promoActive && (
        <div
          className="relative flex justify-center gap-2 pb-[2vh]"
          aria-label="Promo slide position"
        >
          {promoOrder.map((section, index) => (
            <span
              key={section}
              className={`h-1.5 w-10 rounded-full ${index === promoIndex ? "bg-deck-lime" : "bg-deck-line"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LiveSlide({
  state,
  round,
  spectrumQuestion,
  currentSpotlightTeam,
  participantCount,
  timer,
  timerEnd,
  settings,
  joinUrl,
}: {
  state: keyof typeof LABELS;
  round: number;
  spectrumQuestion: number;
  currentSpotlightTeam: number;
  participantCount: number;
  timer: string;
  timerEnd: number | null;
  settings: ReturnType<typeof useEventSettings>[0];
  joinUrl: string;
}) {
  const [spectrumCounts, setSpectrumCounts] = useState<Record<number, number>>({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 });
  const [flightScores, setFlightScores] = useState<FlightPathScore[]>([]);
  const [spotlightTeams, setSpotlightTeams] = useState<SpotlightTeam[]>([]);
  const [silentLines, setSilentLines] = useState<SilentOrderLine[]>([]);

  // Refresh live data for current activity
  useEffect(() => {
    if (state === "opening_spectrum") {
      void getSpectrumDistribution(spectrumQuestion).then(setSpectrumCounts);
    }
    if (state === "planes" || state === "final_summary") {
      void getFlightPathScores().then(setFlightScores);
    }
    if (state === "infomercial" || state === "final_summary") {
      void getSpotlightTeams().then(setSpotlightTeams);
    }
    if (state === "silent_ranking" || state === "final_summary") {
      void getSilentOrderLines().then(setSilentLines);
    }
  }, [state, spectrumQuestion]);

  switch (state) {
    case "waiting_room":
      return (
        <div className="grid h-full grid-cols-[1.4fr_1fr] items-center gap-[5vw]">
          <div className="space-y-5">
            <Kicker className="text-deck-lime">Scan to join</Kicker>
            <h1 className="font-display text-[6vw] font-bold leading-[1.05]">
              {settings.eventTitle}
            </h1>
            <p className="text-[2vw] text-deck-dim">Name + student ID · no password</p>
            <p className="text-[1.4vw] text-deck-dim">{settings.tagline}</p>
          </div>
          <div className="flex flex-col items-center gap-4 text-center">
            <JoinQr value={joinUrl} />
            <div className="text-xl text-deck-dim">
              {participantCount} participant{participantCount === 1 ? "" : "s"} joined so far.
            </div>
          </div>
        </div>
      );

    case "opening_spectrum": {
      const question =
        settings.spectrumQuestions[spectrumQuestion] ?? settings.spectrumQuestions[0];
      const stops = settings.spectrumOptions.length === 5
        ? settings.spectrumOptions
        : ["Agree", "Slightly agree", "Neutral", "Slightly disagree", "Disagree"];
      const totalAnswers = Object.values(spectrumCounts).reduce((a, b) => a + b, 0);
      const [minutesLeft = 0, secondsLeft = 0] = timer.split(":").map(Number);
      const remainingSeconds =
        timerEnd === null ? SPECTRUM_DURATION_SECONDS : minutesLeft * 60 + secondsLeft;
      const timerProgress = Math.max(0, Math.min(1, remainingSeconds / SPECTRUM_DURATION_SECONDS));
      const timerCircumference = 2 * Math.PI * 52;
      const timerIsUrgent = timerEnd !== null && remainingSeconds <= 5;

      return (
        <div className="flex h-full flex-col justify-center gap-6">
          <div className="flex items-center justify-between gap-8">
            <div className="space-y-4">
              <Kicker className="text-deck-sky">Spectrum · Question {spectrumQuestion + 1}</Kicker>
              <h1 className="font-display text-[4vw] font-bold leading-tight">{question}</h1>
              <p className="text-lg text-deck-dim">
                Choose your position on your phone before the countdown ends.
              </p>
            </div>
            <div
              className="relative grid h-44 w-44 shrink-0 place-items-center rounded-full bg-deck-surface"
              aria-label={
                timerEnd === null
                  ? `Spectrum timer ready for ${SPECTRUM_DURATION_SECONDS} seconds`
                  : `Spectrum time remaining: ${timer}`
              }
            >
              <svg
                aria-hidden="true"
                className="absolute inset-0 h-full w-full -rotate-90"
                viewBox="0 0 120 120"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-deck-line"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={timerCircumference}
                  strokeDashoffset={timerCircumference * (1 - timerProgress)}
                  className={`transition-[stroke-dashoffset] duration-500 ${
                    timerIsUrgent ? "text-deck-coral" : "text-deck-lime"
                  }`}
                />
              </svg>
              <div className="flex flex-col items-center">
                <span
                  className={`font-mono text-4xl font-bold ${
                    timerIsUrgent ? "animate-pulse text-deck-coral" : "text-deck-lime"
                  }`}
                >
                  {timerEnd === null
                    ? `00:${String(SPECTRUM_DURATION_SECONDS).padStart(2, "0")}`
                    : timer}
                </span>
                <span className="font-mono text-xs uppercase tracking-widest text-deck-dim">
                  {timerEnd === null ? "Ready" : remainingSeconds === 0 ? "Time" : "Seconds left"}
                </span>
              </div>
            </div>
          </div>

          {/* Aggregated Discrete Distribution Histogram */}
          <div className="grid grid-cols-5 gap-3 mt-4">
            {stops.map((option, idx) => {
              const count = spectrumCounts[idx] ?? 0;
              const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
              return (
                <div key={option} className="flex flex-col items-center gap-2">
                  <div className="w-full h-40 bg-deck-surface rounded-2xl flex flex-col justify-end p-2 overflow-hidden border border-deck-line">
                    <div
                      className="w-full bg-deck-lime rounded-xl transition-all duration-500"
                      style={{ height: `${Math.max(8, pct)}%` }}
                    />
                  </div>
                  <span className="font-mono text-xl font-bold text-deck-lime">{pct}%</span>
                  <span className="text-xs text-center text-deck-dim">{option}</span>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-deck-dim text-center mt-2">
            {totalAnswers} participant response{totalAnswers === 1 ? "" : "s"} recorded live.
          </p>
        </div>
      );
    }

    case "planes":
      return (
        <div className="grid h-full grid-cols-2 items-center gap-10">
          <div>
            <Kicker>
              Flight Path · Round {round} of {settings.planesRounds}
            </Kicker>
            <div className="mt-4 font-display text-[9vw] font-bold leading-none text-deck-lime">
              {timer}
            </div>
            <p className="mt-5 text-2xl text-deck-dim">{settings.planesInstructions}</p>
          </div>

          <div className="rounded-3xl border border-deck-line bg-deck-surface p-8 space-y-4">
            <Kicker>Category Benchmarks</Kicker>
            <div className="space-y-3">
              {settings.flightPathCategories.map((cat, i) => (
                <div key={cat} className="flex justify-between items-center p-3 bg-deck-bg rounded-xl">
                  <span className="font-semibold text-lg">{cat}</span>
                  <span className="font-mono text-deck-lime font-bold">Category #{i + 1}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-deck-dim pt-2">
              Scores recorded live in Host Console. Category winners awarded at Final Summit.
            </p>
          </div>
        </div>
      );

    case "shuffle_after_flight_path":
    case "shuffle_after_spotlight":
      return (
        <div className="grid h-full grid-cols-3 overflow-hidden rounded-[36px]">
          {[
            {
              label: "Clockwise",
              percent: settings.shuffleClockwisePercent,
              color: "bg-deck-lime",
            },
            {
              label: "Stay put",
              percent:
                100 - settings.shuffleClockwisePercent - settings.shuffleAnticlockwisePercent,
              color: "bg-deck-sky",
            },
            {
              label: "Anti-clockwise",
              percent: settings.shuffleAnticlockwisePercent,
              color: "bg-deck-coral",
            },
          ].map(({ label, percent, color }) => (
            <div
              key={label}
              className={`flex flex-col items-center justify-center gap-5 px-4 text-center text-deck-bg ${color}`}
            >
              <span className="font-display text-[clamp(22px,4vw,64px)] font-bold">{label}</span>
              <span className="font-mono text-[clamp(14px,2vw,32px)]">{percent}% of the room</span>
            </div>
          ))}
          <div className="absolute bottom-[8vh] left-1/2 -translate-x-1/2 rounded-full bg-deck-bg px-6 py-3 font-mono text-sm text-deck-ink">
            {state === "shuffle_after_flight_path" ? "After Flight Path" : "After Spotlight"}
          </div>
        </div>
      );

    case "infomercial": {
      const activeTeam = spotlightTeams.find((t) => t.teamNumber === currentSpotlightTeam);
      return (
        <div className="relative h-full flex flex-col justify-between overflow-hidden rounded-3xl p-8">
          {activeTeam?.backgroundImageUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm"
              style={{ backgroundImage: `url(${activeTeam.backgroundImageUrl})` }}
            />
          )}
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <Kicker className="text-deck-sky">60-Second Spotlight</Kicker>
              <h1 className="font-display text-[5vw] font-bold leading-tight mt-2">
                Team {currentSpotlightTeam || 1}
              </h1>
            </div>
            <div className="text-right">
              <Kicker>Timer</Kicker>
              <div className="font-mono text-[6vw] font-bold text-deck-sky">{timer}</div>
            </div>
          </div>

          <div className="relative z-10 max-w-3xl bg-deck-bg/80 backdrop-blur rounded-2xl p-6 border border-deck-line">
            <Kicker>Assigned Script</Kicker>
            <p className="text-2xl font-semibold mt-2">
              {activeTeam?.script || settings.spotlightScripts[currentSpotlightTeam] || settings.spotlightScript}
            </p>
          </div>

          <div className="relative z-10 flex justify-between items-center bg-deck-surface/90 rounded-2xl p-4 border border-deck-line">
            <span className="font-mono text-sm text-deck-dim">
              Approval Rating: {activeTeam?.averageRating ? `${activeTeam.averageRating}/100` : "Voting Open"}
            </span>
            <span className="text-sm font-semibold text-deck-lime">
              {activeTeam?.ratingCount ?? 0} votes cast
            </span>
          </div>
        </div>
      );
    }

    case "crisis":
      return (
        <div className="flex h-full flex-col justify-center gap-8">
          <div className="flex items-end justify-between gap-8">
            <div>
              <Kicker className="text-deck-coral">Red Alert</Kicker>
              <h1 className="mt-3 font-display text-[5vw] font-bold leading-tight">
                {settings.crisisScenario}
              </h1>
            </div>
            <div className="font-display text-[7vw] font-bold text-deck-coral">{timer}</div>
          </div>
          <p className="text-2xl text-deck-dim">{settings.crisisInstructions}</p>
        </div>
      );

    case "silent_ranking":
      return (
        <div className="flex h-full flex-col justify-center gap-6 text-center">
          <div className="text-[6vw]" aria-hidden="true">
            🤫
          </div>
          <Kicker>Silent Order</Kicker>
          <h1 className="font-display text-[4vw] font-bold">Rank In Silence</h1>
          <div className="grid grid-cols-3 gap-6 mt-4">
            {[1, 2, 3].map((num) => {
              const line = silentLines.find((l) => l.lineNumber === num);
              return (
                <div key={num} className="rounded-3xl border border-deck-line bg-deck-surface p-6 space-y-2">
                  <Kicker>Line #{num}</Kicker>
                  <p className="text-xl font-bold text-deck-lime">{line?.factor || "Assigning..."}</p>
                  <div className="pt-2 font-mono text-sm text-deck-dim">
                    {line?.completedAt ? (
                      <span className="text-deck-lime font-bold">✓ Completed {line.isWinner ? "(Winner!)" : ""}</span>
                    ) : (
                      <span>In progress...</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );

    case "item_trade":
      return (
        <div className="flex h-full flex-col justify-center gap-6">
          <Kicker className="text-deck-lime">Trade Floor</Kicker>
          <h1 className="font-display text-[5vw] font-bold">Trade & Maximize Your Score</h1>
          <p className="text-[2vw] text-deck-dim">{settings.tradeFloorInstructions}</p>
          <div className="rounded-2xl border border-deck-line bg-deck-surface p-6 max-w-2xl">
            <Kicker>Scoring Rules</Kicker>
            <p className="text-sm text-deck-dim mt-2">
              Cards with unique ranks in your final 3-card hand earn points (A=1, 2-10=face, J=11, Q=12, K=13). Duplicate ranks score zero!
            </p>
          </div>
        </div>
      );

    case "final_summary":
      return (
        <div className="flex h-full flex-col justify-center gap-6">
          <Kicker className="text-deck-lime">Final Summit</Kicker>
          <h1 className="font-display text-[4vw] font-bold">Event Champions & Results</h1>
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-3xl border border-deck-line bg-deck-surface p-6 space-y-3">
              <Kicker>Flight Path Champions</Kicker>
              <p className="text-sm text-deck-dim">Review verified measurements recorded across all categories.</p>
            </div>
            <div className="rounded-3xl border border-deck-line bg-deck-surface p-6 space-y-3">
              <Kicker>Silent Order & Trade Floor Winners</Kicker>
              <p className="text-sm text-deck-dim">Top ranking teams and best individual hands.</p>
            </div>
          </div>
        </div>
      );

    case "closing":
      return (
        <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
          <Logo className="text-[7vw]" />
          <p className="text-[2.4vw] text-deck-dim">{settings.closingMessage}</p>
        </div>
      );
  }
}

function PromoSlide({
  section,
  settings,
  joinUrl,
}: {
  section: PromoSection;
  settings: ReturnType<typeof useEventSettings>[0];
  joinUrl: string;
}) {
  if (section === "brand") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-8 text-center">
        <Logo className="text-[7vw]" />
        <Kicker className="text-deck-lime">The club behind Networkathon</Kicker>
        <h1 className="font-display text-[6vw] font-bold">{settings.eventTitle}</h1>
        <p className="text-[2.4vw] text-deck-dim">{settings.tagline}</p>
        <JoinQr value={joinUrl} size={160} />
      </div>
    );
  }
  if (section === "community") {
    const links = [
      ["WhatsApp", settings.communityLinks.whatsapp],
      ["Instagram", settings.communityLinks.instagram],
      ["LinkedIn", settings.communityLinks.linkedin],
      ["Club website", settings.communityLinks.clubWebsite],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]));
    return (
      <div className="flex h-full flex-col justify-center gap-7">
        <div className="space-y-3">
          <Kicker className="text-deck-lime">Join the community</Kicker>
          <h1 className="font-display text-[4.5vw] font-bold">Stay connected after tonight.</h1>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {links.length ? (
            links.map(([label, url]) => <QrCard key={label} label={label} value={url} />)
          ) : (
            <p className="col-span-4 rounded-2xl border border-deck-line p-6 text-xl text-deck-dim">
              Add social and club links in Host Setup to show their scannable QRs here.
            </p>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="grid h-full grid-cols-[1.2fr_1fr] items-center gap-12">
      <div className="space-y-5">
        <Kicker className="text-deck-coral">The spine of the club</Kicker>
        <h1 className="font-display text-[7vw] font-bold">3V</h1>
        <p className="text-[2.2vw] text-deck-dim">Hands-on. Build real things.</p>
      </div>
      <div className="flex justify-center">
        <JoinQr value={joinUrl} size={240} />
      </div>
    </div>
  );
}

function JoinQr({ value, size = 240 }: { value: string; size?: number }) {
  return value ? (
    <div className="rounded-2xl bg-white p-3">
      <QRCodeSVG value={value} size={size} level="M" aria-label="QR code to join the event" />
    </div>
  ) : (
    <div
      className="flex aspect-square items-center justify-center rounded-2xl border-2 border-dashed border-deck-line p-6 text-center text-deck-dim"
      style={{ width: size, height: size }}
    >
      Set the public join URL in Host Setup
    </div>
  );
}

function QrCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-3 rounded-2xl border border-deck-line bg-deck-surface p-4 text-center">
      <QRCodeSVG value={value} size={170} level="M" bgColor="#ffffff" fgColor="#101014" />
      <span className="text-lg font-bold">{label}</span>
    </div>
  );
}

function Present() {
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);

  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setFullscreenError(null);
    } catch {
      setFullscreenError("Fullscreen was blocked by the browser.");
    }
  };

  return (
    <div className="group relative h-screen">
      <PresentStage />
      {fullscreenError && (
        <p role="alert" className="absolute bottom-20 right-6 max-w-sm rounded-xl bg-deck-bg px-4 py-3 text-sm text-deck-coral">
          {fullscreenError}
        </p>
      )}
      <button
        type="button"
        aria-label="Enter fullscreen"
        onClick={() => void enterFullscreen()}
        className="absolute bottom-6 right-6 rounded-full border border-deck-line bg-deck-surface p-3 text-deck-ink opacity-0 transition focus:opacity-100 group-hover:opacity-100"
      >
        <Maximize size={20} />
      </button>
    </div>
  );
}
