import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Award, Download, ExternalLink, Pause, Play, Search, Timer, Check, Send } from "lucide-react";
import {
  advanceEventState,
  createEventSlideJumpPatch,
  LABELS,
  STATES,
  useEventSettings,
  useEventState,
  type EventStateKey,
} from "@/app/state";
import {
  awardHostSkill,
  getHostRoster,
  updateHostScore,
  verifyHostPasscode,
  saveFlightPathScore,
  setSpotlightBackground,
  setSpotlightRatingOpen,
  startSilentOrder,
  completeSilentOrderLine,
  dealTradeFloorCards,
  getTradeFloorLeaderboard,
  type ParticipantProfile,
  type TradeFloorResult,
} from "@/app/backend";
import {
  SPECTRUM_DURATION_SECONDS,
  validateEventSettings,
  type EventSettings,
  type PromoSection,
} from "@/app/config";
import { Btn, Card, Kicker, Logo } from "@/app/ui";

const PROMO_SECTION_LABELS: Record<PromoSection, string> = {
  brand: "Club brand",
  community: "Community",
  opportunities: "Opportunities",
  threeV: "3V",
};

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Host panel — Networkathon" },
      { name: "description", content: "Control and configure the Networkathon event." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcode, setPasscode] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [event, updateEvent, eventError] = useEventState(passcode);
  const [settings, saveSettings, settingsError] = useEventSettings(passcode);
  const [tab, setTab] = useState<"live" | "setup">("live");
  const [eventSlideTarget, setEventSlideTarget] = useState<EventStateKey>("waiting_room");
  const [promoSlideTarget, setPromoSlideTarget] = useState<PromoSection>("brand");
  const [query, setQuery] = useState("");
  const [roster, setRoster] = useState<ParticipantProfile[]>([]);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [awarded, setAwarded] = useState<ParticipantProfile | null>(null);
  const [hostActionError, setHostActionError] = useState<string | null>(null);
  const [hostActionStatus, setHostActionStatus] = useState<string | null>(null);

  // Flight Path host measurement inputs
  const [fpTeam, setFpTeam] = useState(1);
  const [fpCat, setFpCat] = useState<"longest_flight" | "fastest" | "most_accurate">("longest_flight");
  const [fpVal, setFpVal] = useState(0);

  // Spotlight host backdrop URL input
  const [spotlightBgTeam, setSpotlightBgTeam] = useState(1);
  const [spotlightBgUrl, setSpotlightBgUrl] = useState("");

  // Trade Floor results
  const [tradeLeaderboard, setTradeLeaderboard] = useState<TradeFloorResult[]>([]);

  const loadRoster = useCallback(async () => {
    if (!passcode) return;
    try {
      setRoster(await getHostRoster(passcode));
      setRosterError(null);
    } catch (error) {
      setRosterError(error instanceof Error ? error.message : "Could not load participants.");
    }
  }, [passcode]);

  useEffect(() => {
    void loadRoster();
  }, [event.participantCount, loadRoster]);

  useEffect(() => {
    setEventSlideTarget(event.state);
  }, [event.state]);

  const index = STATES.indexOf(event.state);
  const nextEvent = advanceEventState(event, settings);
  const advance = useCallback(
    () =>
      updateEvent({
        state: nextEvent.state,
        round: nextEvent.round,
        timerEnd: nextEvent.timerEnd,
        spectrumQuestion: nextEvent.spectrumQuestion,
      }),
    [nextEvent.round, nextEvent.spectrumQuestion, nextEvent.state, nextEvent.timerEnd, updateEvent],
  );

  const timerMilliseconds =
    event.state === "opening_spectrum"
      ? SPECTRUM_DURATION_SECONDS * 1_000
      : event.state === "infomercial"
        ? settings.spotlightSeconds * 1_000
        : event.state === "crisis"
          ? settings.crisisMinutes * 60_000
          : settings.planesMinutes * 60_000;

  const nextLabel =
    event.state === "opening_spectrum"
      ? "Move to Flight Path"
      : event.state === "planes" && nextEvent.round !== event.round
        ? `Next round · ${nextEvent.round}`
        : nextEvent.state !== event.state
          ? `Advance · ${LABELS[nextEvent.state]}`
          : "Event finished";

  const jumpToEventSlide = async () => {
    const updated = await updateEvent(createEventSlideJumpPatch(event, eventSlideTarget));
    if (!updated) {
      setHostActionError("Could not jump to the selected event slide.");
      return;
    }
    setHostActionError(null);
    setHostActionStatus(`Jumped to ${LABELS[eventSlideTarget]}.`);
  };

  const jumpToPromoSlide = async () => {
    const sectionIndex = settings.promoOrder.indexOf(promoSlideTarget);
    if (sectionIndex < 0) {
      setHostActionError("The selected promo slide is not in the current promo order.");
      return;
    }
    const updated = await updateEvent({ promoActive: true, promoIndex: sectionIndex });
    if (!updated) {
      setHostActionError("Could not open the selected promo slide.");
      return;
    }
    setHostActionError(null);
    setHostActionStatus(`Showing ${PROMO_SECTION_LABELS[promoSlideTarget]} promo slide.`);
  };

  const returnToEventSlide = async () => {
    const updated = await updateEvent({ promoActive: false });
    if (!updated) {
      setHostActionError("Could not return to the live event slide.");
      return;
    }
    setHostActionError(null);
    setHostActionStatus(`Returned to ${LABELS[event.state]}.`);
  };

  const unlock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await verifyHostPasscode(passcodeInput);
      setPasscode(passcodeInput);
      setPasscodeInput("");
      setUnlockError(null);
    } catch (error) {
      setUnlockError(error instanceof Error ? error.message : "Could not unlock host controls.");
    }
  };

  const saveScore = async (participant: ParticipantProfile) => {
    const score = scores[participant.id] ?? 0;
    try {
      await updateHostScore(passcode, participant.id, event.state, event.round, score);
      setHostActionError(null);
      setHostActionStatus(`Saved round points for ${participant.name}.`);
      await loadRoster();
    } catch (error) {
      setHostActionError(error instanceof Error ? error.message : "Could not save score.");
    }
  };

  const awardSkill = async (participant: ParticipantProfile, skill: string) => {
    try {
      await awardHostSkill(passcode, participant.id, event.state, skill);
      setAwarded(null);
      setHostActionError(null);
      setHostActionStatus(`${skill} awarded to ${participant.name}.`);
      await loadRoster();
    } catch (error) {
      setHostActionError(error instanceof Error ? error.message : "Could not award skill.");
    }
  };

  const submitFlightScore = async () => {
    try {
      await saveFlightPathScore(passcode, fpTeam, event.round, fpCat, fpVal);
      setHostActionStatus(`Saved ${fpCat} for Team ${fpTeam}: ${fpVal}`);
      setHostActionError(null);
    } catch (error) {
      setHostActionError(error instanceof Error ? error.message : "Could not save flight measurement.");
    }
  };

  const updateSpotlightBg = async () => {
    try {
      await setSpotlightBackground(passcode, spotlightBgTeam, spotlightBgUrl);
      setHostActionStatus(`Updated backdrop for Team ${spotlightBgTeam}.`);
      setHostActionError(null);
    } catch (error) {
      setHostActionError(error instanceof Error ? error.message : "Could not set background.");
    }
  };

  const toggleSpotlightRating = async (open: boolean) => {
    try {
      await setSpotlightRatingOpen(passcode, event.currentSpotlightTeam || 1, open);
      await updateEvent({ spotlightRatingOpen: open });
      setHostActionStatus(`Rating window ${open ? "opened" : "closed"} for Team ${event.currentSpotlightTeam || 1}.`);
      setHostActionError(null);
    } catch (error) {
      setHostActionError(error instanceof Error ? error.message : "Could not toggle rating window.");
    }
  };

  const triggerSilentOrder = async () => {
    try {
      await startSilentOrder(passcode);
      await updateEvent({ silentOrderStarted: true });
      setHostActionStatus("Silent Order started with 3 random factors.");
      setHostActionError(null);
    } catch (error) {
      setHostActionError(error instanceof Error ? error.message : "Could not start Silent Order.");
    }
  };

  const completeLine = async (lineNum: number) => {
    try {
      await completeSilentOrderLine(passcode, lineNum);
      setHostActionStatus(`Line ${lineNum} marked as completed!`);
      setHostActionError(null);
    } catch (error) {
      setHostActionError(error instanceof Error ? error.message : "Could not complete line.");
    }
  };

  const triggerDealCards = async () => {
    try {
      await dealTradeFloorCards(passcode);
      await updateEvent({ tradeFloorDealt: true, tradeFloorTradingOpen: true });
      setHostActionStatus("Cards dealt from 4 decks to all participants!");
      setHostActionError(null);
    } catch (error) {
      setHostActionError(error instanceof Error ? error.message : "Could not deal cards.");
    }
  };

  const loadTradeLeaderboard = async () => {
    try {
      const res = await getTradeFloorLeaderboard(passcode);
      setTradeLeaderboard(res);
      setHostActionStatus("Leaderboard calculated.");
      setHostActionError(null);
    } catch (error) {
      setHostActionError(error instanceof Error ? error.message : "Could not calculate trade scores.");
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Name", "Student ID", "Score", "Skills"],
      ...roster.map((person) => [
        person.name,
        person.studentId,
        String(person.score),
        person.skills.join("; "),
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "networkathon-results.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!passcode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-deck-bg px-5 text-deck-ink">
        <form
          onSubmit={unlock}
          className="flex w-full max-w-md flex-col gap-5 rounded-3xl border border-deck-line bg-deck-surface p-7"
        >
          <Logo className="text-xl" />
          <div>
            <Kicker>Organizer access</Kicker>
            <h1 className="mt-2 font-display text-3xl font-bold">Unlock host controls</h1>
          </div>
          <label className="grid gap-2 text-sm font-semibold">
            Host passcode
            <input
              type="password"
              autoComplete="current-password"
              required
              value={passcodeInput}
              onChange={(change) => setPasscodeInput(change.target.value)}
              className="min-h-12 rounded-xl border border-deck-line bg-deck-bg px-3"
            />
          </label>
          {unlockError && (
            <p role="alert" className="text-sm text-deck-coral">
              {unlockError}
            </p>
          )}
          <Btn type="submit">Unlock</Btn>
        </form>
      </main>
    );
  }

  const participants = roster.filter((person) =>
    `${person.name} ${person.id}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <main className="min-h-screen bg-deck-bg text-deck-ink">
      <header className="flex flex-wrap items-center gap-4 border-b border-deck-line px-5 py-4 lg:px-8">
        <Logo className="text-xl" />
        <span className="rounded-full border border-deck-coral/60 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-deck-coral">
          Live host
        </span>
        <p className="ml-auto text-sm text-deck-dim">
          {event.participantCount} participants connected
        </p>
        <button
          type="button"
          onClick={() => setPasscode("")}
          className="min-h-11 rounded-xl border border-deck-line px-3 text-sm hover:bg-deck-surface"
        >
          Lock
        </button>
        <Link
          to="/present"
          target="_blank"
          className="flex min-h-11 items-center gap-2 rounded-xl border border-deck-line px-3 text-sm hover:bg-deck-surface"
        >
          Projector <ExternalLink size={16} />
        </Link>
      </header>

      <div className="mx-auto max-w-[1680px] space-y-5 p-4 lg:p-8">
        {(eventError || settingsError || hostActionError) && (
          <div role="alert" className="rounded-xl border border-deck-coral px-4 py-3 text-sm text-deck-coral">
            {eventError || settingsError || hostActionError}
          </div>
        )}
        {hostActionStatus && (
          <p role="status" className="text-sm text-deck-lime">
            {hostActionStatus}
          </p>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Kicker>Event control</Kicker>
            <h1 className="mt-1 font-display text-3xl font-bold">{settings.eventTitle}</h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab("live")}
              className={`min-h-11 rounded-xl px-4 font-bold ${tab === "live" ? "bg-deck-lime text-deck-bg" : "border border-deck-line"}`}
            >
              Live controls
            </button>
            <button
              type="button"
              onClick={() => setTab("setup")}
              className={`min-h-11 rounded-xl px-4 font-bold ${tab === "setup" ? "bg-deck-lime text-deck-bg" : "border border-deck-line"}`}
            >
              Event setup
            </button>
          </div>
        </div>

        {tab === "setup" ? (
          <SettingsEditor settings={settings} saveSettings={saveSettings} />
        ) : (
          <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
            {/* Column 1: State & Flow */}
            <section className="flex flex-col gap-4">
              <Card>
                <Kicker>Current state</Kicker>
                <div className="mt-2 font-display text-2xl font-bold">
                  {LABELS[event.state]}
                  {event.state === "planes" && (
                    <span className="text-deck-lime"> · R{event.round}/{settings.planesRounds}</span>
                  )}
                </div>
                <div className="mt-4 flex gap-1">
                  {STATES.map((s, pos) => (
                    <span
                      key={s}
                      className={`h-1.5 flex-1 rounded-full ${pos <= index ? "bg-deck-lime" : "bg-deck-line"}`}
                    />
                  ))}
                </div>
              </Card>

              <button
                type="button"
                onClick={() => void advance()}
                className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-3xl bg-deck-lime px-4 py-5 text-center font-display text-xl font-bold text-deck-bg transition active:scale-[.99]"
              >
                {nextLabel}
              </button>

              <Btn
                tone={event.paused ? "sky" : "ghost"}
                onClick={() => updateEvent({ paused: !event.paused })}
                className="flex items-center justify-center gap-2"
              >
                {event.paused ? <Play size={18} /> : <Pause size={18} />}
                {event.paused ? "Resume screens" : "Pause screens"}
              </Btn>

              <Card className="space-y-3">
                <Kicker>Jump to event slide</Kicker>
                <select
                  aria-label="Select event slide"
                  value={eventSlideTarget}
                  onChange={(change) => setEventSlideTarget(change.target.value as EventStateKey)}
                  className="min-h-11 w-full rounded-xl border border-deck-line bg-deck-bg px-3 text-sm"
                >
                  {STATES.map((state) => (
                    <option key={state} value={state}>
                      {LABELS[state]}
                    </option>
                  ))}
                </select>
                <Btn tone="sky" onClick={() => void jumpToEventSlide()} className="w-full">
                  Jump to event slide
                </Btn>
              </Card>

              <Card className="space-y-3">
                <Kicker>Jump to promo slide</Kicker>
                <select
                  aria-label="Select promo slide"
                  value={
                    settings.promoOrder.includes(promoSlideTarget)
                      ? promoSlideTarget
                      : (settings.promoOrder[0] ?? "brand")
                  }
                  onChange={(change) => setPromoSlideTarget(change.target.value as PromoSection)}
                  className="min-h-11 w-full rounded-xl border border-deck-line bg-deck-bg px-3 text-sm"
                >
                  {settings.promoOrder.map((section) => (
                    <option key={section} value={section}>
                      {PROMO_SECTION_LABELS[section]}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <Btn tone="sky" onClick={() => void jumpToPromoSlide()} className="w-full">
                    Show promo
                  </Btn>
                  <Btn
                    tone="ghost"
                    onClick={() => void returnToEventSlide()}
                    disabled={!event.promoActive}
                    className="w-full"
                  >
                    Return to event
                  </Btn>
                </div>
              </Card>

              {/* Activity-Specific Host Action Controls */}
              {event.state === "planes" && (
                <Card className="space-y-3">
                  <Kicker>Flight Path Score Entry</Kicker>
                  <label className="text-xs">
                    Table #
                    <input
                      type="number"
                      min="1"
                      max={settings.tableCount}
                      value={fpTeam}
                      onChange={(e) => setFpTeam(Number(e.target.value))}
                      className="w-full mt-1 bg-deck-bg border border-deck-line rounded-lg p-2"
                    />
                  </label>
                  <label className="text-xs">
                    Category
                    <select
                      value={fpCat}
                      onChange={(e) => setFpCat(e.target.value as any)}
                      className="w-full mt-1 bg-deck-bg border border-deck-line rounded-lg p-2"
                    >
                      <option value="longest_flight">Longest flight time (seconds)</option>
                      <option value="fastest">Fastest speed / time</option>
                      <option value="most_accurate">Most accurate (distance to target)</option>
                    </select>
                  </label>
                  <label className="text-xs">
                    Measurement
                    <input
                      type="number"
                      step="0.01"
                      value={fpVal}
                      onChange={(e) => setFpVal(Number(e.target.value))}
                      className="w-full mt-1 bg-deck-bg border border-deck-line rounded-lg p-2"
                    />
                  </label>
                  <Btn onClick={() => void submitFlightScore()} tone="lime" className="w-full">
                    Record Measurement
                  </Btn>
                </Card>
              )}

              {event.state === "infomercial" && (
                <Card className="space-y-3">
                  <Kicker>Spotlight Controls</Kicker>
                  <div className="flex gap-2">
                    <Btn
                      tone="ghost"
                      onClick={() =>
                        updateEvent({
                          currentSpotlightTeam: Math.max(1, event.currentSpotlightTeam - 1),
                        })
                      }
                    >
                      Prev Team
                    </Btn>
                    <Btn
                      tone="ghost"
                      onClick={() =>
                        updateEvent({
                          currentSpotlightTeam: Math.min(settings.tableCount, event.currentSpotlightTeam + 1),
                        })
                      }
                    >
                      Next Team
                    </Btn>
                  </div>
                  <Btn
                    tone={event.spotlightRatingOpen ? "coral" : "sky"}
                    onClick={() => void toggleSpotlightRating(!event.spotlightRatingOpen)}
                    className="w-full"
                  >
                    {event.spotlightRatingOpen ? "Close Ratings" : "Open 0-100 Ratings"}
                  </Btn>
                  <label className="text-xs">
                    Team Backdrop Image URL
                    <input
                      type="text"
                      placeholder="https://..."
                      value={spotlightBgUrl}
                      onChange={(e) => setSpotlightBgUrl(e.target.value)}
                      className="w-full mt-1 bg-deck-bg border border-deck-line rounded-lg p-2"
                    />
                  </label>
                  <Btn onClick={() => void updateSpotlightBg()} tone="ghost" className="w-full">
                    Set Backdrop
                  </Btn>
                </Card>
              )}

              {event.state === "silent_ranking" && (
                <Card className="space-y-3">
                  <Kicker>Silent Order Controls</Kicker>
                  <Btn onClick={() => void triggerSilentOrder()} tone="lime" className="w-full">
                    Start Silent Order (Pick 3 Factors)
                  </Btn>
                  <p className="text-xs text-deck-dim">Mark line completion when ordered:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((l) => (
                      <Btn key={l} tone="ghost" onClick={() => void completeLine(l)} className="p-2 text-xs">
                        Line {l} Done
                      </Btn>
                    ))}
                  </div>
                </Card>
              )}

              {event.state === "item_trade" && (
                <Card className="space-y-3">
                  <Kicker>Trade Floor Controls</Kicker>
                  <Btn onClick={() => void triggerDealCards()} tone="lime" className="w-full">
                    Deal 3 Cards to All
                  </Btn>
                  <Btn onClick={() => void loadTradeLeaderboard()} tone="sky" className="w-full">
                    Score & Tabulate Hands
                  </Btn>
                </Card>
              )}
            </section>

            {/* Column 2: Projector Preview & Timers */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Kicker>Projector live stage</Kicker>
                <Link to="/present" target="_blank" className="text-sm text-deck-sky hover:underline">
                  Open full screen
                </Link>
              </div>
              <div className="aspect-video overflow-hidden rounded-3xl border border-deck-line bg-black">
                <iframe
                  title="Projector preview"
                  src="/present"
                  className="h-[200%] w-[200%] origin-top-left scale-50"
                />
              </div>
              <Card className="flex flex-wrap items-center gap-3">
                <Kicker className="mr-auto">Timer</Kicker>
                <Btn
                  tone="ghost"
                  onClick={() => updateEvent({ timerEnd: Date.now() + timerMilliseconds })}
                  className="flex items-center gap-2"
                >
                  <Timer size={17} /> Start timer
                </Btn>
                <Btn
                  tone="ghost"
                  onClick={() => updateEvent({ timerEnd: (event.timerEnd ?? Date.now()) + 60_000 })}
                >
                  +1 min
                </Btn>
                <Btn tone="ghost" onClick={() => updateEvent({ timerEnd: null })}>
                  Clear
                </Btn>
              </Card>

              {tradeLeaderboard.length > 0 && (
                <Card className="space-y-3">
                  <Kicker>Trade Floor Top Hands</Kicker>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {tradeLeaderboard.map((item, idx) => (
                      <div key={item.participantName} className="flex justify-between items-center text-sm p-2 bg-deck-bg rounded-lg">
                        <span className="font-semibold">#{idx + 1} {item.participantName}</span>
                        <span className="font-mono text-deck-lime font-bold">{item.handScore} pts</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </section>

            {/* Column 3: Participant Roster & Points */}
            <section className="flex min-w-0 flex-col gap-4">
              <Card className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Kicker>Participants</Kicker>
                  <button type="button" onClick={() => void loadRoster()} className="text-xs text-deck-sky hover:underline">
                    Refresh
                  </button>
                </div>
                <label className="flex min-h-11 items-center gap-2 rounded-xl border border-deck-line px-3">
                  <Search size={16} className="text-deck-dim" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search participant name..."
                    className="w-full bg-transparent outline-none text-sm"
                  />
                </label>
                <div className="max-h-80 space-y-2 overflow-auto">
                  {participants.map((person) => (
                    <div key={person.id} className="flex items-center gap-2 rounded-xl bg-deck-bg px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold">{person.name}</div>
                        <div className="font-mono text-xs text-deck-dim">Table {person.tableNumber ?? "-"}</div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={scores[person.id] ?? 0}
                        onChange={(e) => setScores({ ...scores, [person.id]: Number(e.target.value) })}
                        onBlur={() => void saveScore(person)}
                        className="w-16 rounded-lg border border-deck-line bg-deck-surface px-2 py-1 text-right font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setAwarded(person)}
                        className="rounded-lg p-2 text-deck-lime hover:bg-deck-surface"
                      >
                        <Award size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                {awarded && (
                  <div className="space-y-2 border-t border-deck-line pt-3">
                    <Kicker>Award skill to {awarded.name}</Kicker>
                    <div className="flex flex-wrap gap-2">
                      {settings.skills.map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => void awardSkill(awarded, skill)}
                          className="rounded-full border border-deck-line px-3 py-1 text-xs hover:border-deck-lime"
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
              <Btn onClick={exportCsv} disabled={roster.length === 0} className="flex items-center justify-center gap-2">
                <Download size={18} /> Export CSV
              </Btn>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function SettingsEditor({
  settings,
  saveSettings,
}: {
  settings: EventSettings;
  saveSettings: (settings: EventSettings) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => setDraft(settings), [settings]);

  const update = <K extends keyof EventSettings>(key: K, value: EventSettings[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationError = validateEventSettings(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaved(await saveSettings(draft));
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4">
          <Kicker>General Settings</Kicker>
          <TextField label="Event Name" value={draft.eventTitle} onChange={(v) => update("eventTitle", v)} />
          <TextField label="Tagline" value={draft.tagline} onChange={(v) => update("tagline", v)} />
          <NumberField label="Table Count" min={1} max={100} value={draft.tableCount} onChange={(v) => update("tableCount", v)} />
        </Card>

        <Card className="space-y-4">
          <Kicker>Activity Rules & Content</Kicker>
          <TextAreaField
            label="Spectrum Answer Stops (5 lines: Agree down to Disagree)"
            value={draft.spectrumOptions.join("\n")}
            onChange={(v) => update("spectrumOptions", v.split("\n"))}
          />
          <TextAreaField
            label="Flight Path Material Sets (one per line)"
            value={draft.flightPathMaterialSets.join("\n")}
            onChange={(v) => update("flightPathMaterialSets", v.split("\n"))}
          />
          <TextAreaField
            label="Silent Order Factor Pool (one per line)"
            value={draft.silentOrderFactors.join("\n")}
            onChange={(v) => update("silentOrderFactors", v.split("\n"))}
          />
        </Card>
      </div>

      {(error || saved) && (
        <p className={error ? "text-sm text-deck-coral" : "text-sm text-deck-lime"}>
          {error || "Settings saved."}
        </p>
      )}
      <Btn type="submit">Save event setup</Btn>
    </form>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 w-full rounded-xl border border-deck-line bg-deck-bg px-3"
      />
    </label>
  );
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-h-11 w-full rounded-xl border border-deck-line bg-deck-bg px-3 font-mono"
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full rounded-xl border border-deck-line bg-deck-bg px-3 py-2"
      />
    </label>
  );
}

function escapeCsv(value: string) {
  const safeValue = /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}
