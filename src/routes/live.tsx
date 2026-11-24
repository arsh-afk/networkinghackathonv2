import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Check, Pause, Sparkles } from "lucide-react";
import {
  useCountdown,
  useEventSettings,
  useEventState,
  LABELS,
  type EventStateKey,
} from "@/app/state";
import {
  readMyParticipant,
  submitParticipantResponse,
  submitSpotlightRating,
  getMyTradeFloorHand,
  finalizeTradeFloorHand,
  getSilentOrderLines,
  type ParticipantProfile,
  type PlayingCard,
  type TradeFloorHand,
  type SilentOrderLine,
} from "@/app/backend";
import { Btn, Card, Kicker } from "@/app/ui";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live — Networkathon" },
      { name: "description", content: "Your live Networkathon participant view." },
    ],
  }),
  component: Live,
});

function Live() {
  const [participant, setParticipant] = useState<ParticipantProfile | null>(null);
  const [participantError, setParticipantError] = useState<string | null>(null);
  const refreshParticipant = useCallback(() => {
    void readMyParticipant()
      .then(setParticipant)
      .catch((error: unknown) =>
        setParticipantError(
          error instanceof Error ? error.message : "Could not load your participant data.",
        ),
      );
  }, []);
  const [event, , eventError] = useEventState("", refreshParticipant);
  const [settings, , settingsError] = useEventSettings();

  useEffect(() => {
    let active = true;
    readMyParticipant()
      .then((profile) => {
        if (active) setParticipant(profile);
      })
      .catch((error: unknown) => {
        if (active)
          setParticipantError(
            error instanceof Error ? error.message : "Could not load your participant profile.",
          );
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-5 bg-deck-bg px-5 py-5 text-deck-ink">
      <header className="sticky top-0 z-10 -mx-5 space-y-3 bg-deck-bg/95 px-5 pb-3 pt-1 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="truncate font-bold">
              {participant?.name ?? "Networkathon participant"}
            </div>
            <div className="font-mono text-xs text-deck-dim">
              {participant?.id ?? "Join to personalize your view"}
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-deck-surface px-3 py-1.5 text-xs font-bold text-deck-dim">
            ★ {participant?.skills.length ?? 0} skills
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-deck-surface px-4 py-3 font-mono text-xs uppercase tracking-widest text-deck-lime">
          <span className="h-2 w-2 animate-pulse rounded-full bg-deck-lime" />
          Now: {LABELS[event.state]}
          {event.state === "planes" && ` · R${event.round}/${settings.planesRounds}`}
        </div>
      </header>

      {(eventError || settingsError || participantError) && (
        <p role="alert" className="text-sm text-deck-coral">
          {eventError || settingsError || participantError}
        </p>
      )}
      {!participant && (
        <Card className="space-y-3 text-center">
          <p>
            {participantError
              ? "Your event profile could not be loaded."
              : "Join from this device to access your event view."}
          </p>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-deck-lime px-5 font-bold text-deck-bg"
          >
            Join the event
          </Link>
        </Card>
      )}

      <ActivityView
        state={event.state}
        round={event.round}
        timerEnd={event.timerEnd}
        questionIndex={event.spectrumQuestion}
        currentSpotlightTeam={event.currentSpotlightTeam}
        spotlightRatingOpen={event.spotlightRatingOpen}
        participant={participant}
        settings={settings}
        onParticipantChange={refreshParticipant}
      />

      {event.paused && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-deck-bg/95 px-6 text-center backdrop-blur">
          <Pause size={64} className="text-deck-sky" />
          <div className="font-display text-3xl font-bold">Paused</div>
          <p className="text-deck-dim">Hang tight — the host will resume shortly.</p>
        </div>
      )}
    </main>
  );
}

function ActivityView({
  state,
  round,
  timerEnd,
  questionIndex,
  currentSpotlightTeam,
  spotlightRatingOpen,
  participant,
  settings,
  onParticipantChange,
}: {
  state: EventStateKey;
  round: number;
  timerEnd: number | null;
  questionIndex: number;
  currentSpotlightTeam: number;
  spotlightRatingOpen: boolean;
  participant: ParticipantProfile | null;
  settings: ReturnType<typeof useEventSettings>[0];
  onParticipantChange: () => void;
}) {
  const [sliderIndex, setSliderIndex] = useState(2); // Default to Neutral (index 2)
  const [confirmedAnswer, setConfirmedAnswer] = useState<number | null>(null);
  const [spotlightRating, setSpotlightRating] = useState(75);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [spotlightPrompt, setSpotlightPrompt] = useState("");
  const [promptSubmitted, setPromptSubmitted] = useState(false);
  const [myHand, setMyHand] = useState<TradeFloorHand | null>(null);
  const [silentLines, setSilentLines] = useState<SilentOrderLine[]>([]);
  const [responseError, setResponseError] = useState<string | null>(null);
  const timer = useCountdown(timerEnd);

  // Fetch private Trade Floor hand
  useEffect(() => {
    if (state === "item_trade" && participant) {
      void getMyTradeFloorHand().then(setMyHand);
    }
  }, [state, participant]);

  // Fetch Silent Order line factors
  useEffect(() => {
    if (state === "silent_ranking") {
      void getSilentOrderLines().then(setSilentLines);
    }
  }, [state]);

  // Reset local state on state transitions
  useEffect(() => {
    setConfirmedAnswer(null);
    setRatingSubmitted(false);
    setPromptSubmitted(false);
    setResponseError(null);
    onParticipantChange();
  }, [state, questionIndex, currentSpotlightTeam, onParticipantChange]);

  const submitSpectrum = async () => {
    if (!participant) return;
    try {
      await submitParticipantResponse(participant.id, "spectrum", questionIndex, String(sliderIndex));
      setConfirmedAnswer(sliderIndex);
      setResponseError(null);
    } catch (err) {
      setResponseError(err instanceof Error ? err.message : "Failed to submit spectrum answer.");
    }
  };

  const submitRating = async () => {
    if (!participant || !currentSpotlightTeam) return;
    try {
      await submitSpotlightRating(participant.id, currentSpotlightTeam, spotlightRating);
      setRatingSubmitted(true);
      setResponseError(null);
    } catch (err) {
      setResponseError(err instanceof Error ? err.message : "Failed to submit rating.");
    }
  };

  const submitPrompt = async () => {
    if (!participant || !spotlightPrompt.trim()) return;
    try {
      await submitParticipantResponse(
        participant.id,
        "spotlight_prompt",
        participant.tableNumber ?? 1,
        spotlightPrompt.trim(),
      );
      setPromptSubmitted(true);
      setResponseError(null);
    } catch (err) {
      setResponseError(err instanceof Error ? err.message : "Failed to submit visual prompt.");
    }
  };

  const finalizeHand = async () => {
    if (!participant || !myHand) return;
    try {
      await finalizeTradeFloorHand(participant.id, myHand.finalCards);
      setMyHand({ ...myHand, handFinalized: true });
    } catch (err) {
      setResponseError(err instanceof Error ? err.message : "Failed to finalize hand.");
    }
  };

  switch (state) {
    case "waiting_room":
      return (
        <section className="flex flex-1 flex-col justify-center gap-4 text-center">
          <Kicker>Welcome to {settings.eventTitle}</Kicker>
          <h1 className="font-display text-4xl font-bold leading-tight">{settings.tagline}</h1>
          <Card className="text-left leading-relaxed text-deck-dim">
            Keep this page open. Your instructions and interactive controls will update live when the host advances each activity.
          </Card>
        </section>
      );

    case "opening_spectrum": {
      const question = settings.spectrumQuestions[questionIndex];
      const stops = settings.spectrumOptions.length === 5
        ? settings.spectrumOptions
        : ["Agree", "Slightly agree", "Neutral", "Slightly disagree", "Disagree"];

      if (!question) {
        return (
          <Message title="All prompts answered" body="Wait for the host to move to Flight Path." />
        );
      }

      return (
        <section className="flex flex-col gap-5">
          <Kicker>
            Prompt {questionIndex + 1} of {settings.spectrumQuestions.length}
          </Kicker>
          <h1 className="font-display text-2xl font-bold leading-snug">{question}</h1>

          {/* 5-stop Discrete Slider */}
          <Card className="space-y-6 py-6 text-center">
            <div className="font-display text-2xl font-bold text-deck-lime">
              {stops[sliderIndex]}
            </div>

            <div className="relative px-2">
              <input
                type="range"
                min="0"
                max="4"
                step="1"
                value={sliderIndex}
                onChange={(e) => setSliderIndex(Number(e.target.value))}
                className="w-full accent-deck-lime h-3 bg-deck-line rounded-lg cursor-pointer"
              />
              <div className="flex justify-between mt-3 text-[11px] font-mono text-deck-dim">
                <span>Agree</span>
                <span>Neutral</span>
                <span>Disagree</span>
              </div>
            </div>

            <Btn onClick={() => void submitSpectrum()} tone="lime" className="w-full">
              {confirmedAnswer !== null ? "Update Answer" : "Confirm Answer"}
            </Btn>
          </Card>

          {confirmedAnswer !== null && (
            <p role="status" className="flex items-center justify-center gap-1.5 text-sm text-deck-lime">
              <Check size={16} /> Saved: {stops[confirmedAnswer]}
            </p>
          )}
          {responseError && (
            <p role="alert" className="text-sm text-deck-coral">
              {responseError}
            </p>
          )}
        </section>
      );
    }

    case "planes":
      return (
        <section className="flex flex-col gap-4">
          <Card className="text-center">
            <Kicker>Flight Path · Round</Kicker>
            <div className="font-display text-8xl font-bold text-deck-lime">{round}</div>
            <p className="text-deck-dim">of {settings.planesRounds}</p>
          </Card>

          <Card className="space-y-3">
            <Kicker>Award Categories</Kicker>
            <div className="grid gap-2 text-sm">
              {settings.flightPathCategories.map((cat, i) => (
                <div key={cat} className="flex items-center gap-2 rounded-xl bg-deck-bg p-3">
                  <span className="font-mono text-deck-lime font-bold">#{i + 1}</span>
                  <span className="font-semibold">{cat}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-2">
            <Kicker>Material Sets</Kicker>
            {settings.flightPathMaterialSets.map((mat) => (
              <p key={mat} className="text-sm text-deck-dim">
                • {mat}
              </p>
            ))}
          </Card>

          <Card>
            <Kicker>Instructions</Kicker>
            <p className="mt-2 text-sm leading-relaxed">{settings.planesInstructions}</p>
          </Card>
        </section>
      );

    case "shuffle_after_flight_path":
    case "shuffle_after_spotlight": {
      const direction = participant?.shuffleDirection;
      if (!participant)
        return (
          <Message title="Join first" body="Your table direction appears here after you join." />
        );
      if (!direction)
        return (
          <Message
            title="Shuffle is preparing"
            body="Your direction will appear when the host triggers this shuffle."
          />
        );
      const isClockwise = direction === "clockwise";
      const Icon = isClockwise ? ArrowDownRight : ArrowUpRight;
      const detail =
        direction === "stay"
          ? `Stay at table ${participant.tableNumber ?? participant.shuffleFromTable ?? "–"}.`
          : `Move to table ${participant.shuffleToTable ?? "–"}.`;
      return (
        <section className="flex flex-1 flex-col items-center justify-center gap-5 rounded-[32px] bg-deck-lime p-8 text-center text-deck-bg">
          <Kicker className="text-deck-bg/70">
            {state === "shuffle_after_flight_path" ? "After Flight Path" : "After Spotlight"}
          </Kicker>
          {direction === "stay" ? (
            <div className="font-display text-6xl font-bold">Stay</div>
          ) : (
            <Icon size={112} strokeWidth={2.5} />
          )}
          <h1 className="font-display text-4xl font-bold">{direction.replace("-", " ")}</h1>
          <p className="text-lg font-semibold">
            {settings.shuffleMessage} {detail}
          </p>
        </section>
      );
    }

    case "infomercial":
      return (
        <section className="flex flex-col gap-4">
          <Card>
            <Kicker>60-Second Spotlight · Team Script</Kicker>
            <p className="mt-2 text-base font-semibold leading-relaxed">
              {settings.spotlightScripts[participant?.tableNumber ?? 1] || settings.spotlightScript}
            </p>
          </Card>

          {/* Prompt submission for team backdrop */}
          <Card className="space-y-3">
            <Kicker>Visual Backdrop Prompt</Kicker>
            <p className="text-xs text-deck-dim">
              Submit a prompt describing the backdrop for your team’s presentation. The host will preview and project it.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Futuristic city with flying cars"
                value={spotlightPrompt}
                onChange={(e) => setSpotlightPrompt(e.target.value)}
                disabled={promptSubmitted}
                className="flex-1 rounded-xl border border-deck-line bg-deck-bg px-3 py-2 text-sm outline-none focus:border-deck-lime"
              />
              <Btn onClick={() => void submitPrompt()} disabled={promptSubmitted || !spotlightPrompt.trim()} tone="lime">
                {promptSubmitted ? "Sent" : "Submit"}
              </Btn>
            </div>
            {promptSubmitted && (
              <p className="text-xs text-deck-lime">Prompt submitted for host approval.</p>
            )}
          </Card>

          {/* 0-100 Rating Slider */}
          {spotlightRatingOpen ? (
            <Card className="space-y-4 border-2 border-deck-sky text-center">
              <Kicker className="text-deck-sky">
                Rate Team {currentSpotlightTeam}'s Pitch
              </Kicker>
              <div className="font-display text-4xl font-bold text-deck-sky">
                {spotlightRating} / 100
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={spotlightRating}
                onChange={(e) => setSpotlightRating(Number(e.target.value))}
                className="w-full accent-deck-sky h-3 bg-deck-line rounded-lg cursor-pointer"
              />
              <Btn onClick={() => void submitRating()} tone="sky" className="w-full">
                {ratingSubmitted ? "Update Rating" : "Submit Rating"}
              </Btn>
              {ratingSubmitted && (
                <p className="text-xs text-deck-lime">Rating saved!</p>
              )}
            </Card>
          ) : (
            <Card className="text-center text-deck-dim py-4">
              Rating window is currently closed. Wait for the host to open voting for the current team.
            </Card>
          )}

          {responseError && (
            <p role="alert" className="text-sm text-deck-coral">
              {responseError}
            </p>
          )}
        </section>
      );

    case "crisis":
      return (
        <section className="flex flex-col gap-4">
          <Card className="border-2 border-deck-coral">
            <Kicker className="text-deck-coral">Red Alert · Scenario</Kicker>
            <p className="mt-3 text-lg font-bold leading-relaxed">{settings.crisisScenario}</p>
          </Card>
          <Card>
            <Kicker>Instructions</Kicker>
            <p className="mt-2 text-sm text-deck-dim leading-relaxed">{settings.crisisInstructions}</p>
          </Card>
          <Card className="text-center">
            <Kicker>Time Remaining</Kicker>
            <p className="mt-2 font-mono text-4xl font-bold text-deck-coral">{timer}</p>
          </Card>
        </section>
      );

    case "silent_ranking": {
      // Find line assigned to this participant or show all 3 lines
      const myLineNum = participant?.tableNumber ? ((participant.tableNumber - 1) % 3) + 1 : 1;
      const myLine = silentLines.find((l) => l.lineNumber === myLineNum);

      return (
        <section className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <div className="text-6xl" aria-hidden="true">
            🤫
          </div>
          <Kicker>Silent Order</Kicker>
          <h1 className="font-display text-3xl font-bold">Line #{myLineNum}</h1>
          <Card className="w-full text-left space-y-3">
            <Kicker>Your Line's Factor</Kicker>
            <p className="text-xl font-bold text-deck-lime">
              {myLine?.factor || settings.silentRankingPrompt}
            </p>
            <p className="text-xs text-deck-dim">
              Organize your line silently according to this factor. No speaking allowed!
            </p>
          </Card>
        </section>
      );
    }

    case "item_trade":
      return (
        <section className="flex flex-col gap-4">
          <Kicker>Trade Floor</Kicker>
          <h1 className="font-display text-3xl font-bold">Trade Your Hand</h1>
          <Card className="leading-relaxed text-sm text-deck-dim">
            {settings.tradeFloorInstructions}
          </Card>

          {/* Cards Display */}
          <Card className="space-y-4">
            <Kicker>Your 3 Cards</Kicker>
            <div className="grid grid-cols-3 gap-3">
              {(myHand?.finalCards ?? []).map((card: PlayingCard, idx: number) => (
                <div
                  key={`${card.suit}-${card.rank}-${idx}`}
                  className="flex flex-col items-center justify-center rounded-2xl border border-deck-line bg-deck-bg p-4 aspect-[2.5/3.5]"
                >
                  <span
                    className={`text-2xl ${
                      card.suit === "hearts" || card.suit === "diamonds"
                        ? "text-deck-coral"
                        : "text-deck-ink"
                    }`}
                  >
                    {card.suit === "hearts"
                      ? "♥"
                      : card.suit === "diamonds"
                        ? "♦"
                        : card.suit === "clubs"
                          ? "♣"
                          : "♠"}
                  </span>
                  <span className="font-display text-2xl font-bold mt-1">{card.rank}</span>
                  <span className="text-[10px] font-mono text-deck-dim mt-2">D{card.deck}</span>
                </div>
              ))}
            </div>

            {myHand && (
              <Btn
                onClick={() => void finalizeHand()}
                disabled={myHand.handFinalized}
                tone={myHand.handFinalized ? "ghost" : "lime"}
                className="w-full"
              >
                {myHand.handFinalized ? "Hand Finalized" : "Finalize Hand"}
              </Btn>
            )}
          </Card>
        </section>
      );

    case "final_summary":
      return (
        <section className="flex flex-col gap-4">
          <Kicker>Final Summit</Kicker>
          <h1 className="font-display text-3xl font-bold">Your Event Summary</h1>
          <Card className="leading-relaxed text-deck-dim">
            {participant?.score ?? 0} points · {participant?.skills.length ?? 0} skills earned
          </Card>
          {participant?.skills.map((skill) => (
            <Card key={skill} className="py-3 flex items-center gap-2">
              <Sparkles size={18} className="text-deck-lime" />
              <span>{skill}</span>
            </Card>
          ))}
        </section>
      );

    case "closing":
      return <Message title="Thanks for coming!" body={settings.closingMessage} />;
  }
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <p className="text-deck-dim">{body}</p>
    </section>
  );
}
