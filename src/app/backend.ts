import { FunctionsHttpError, type RealtimeChannel } from "@supabase/supabase-js";
import { DEFAULT_EVENT_STATE, STATES, type EventState, type EventStateKey } from "./state";
import { readEventSettings, type EventSettings } from "./config";
import { getEventId, getSupabaseClient } from "@/lib/supabase";

export type EventStateRow = {
  state: EventStateKey;
  round: number;
  paused: boolean;
  timer_end: string | null;
  spectrum_question: number;
  promo_active: boolean;
  promo_index: number;
  participant_count: number;
  current_spotlight_team: number;
  spotlight_rating_open: boolean;
  silent_order_started: boolean;
  trade_floor_dealt: boolean;
  trade_floor_trading_open: boolean;
  updated_at: string;
};

export type EventSnapshot = {
  state: EventState;
  settings: EventSettings;
  participantCount: number;
};

export type HostEventPatch = Partial<Omit<EventState, "participantCount">> & {
  participantCount?: never;
};

type EventObserver = {
  onSnapshot: (snapshot: EventSnapshot) => void;
  onStatus: (status: "connected" | "reconnecting" | "error") => void;
  onParticipantChange?: () => void;
};

type SharedEventSubscription = {
  channel: RealtimeChannel;
  observers: Set<EventObserver>;
  refreshing: boolean;
  refreshQueued: boolean;
};

let sharedSubscription: SharedEventSubscription | null = null;

export type ParticipantProfile = {
  id: string;
  name: string;
  studentId: string;
  tableNumber: number | null;
  score: number;
  skills: string[];
  shuffleDirection: "clockwise" | "anti-clockwise" | "stay" | null;
  shuffleFromTable: number | null;
  shuffleToTable: number | null;
};

// Activity Feature Specific Types
export type FlightPathScore = {
  teamNumber: number;
  round: number;
  category: "longest_flight" | "fastest" | "most_accurate";
  measurement: number;
  notes: string;
};

export type SpotlightTeam = {
  teamNumber: number;
  script: string;
  promptText: string;
  backgroundImageUrl: string;
  presentationOrder: number;
  ratingOpen: boolean;
  averageRating: number | null;
  ratingCount: number;
};

export type SilentOrderLine = {
  lineNumber: number;
  factor: string;
  startedAt: string | null;
  completedAt: string | null;
  isWinner: boolean;
};

export type PlayingCard = {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank: string;
  deck: number;
};

export type TradeFloorHand = {
  dealtCards: PlayingCard[];
  finalCards: PlayingCard[];
  handFinalized: boolean;
  handScore: number | null;
};

export type TradeFloorResult = {
  participantName: string;
  finalCards: PlayingCard[];
  handScore: number;
};

export function stateFromRow(row: EventStateRow): EventState {
  if (!STATES.includes(row.state) || !Number.isInteger(row.round) || row.round < 1) {
    throw new Error("The event state record contains invalid data.");
  }
  return {
    ...DEFAULT_EVENT_STATE,
    state: row.state,
    round: row.round,
    paused: row.paused,
    timerEnd: row.timer_end ? new Date(row.timer_end).getTime() : null,
    spectrumQuestion: row.spectrum_question,
    promoActive: row.promo_active,
    promoIndex: row.promo_index,
    participantCount: row.participant_count,
    currentSpotlightTeam: row.current_spotlight_team ?? 0,
    spotlightRatingOpen: row.spotlight_rating_open ?? false,
    silentOrderStarted: row.silent_order_started ?? false,
    tradeFloorDealt: row.trade_floor_dealt ?? false,
    tradeFloorTradingOpen: row.trade_floor_trading_open ?? false,
  };
}

export async function readEventSnapshot(): Promise<EventSnapshot> {
  const supabase = getSupabaseClient();
  const eventId = getEventId();
  const [settingsResult, stateResult] = await Promise.all([
    supabase.from("event_config").select("settings").eq("event_id", eventId).single(),
    supabase
      .from("event_state")
      .select(
        "state,round,paused,timer_end,spectrum_question,promo_active,promo_index,participant_count,current_spotlight_team,spotlight_rating_open,silent_order_started,trade_floor_dealt,trade_floor_trading_open,updated_at",
      )
      .eq("event_id", eventId)
      .single(),
  ]);
  if (settingsResult.error) throw settingsResult.error;
  if (stateResult.error) throw stateResult.error;
  const parsedSettings = readEventSettings(JSON.stringify(settingsResult.data.settings) ?? null);
  if (parsedSettings.error) throw new Error(parsedSettings.error);
  return {
    settings: parsedSettings.settings,
    state: stateFromRow(stateResult.data as EventStateRow),
    participantCount: stateResult.data.participant_count,
  };
}

export async function ensureAnonymousSession() {
  const supabase = getSupabaseClient();
  const { data: current, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (current.session?.user.is_anonymous) return current.session.user.id;

  if (current.session) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.user) throw new Error("Supabase did not create an anonymous participant session.");
  return data.user.id;
}

export async function joinEvent(fullName: string, studentId: string) {
  const supabase = getSupabaseClient();
  await ensureAnonymousSession();
  const { data, error } = await supabase.rpc("join_networkathon", {
    p_event_id: getEventId(),
    p_full_name: fullName.trim(),
    p_student_id: studentId.trim(),
  });
  if (error) {
    if (error.code === "23505")
      throw new Error("This student ID has already joined. Ask the host for help.");
    throw new Error(error.message || "Unable to join the event.");
  }
  const participant = Array.isArray(data) ? data[0] : data;
  if (!participant?.participant_id)
    throw new Error("The join request did not return a participant record.");
  return {
    id: participant.participant_id as string,
    name: participant.full_name as string,
    studentId: participant.student_id as string,
    tableNumber: (participant.table_number as number | null) ?? null,
  };
}

export async function readMyParticipant(): Promise<ParticipantProfile | null> {
  const supabase = getSupabaseClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user.id;
  if (!userId) return null;

  const { data: participant, error } = await supabase
    .from("event_participants")
    .select("id,full_name,student_id,table_number")
    .eq("auth_user_id", userId)
    .eq("event_id", getEventId())
    .maybeSingle();
  if (error) throw error;
  if (!participant) return null;

  const [scores, awards, shuffle] = await Promise.all([
    supabase.from("round_scores").select("score").eq("participant_id", participant.id),
    supabase.from("skill_awards").select("skill_name").eq("participant_id", participant.id),
    supabase
      .from("shuffle_assignments")
      .select("direction,from_table,to_table")
      .eq("participant_id", participant.id)
      .order("shuffle_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (scores.error) throw scores.error;
  if (awards.error) throw awards.error;
  if (shuffle.error) throw shuffle.error;
  return {
    id: participant.id,
    name: participant.full_name,
    studentId: participant.student_id,
    tableNumber: participant.table_number,
    score: scores.data.reduce((total, item) => total + item.score, 0),
    skills: awards.data.map((item) => item.skill_name),
    shuffleDirection: shuffle.data?.direction ?? null,
    shuffleFromTable: shuffle.data?.from_table ?? null,
    shuffleToTable: shuffle.data?.to_table ?? null,
  };
}

export async function submitParticipantResponse(
  participantId: string,
  responseType: "spectrum" | "spotlight_vote" | "ready" | "trade_broadcast" | "spotlight_prompt",
  promptIndex: number,
  value: string,
) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("participant_responses").upsert(
    {
      event_id: getEventId(),
      participant_id: participantId,
      response_type: responseType,
      prompt_index: promptIndex,
      value,
    },
    { onConflict: "participant_id,response_type,prompt_index" },
  );
  if (error) throw error;
}

// === Spectrum: Distribution Aggregation for Projector ===
export async function getSpectrumDistribution(questionIndex: number): Promise<Record<number, number>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("get_spectrum_distribution", {
    p_event_id: getEventId(),
    p_prompt_index: questionIndex,
  });
  if (error) throw error;
  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const row of data ?? []) {
    const index = Number(row.response_value);
    const count = Number(row.response_count);
    if (Number.isInteger(index) && index >= 0 && index <= 4 && Number.isSafeInteger(count)) {
      counts[index] = count;
    }
  }
  return counts;
}

// === Flight Path ===
export async function getFlightPathScores(): Promise<FlightPathScore[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("flight_path_scores")
    .select("team_number,round,category,measurement,notes")
    .eq("event_id", getEventId())
    .order("team_number");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    teamNumber: row.team_number,
    round: row.round,
    category: row.category as "longest_flight" | "fastest" | "most_accurate",
    measurement: Number(row.measurement),
    notes: row.notes,
  }));
}

export async function saveFlightPathScore(
  passcode: string,
  teamNumber: number,
  round: number,
  category: "longest_flight" | "fastest" | "most_accurate",
  measurement: number,
  notes: string = "",
) {
  return invokeHostAction<{ ok: true }>(passcode, "save_flight_path_score", {
    teamNumber,
    round,
    category,
    measurement,
    notes,
  });
}

// === Spotlight ===
export async function submitSpotlightRating(
  participantId: string,
  teamNumber: number,
  rating: number,
) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("spotlight_ratings").upsert(
    {
      event_id: getEventId(),
      participant_id: participantId,
      team_number: teamNumber,
      rating,
    },
    { onConflict: "event_id,participant_id,team_number" },
  );
  if (error) throw error;
}

export async function getSpotlightTeams(): Promise<SpotlightTeam[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("spotlight_teams")
    .select("team_number,script,prompt_text,background_image_url,presentation_order,rating_open,average_rating,rating_count")
    .eq("event_id", getEventId())
    .order("presentation_order");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    teamNumber: row.team_number,
    script: row.script,
    promptText: row.prompt_text,
    backgroundImageUrl: row.background_image_url,
    presentationOrder: row.presentation_order,
    ratingOpen: row.rating_open,
    averageRating: row.average_rating !== null ? Number(row.average_rating) : null,
    ratingCount: row.rating_count,
  }));
}

export async function setSpotlightBackground(
  passcode: string,
  teamNumber: number,
  backgroundImageUrl: string,
) {
  return invokeHostAction<{ ok: true }>(passcode, "set_spotlight_background", {
    teamNumber,
    backgroundImageUrl,
  });
}

export async function setSpotlightRatingOpen(
  passcode: string,
  teamNumber: number,
  ratingOpen: boolean,
) {
  return invokeHostAction<{ ok: true }>(passcode, "set_spotlight_rating_state", {
    teamNumber,
    ratingOpen,
  });
}

// === Silent Order ===
export async function getSilentOrderLines(): Promise<SilentOrderLine[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("silent_order_lines")
    .select("line_number,factor,started_at,completed_at,is_winner")
    .eq("event_id", getEventId())
    .order("line_number");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    lineNumber: row.line_number,
    factor: row.factor,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    isWinner: row.is_winner,
  }));
}

export async function startSilentOrder(passcode: string) {
  return invokeHostAction<{ ok: true }>(passcode, "start_silent_order");
}

export async function completeSilentOrderLine(passcode: string, lineNumber: number) {
  return invokeHostAction<{ ok: true }>(passcode, "complete_silent_order_line", { lineNumber });
}

// === Trade Floor ===
export async function getMyTradeFloorHand(): Promise<TradeFloorHand | null> {
  const supabase = getSupabaseClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user.id;
  if (!userId) return null;

  const { data: participant } = await supabase
    .from("event_participants")
    .select("id")
    .eq("auth_user_id", userId)
    .eq("event_id", getEventId())
    .maybeSingle();
  if (!participant) return null;

  const { data, error } = await supabase
    .from("trade_floor_hands")
    .select("dealt_cards,final_cards,hand_finalized,hand_score")
    .eq("event_id", getEventId())
    .eq("participant_id", participant.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    dealtCards: data.dealt_cards as PlayingCard[],
    finalCards: data.final_cards as PlayingCard[],
    handFinalized: data.hand_finalized,
    handScore: data.hand_score,
  };
}

export async function finalizeTradeFloorHand(participantId: string, finalCards: PlayingCard[]) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("trade_floor_hands")
    .update({ final_cards: finalCards, hand_finalized: true })
    .eq("event_id", getEventId())
    .eq("participant_id", participantId);
  if (error) throw error;
}

export async function dealTradeFloorCards(passcode: string) {
  return invokeHostAction<{ ok: true }>(passcode, "deal_trade_floor_cards");
}

export async function getTradeFloorLeaderboard(passcode: string): Promise<TradeFloorResult[]> {
  return invokeHostAction<TradeFloorResult[]>(passcode, "get_trade_floor_leaderboard");
}

export function subscribeToEvent(
  onSnapshot: (snapshot: EventSnapshot) => void,
  onStatus: (status: "connected" | "reconnecting" | "error") => void,
  onParticipantChange?: () => void,
): () => void {
  const supabase = getSupabaseClient();
  const eventId = getEventId();
  const observer: EventObserver = {
    onSnapshot,
    onStatus,
    ...(onParticipantChange ? { onParticipantChange } : {}),
  };
  if (!sharedSubscription) {
    const shared: SharedEventSubscription = {
      channel: supabase.channel(`networkathon:${eventId}`),
      observers: new Set(),
      refreshing: false,
      refreshQueued: false,
    };
    const refresh = async () => {
      if (shared.refreshing) {
        shared.refreshQueued = true;
        return;
      }
      shared.refreshing = true;
      do {
        shared.refreshQueued = false;
        try {
          const snapshot = await readEventSnapshot();
          for (const subscriber of shared.observers) {
            subscriber.onSnapshot(snapshot);
            subscriber.onParticipantChange?.();
          }
        } catch (error) {
          for (const subscriber of shared.observers) subscriber.onStatus("error");
          console.error("Could not refresh event data", error);
        }
      } while (shared.refreshQueued && shared.observers.size > 0);
      shared.refreshing = false;
    };
    shared.channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_state", filter: `event_id=eq.${eventId}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_config", filter: `event_id=eq.${eventId}` },
        () => void refresh(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "round_scores" }, () => {
        for (const subscriber of shared.observers) subscriber.onParticipantChange?.();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "skill_awards" }, () => {
        for (const subscriber of shared.observers) subscriber.onParticipantChange?.();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "flight_path_scores" }, () => {
        void refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "spotlight_teams" }, () => {
        void refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "silent_order_lines" }, () => {
        void refresh();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          for (const subscriber of shared.observers) subscriber.onStatus("connected");
          void refresh();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          for (const subscriber of shared.observers) subscriber.onStatus("error");
        } else {
          for (const subscriber of shared.observers) subscriber.onStatus("reconnecting");
        }
      });
    sharedSubscription = shared;
  }
  sharedSubscription.observers.add(observer);
  if (sharedSubscription.observers.size > 1) observer.onStatus("connected");
  return () => {
    const active = sharedSubscription;
    if (!active) return;
    active.observers.delete(observer);
    if (active.observers.size === 0) {
      sharedSubscription = null;
      void supabase.removeChannel(active.channel);
    }
  };
}

export async function invokeHostAction<T>(
  passcode: string,
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const supabase = getSupabaseClient();
  const { error, data } = await supabase.functions.invoke("host-control", {
    body: { eventId: getEventId(), action, passcode, ...payload },
  });
  if (error instanceof FunctionsHttpError) {
    const body: unknown = await error.context.clone().json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      throw new Error(body.error);
    }
  }
  if (error) throw new Error(error.message || "The host action failed.");
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export async function verifyHostPasscode(passcode: string) {
  await ensureAnonymousSession();
  await invokeHostAction<{ ok: true }>(passcode, "verify");
}

export async function getHostRoster(passcode: string): Promise<ParticipantProfile[]> {
  return invokeHostAction<ParticipantProfile[]>(passcode, "roster");
}

export async function updateHostScore(
  passcode: string,
  participantId: string,
  activity: string,
  round: number,
  score: number,
) {
  return invokeHostAction<{ ok: true }>(passcode, "score", {
    participantId,
    activity,
    round,
    score,
  });
}

export async function awardHostSkill(
  passcode: string,
  participantId: string,
  activity: string,
  skillName: string,
) {
  return invokeHostAction<{ ok: true }>(passcode, "award_skill", {
    participantId,
    activity,
    skillName,
  });
}

export async function updateRemoteEvent(passcode: string, patch: HostEventPatch) {
  return invokeHostAction<EventStateRow>(passcode, "update_event", { patch });
}

export async function saveRemoteSettings(passcode: string, settings: EventSettings) {
  return invokeHostAction<{ ok: true }>(passcode, "save_settings", { settings });
}
