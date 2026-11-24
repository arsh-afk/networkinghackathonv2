import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SETTINGS, type EventSettings } from "./config";
import {
  readEventSnapshot,
  saveRemoteSettings,
  stateFromRow,
  subscribeToEvent,
  updateRemoteEvent,
  type HostEventPatch,
} from "./backend";
import { isSupabaseConfigured } from "@/lib/supabase";

export const STATES = [
  "waiting_room",
  "opening_spectrum",
  "planes",
  "shuffle_after_flight_path",
  "infomercial",
  "shuffle_after_spotlight",
  "crisis",
  "silent_ranking",
  "item_trade",
  "final_summary",
  "closing",
] as const;
export type EventStateKey = (typeof STATES)[number];

export const LABELS: Record<EventStateKey, string> = {
  waiting_room: "Waiting room",
  opening_spectrum: "Spectrum",
  planes: "Flight Path",
  shuffle_after_flight_path: "Shuffle · after Flight Path",
  infomercial: "60-Second Spotlight",
  shuffle_after_spotlight: "Shuffle · after Spotlight",
  crisis: "Red Alert",
  silent_ranking: "Silent Order",
  item_trade: "Trade Floor",
  final_summary: "Final Summit",
  closing: "Closing",
};

export type EventState = {
  state: EventStateKey;
  round: number;
  paused: boolean;
  timerEnd: number | null;
  spectrumQuestion: number;
  promoActive: boolean;
  promoIndex: number;
  participantCount: number;
  currentSpotlightTeam: number;
  spotlightRatingOpen: boolean;
  silentOrderStarted: boolean;
  tradeFloorDealt: boolean;
  tradeFloorTradingOpen: boolean;
};

export const DEFAULT_EVENT_STATE: EventState = {
  state: "waiting_room",
  round: 1,
  paused: false,
  timerEnd: null,
  spectrumQuestion: 0,
  promoActive: false,
  promoIndex: 0,
  participantCount: 0,
  currentSpotlightTeam: 0,
  spotlightRatingOpen: false,
  silentOrderStarted: false,
  tradeFloorDealt: false,
  tradeFloorTradingOpen: false,
};

export function advanceEventState(current: EventState, settings: EventSettings): EventState {
  if (current.state === "planes" && current.round < settings.planesRounds) {
    return { ...current, round: current.round + 1, timerEnd: null };
  }
  const index = STATES.indexOf(current.state);
  if (index < 0 || index === STATES.length - 1) return current;
  const next = STATES[index + 1];
  if (!next) return current;
  return {
    ...current,
    state: next,
    round: 1,
    timerEnd: null,
    spectrumQuestion: 0,
    currentSpotlightTeam: next === "infomercial" ? 1 : 0,
    spotlightRatingOpen: false,
    silentOrderStarted: false,
    tradeFloorTradingOpen: false,
  };
}

export function createEventSlideJumpPatch(
  current: EventState,
  target: EventStateKey,
): HostEventPatch {
  return {
    state: target,
    round: 1,
    timerEnd: null,
    spectrumQuestion: target === "opening_spectrum" ? 0 : current.spectrumQuestion,
    promoActive: false,
    currentSpotlightTeam: target === "infomercial" ? 1 : 0,
    spotlightRatingOpen: false,
    silentOrderStarted: false,
    tradeFloorTradingOpen: false,
  };
}

export type ShuffleDirection = "clockwise" | "anti-clockwise" | "stay";

export function assignBalancedShuffle(
  participantIds: string[],
  settings: Pick<EventSettings, "shuffleClockwisePercent" | "shuffleAnticlockwisePercent">,
  seed: string,
): Record<string, ShuffleDirection> {
  if (
    settings.shuffleClockwisePercent < 0 ||
    settings.shuffleAnticlockwisePercent < 0 ||
    settings.shuffleClockwisePercent + settings.shuffleAnticlockwisePercent > 100
  ) {
    throw new Error("Shuffle percentages must be non-negative and total no more than 100%.");
  }
  if (participantIds.some((id) => !id.trim()))
    throw new Error("Participant IDs must not be empty.");
  if (new Set(participantIds).size !== participantIds.length)
    throw new Error("Participant IDs must be unique.");

  const stableHash = (value: string) => {
    let hash = 2166136261;
    for (const character of value) {
      hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    }
    return hash >>> 0;
  };
  const orderedIds = [...participantIds].sort((left, right) => {
    const difference = stableHash(`${seed}:${left}`) - stableHash(`${seed}:${right}`);
    return difference || left.localeCompare(right);
  });
  const clockwiseCount = Math.round((orderedIds.length * settings.shuffleClockwisePercent) / 100);
  const anticlockwiseCount = Math.min(
    Math.round((orderedIds.length * settings.shuffleAnticlockwisePercent) / 100),
    orderedIds.length - clockwiseCount,
  );

  return Object.fromEntries(
    orderedIds.map((id, index) => [
      id,
      index < clockwiseCount
        ? "clockwise"
        : index < clockwiseCount + anticlockwiseCount
          ? "anti-clockwise"
          : "stay",
    ]),
  );
}

export function useEventState(hostPasscode = "", onParticipantChange?: () => void) {
  const [state, setState] = useState<EventState>(DEFAULT_EVENT_STATE);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setConnectionError("Add Supabase credentials to .env.local to connect this app.");
      return;
    }
    try {
      return subscribeToEvent(
        (snapshot) => {
          setState({ ...snapshot.state, participantCount: snapshot.participantCount });
          setConnectionError(null);
        },
        (status) => {
          setConnectionError(
            status === "connected" ? null : "Live connection lost. Reconnecting to Supabase…",
          );
        },
        onParticipantChange,
      );
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : "Could not start the Supabase live connection.",
      );
      return;
    }
  }, [onParticipantChange]);

  const update = useCallback(
    async (patch: HostEventPatch) => {
      if (!hostPasscode) {
        setConnectionError("Unlock the host panel before changing event controls.");
        return false;
      }
      try {
        const row = await updateRemoteEvent(hostPasscode, patch);
        setState({ ...stateFromRow(row), participantCount: state.participantCount });
        setConnectionError(null);
        return true;
      } catch (error) {
        setConnectionError(
          error instanceof Error ? error.message : "Could not update event state.",
        );
        return false;
      }
    },
    [hostPasscode, state.participantCount],
  );

  return [state, update, connectionError] as const;
}

export function useEventSettings(hostPasscode = "") {
  const [settings, setSettings] = useState<EventSettings>(DEFAULT_SETTINGS);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setConnectionError("Add Supabase credentials to .env.local to connect this app.");
      return;
    }
    let active = true;
    readEventSnapshot()
      .then((snapshot) => {
        if (active) {
          setSettings(snapshot.settings);
          setConnectionError(null);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setConnectionError(
            error instanceof Error ? error.message : "Could not load event settings.",
          );
        }
      });
    const unsubscribe = subscribeToEvent(
      (snapshot) => {
        setSettings(snapshot.settings);
        setConnectionError(null);
      },
      (status) => {
        if (status !== "connected") {
          setConnectionError("Live connection lost. Reconnecting to Supabase…");
        }
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const saveSettings = useCallback(
    async (next: EventSettings) => {
      if (!hostPasscode) {
        setConnectionError("Unlock the host panel before changing event setup.");
        return false;
      }
      try {
        await saveRemoteSettings(hostPasscode, next);
        setSettings(next);
        setConnectionError(null);
        return true;
      } catch (error) {
        setConnectionError(
          error instanceof Error ? error.message : "Could not save event settings to Supabase.",
        );
        return false;
      }
    },
    [hostPasscode],
  );

  return [settings, saveSettings, connectionError] as const;
}

export function useCountdown(end: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const left = end ? Math.max(0, Math.round((end - now) / 1000)) : 0;
  return `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
}
