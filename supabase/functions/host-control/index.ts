import { createClient } from "npm:@supabase/supabase-js@2";

const states = [
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
];
const encoder = new TextEncoder();

function jsonResponse(body: unknown, status: number, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return "";
  const configured =
    Deno.env
      .get("CORS_ALLOWED_ORIGINS")
      ?.split(",")
      .map((item) => item.trim()) ?? [];
  const localDevelopment = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
  ];
  return [...configured, ...localDevelopment].includes(origin) ? origin : null;
}

function equalSecret(actual: string, expected: string) {
  const actualBytes = encoder.encode(actual);
  const expectedBytes = encoder.encode(expected);
  let mismatch = actualBytes.length ^ expectedBytes.length;
  const length = Math.max(actualBytes.length, expectedBytes.length);
  for (let index = 0; index < length; index++) {
    mismatch |= (actualBytes[index] ?? 0) ^ (expectedBytes[index] ?? 0);
  }
  return mismatch === 0;
}

function readServiceKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!keys) throw new Error("Supabase secret key is missing from the Edge Function environment.");
  const parsed: unknown = JSON.parse(keys);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Supabase secret key configuration is invalid.");
  }
  const values = Object.values(parsed);
  const key = (parsed as Record<string, unknown>).default ?? values[0];
  if (typeof key !== "string") throw new Error("Supabase secret key configuration is invalid.");
  return key;
}

function summarizeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  if (typeof error === "object" && error !== null) {
    const fields = error as Record<string, unknown>;
    return {
      code: typeof fields.code === "string" ? fields.code : undefined,
      message: typeof fields.message === "string" ? fields.message : "Unknown error",
    };
  }
  return { message: typeof error === "string" ? error : "Unknown error" };
}

function isStringArray(value: unknown, minLength: number, maxLength: number) {
  return (
    Array.isArray(value) &&
    value.length >= minLength &&
    value.length <= maxLength &&
    value.every((item) => typeof item === "string" && item.trim().length > 0 && item.length <= 500)
  );
}

function isAllowedUrl(value: unknown) {
  if (typeof value !== "string") return false;
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidSettings(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const settings = value as Record<string, unknown>;
  const links = settings.communityLinks;
  return (
    typeof settings.eventTitle === "string" &&
    settings.eventTitle.trim().length > 0 &&
    settings.eventTitle.length <= 200 &&
    typeof settings.tagline === "string" &&
    settings.tagline.length <= 500 &&
    isAllowedUrl(settings.joinUrl) &&
    Number.isInteger(settings.tableCount) &&
    Number(settings.tableCount) >= 1 &&
    Number(settings.tableCount) <= 100 &&
    Number.isInteger(settings.planesRounds) &&
    Number(settings.planesRounds) >= 1 &&
    Number(settings.planesRounds) <= 10 &&
    Number.isInteger(settings.planesMinutes) &&
    Number(settings.planesMinutes) >= 1 &&
    Number(settings.planesMinutes) <= 60 &&
    Number.isInteger(settings.spotlightSeconds) &&
    Number(settings.spotlightSeconds) >= 15 &&
    Number(settings.spotlightSeconds) <= 600 &&
    Number.isInteger(settings.crisisMinutes) &&
    Number(settings.crisisMinutes) >= 1 &&
    Number(settings.crisisMinutes) <= 60 &&
    typeof settings.shuffleClockwisePercent === "number" &&
    Number.isFinite(settings.shuffleClockwisePercent) &&
    settings.shuffleClockwisePercent >= 0 &&
    typeof settings.shuffleAnticlockwisePercent === "number" &&
    Number.isFinite(settings.shuffleAnticlockwisePercent) &&
    settings.shuffleAnticlockwisePercent >= 0 &&
    settings.shuffleClockwisePercent + settings.shuffleAnticlockwisePercent <= 100 &&
    isStringArray(settings.spectrumQuestions, 1, 30) &&
    isStringArray(settings.spectrumOptions, 1, 10) &&
    typeof settings.planesInstructions === "string" &&
    settings.planesInstructions.length <= 2_000 &&
    typeof settings.spotlightScript === "string" &&
    settings.spotlightScript.length <= 2_000 &&
    typeof settings.crisisScenario === "string" &&
    settings.crisisScenario.length <= 2_000 &&
    typeof settings.silentRankingPrompt === "string" &&
    settings.silentRankingPrompt.length <= 2_000 &&
    typeof settings.shuffleMessage === "string" &&
    settings.shuffleMessage.length <= 2_000 &&
    typeof settings.tradeFloorInstructions === "string" &&
    settings.tradeFloorInstructions.length <= 2_000 &&
    typeof settings.closingMessage === "string" &&
    settings.closingMessage.length <= 2_000 &&
    isStringArray(settings.skills, 0, 50) &&
    Array.isArray(settings.promoOrder) &&
    settings.promoOrder.length === 4 &&
    new Set(settings.promoOrder).size === 4 &&
    settings.promoOrder.every((section) =>
      ["brand", "community", "opportunities", "threeV"].includes(String(section)),
    ) &&
    typeof settings.promoSlideSeconds === "number" &&
    Number.isInteger(settings.promoSlideSeconds) &&
    settings.promoSlideSeconds >= 5 &&
    settings.promoSlideSeconds <= 60 &&
    typeof links === "object" &&
    links !== null &&
    ["whatsapp", "instagram", "linkedin", "clubWebsite", "opportunities", "threeV"].every((key) =>
      isAllowedUrl((links as Record<string, unknown>)[key]),
    )
  );
}

Deno.serve(async (request) => {
  const origin = allowedOrigin(request);
  if (origin === null) return jsonResponse({ error: "Origin is not allowed." }, 403);
  const corsHeaders = {
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "POST, OPTIONS",
    vary: "origin",
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "POST")
    return jsonResponse({ error: "Method not allowed." }, 405, corsHeaders);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const expectedPasscode = Deno.env.get("HOST_PASSCODE");
    if (!url || !expectedPasscode) {
      return jsonResponse(
        { error: "Host control is not configured on the server." },
        503,
        corsHeaders,
      );
    }

    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null) {
      return jsonResponse({ error: "Request body must be an object." }, 400, corsHeaders);
    }
    const input = body as Record<string, unknown>;
    if (typeof input.passcode !== "string" || !equalSecret(input.passcode, expectedPasscode)) {
      return jsonResponse({ error: "Incorrect host passcode." }, 401, corsHeaders);
    }

    const eventId = input.eventId;
    if (
      typeof eventId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId)
    ) {
      return jsonResponse({ error: "Event ID is invalid." }, 400, corsHeaders);
    }

    const supabase = createClient(url, readServiceKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: config, error: configError } = await supabase
      .from("event_config")
      .select("settings")
      .eq("event_id", eventId)
      .single();
    if (configError) throw configError;

    switch (input.action) {
      case "verify":
        return jsonResponse({ ok: true }, 200, corsHeaders);

      case "save_settings": {
        if (!isValidSettings(input.settings)) {
          return jsonResponse({ error: "Event settings are invalid." }, 400, corsHeaders);
        }
        const settings = input.settings;
        const { error } = await supabase
          .from("event_config")
          .update({ settings, updated_at: new Date().toISOString() })
          .eq("event_id", eventId);
        if (error) throw error;
        return jsonResponse({ ok: true }, 200, corsHeaders);
      }

      case "update_event": {
        if (typeof input.patch !== "object" || input.patch === null || Array.isArray(input.patch)) {
          return jsonResponse({ error: "Event patch must be an object." }, 400, corsHeaders);
        }
        const patch = input.patch as Record<string, unknown>;
        const allowedPatchFields = new Set([
          "state",
          "round",
          "paused",
          "timerEnd",
          "spectrumQuestion",
          "promoActive",
          "promoIndex",
          "currentSpotlightTeam",
          "spotlightRatingOpen",
          "silentOrderStarted",
          "tradeFloorDealt",
          "tradeFloorTradingOpen",
        ]);
        if (Object.keys(patch).some((key) => !allowedPatchFields.has(key))) {
          return jsonResponse(
            { error: "Event patch contains an unsupported field." },
            400,
            corsHeaders,
          );
        }
        if (patch.state !== undefined && !states.includes(String(patch.state))) {
          return jsonResponse({ error: "Event state is invalid." }, 400, corsHeaders);
        }

        const { data: updatedState, error: stateUpdateError } = await supabase.rpc(
          "host_update_event_runtime",
          { p_event_id: eventId, p_patch: patch },
        );
        if (stateUpdateError) throw stateUpdateError;

        return jsonResponse(updatedState, 200, corsHeaders);
      }

      case "roster": {
        const { data: participants, error: participantsError } = await supabase
          .from("event_participants")
          .select("id,full_name,student_id,table_number")
          .eq("event_id", eventId)
          .order("created_at");
        if (participantsError) throw participantsError;
        if (!participants.length) return jsonResponse([], 200, corsHeaders);

        const participantIds = participants.map((participant) => participant.id);
        const [scores, awards] = await Promise.all([
          supabase
            .from("round_scores")
            .select("participant_id,score")
            .in("participant_id", participantIds),
          supabase
            .from("skill_awards")
            .select("participant_id,skill_name")
            .in("participant_id", participantIds),
        ]);
        if (scores.error) throw scores.error;
        if (awards.error) throw awards.error;
        const totalScores = new Map<string, number>();
        const skillNames = new Map<string, string[]>();
        for (const row of scores.data) {
          totalScores.set(
            row.participant_id,
            (totalScores.get(row.participant_id) ?? 0) + row.score,
          );
        }
        for (const row of awards.data) {
          const names = skillNames.get(row.participant_id) ?? [];
          names.push(row.skill_name);
          skillNames.set(row.participant_id, names);
        }
        return jsonResponse(
          participants.map((participant) => ({
            id: participant.id,
            name: participant.full_name,
            studentId: participant.student_id,
            tableNumber: participant.table_number,
            score: totalScores.get(participant.id) ?? 0,
            skills: skillNames.get(participant.id) ?? [],
          })),
          200,
          corsHeaders,
        );
      }

      case "score": {
        const participantId = input.participantId;
        const score = input.score;
        const round = input.round;
        const activity = input.activity;
        if (
          typeof participantId !== "string" ||
          typeof activity !== "string" ||
          !activity.trim() ||
          !Number.isInteger(round) ||
          !Number.isInteger(score)
        ) {
          return jsonResponse({ error: "Score entry is invalid." }, 400, corsHeaders);
        }
        const { error } = await supabase.from("round_scores").upsert(
          {
            event_id: eventId,
            participant_id: participantId,
            activity,
            round,
            score,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "participant_id,activity,round" },
        );
        if (error) throw error;
        return jsonResponse({ ok: true }, 200, corsHeaders);
      }

      case "award_skill": {
        const participantId = input.participantId;
        const skillName = input.skillName;
        const activity = input.activity;
        if (
          typeof participantId !== "string" ||
          typeof skillName !== "string" ||
          typeof activity !== "string"
        ) {
          return jsonResponse({ error: "Skill award is invalid." }, 400, corsHeaders);
        }
        const { error } = await supabase.from("skill_awards").upsert(
          { event_id: eventId, participant_id: participantId, skill_name: skillName, activity },
          { onConflict: "participant_id,skill_name,activity" },
        );
        if (error) throw error;
        return jsonResponse({ ok: true }, 200, corsHeaders);
      }

      // === Flight Path ===
      case "save_flight_path_score": {
        const { teamNumber, round, category, measurement, notes } = input;
        if (!teamNumber || !round || !category || typeof measurement !== "number") {
          return jsonResponse({ error: "Invalid flight path score data." }, 400, corsHeaders);
        }
        const { error } = await supabase.from("flight_path_scores").upsert(
          {
            event_id: eventId,
            team_number: teamNumber,
            round: round,
            category: category,
            measurement: measurement,
            notes: notes ?? "",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "event_id,team_number,round,category" },
        );
        if (error) throw error;
        return jsonResponse({ ok: true }, 200, corsHeaders);
      }

      // === Spotlight ===
      case "set_spotlight_background": {
        const { teamNumber, backgroundImageUrl } = input;
        if (!teamNumber || typeof backgroundImageUrl !== "string") {
          return jsonResponse({ error: "Invalid spotlight background data." }, 400, corsHeaders);
        }
        const { error } = await supabase.from("spotlight_teams").upsert(
          {
            event_id: eventId,
            team_number: teamNumber,
            background_image_url: backgroundImageUrl,
          },
          { onConflict: "event_id,team_number" },
        );
        if (error) throw error;
        return jsonResponse({ ok: true }, 200, corsHeaders);
      }

      case "set_spotlight_rating_state": {
        const { teamNumber, ratingOpen } = input;
        if (!teamNumber || typeof ratingOpen !== "boolean") {
          return jsonResponse({ error: "Invalid rating state." }, 400, corsHeaders);
        }
        await supabase
          .from("spotlight_teams")
          .upsert({ event_id: eventId, team_number: teamNumber, rating_open: ratingOpen }, { onConflict: "event_id,team_number" });

        // If closing ratings, compute aggregate
        if (!ratingOpen) {
          const { data: ratings } = await supabase
            .from("spotlight_ratings")
            .select("rating")
            .eq("event_id", eventId)
            .eq("team_number", teamNumber);

          const count = ratings?.length ?? 0;
          const avg = count > 0 ? (ratings!.reduce((sum, r) => sum + r.rating, 0) / count) : 0;

          await supabase
            .from("spotlight_teams")
            .update({ average_rating: Math.round(avg * 10) / 10, rating_count: count })
            .eq("event_id", eventId)
            .eq("team_number", teamNumber);
        }

        await supabase
          .from("event_state")
          .update({ spotlight_rating_open: ratingOpen, current_spotlight_team: teamNumber, updated_at: new Date().toISOString() })
          .eq("event_id", eventId);

        return jsonResponse({ ok: true }, 200, corsHeaders);
      }

      // === Silent Order ===
      case "start_silent_order": {
        const rawFactors = (config.settings as Record<string, unknown>).silentOrderFactors;
        const factorPool = Array.isArray(rawFactors) && rawFactors.length >= 3
          ? [...rawFactors].sort(() => Math.random() - 0.5).slice(0, 3)
          : ["Birthday (Jan-Dec)", "Height (Short to Tall)", "Alphabetical (A-Z)"];

        for (let i = 1; i <= 3; i++) {
          await supabase.from("silent_order_lines").upsert(
            {
              event_id: eventId,
              line_number: i,
              factor: factorPool[i - 1],
              started_at: new Date().toISOString(),
              completed_at: null,
              is_winner: false,
            },
            { onConflict: "event_id,line_number" },
          );
        }

        await supabase
          .from("event_state")
          .update({ silent_order_started: true, updated_at: new Date().toISOString() })
          .eq("event_id", eventId);

        return jsonResponse({ ok: true }, 200, corsHeaders);
      }

      case "complete_silent_order_line": {
        const { lineNumber } = input;
        if (!lineNumber || typeof lineNumber !== "number") {
          return jsonResponse({ error: "Invalid line number." }, 400, corsHeaders);
        }

        // Check if any other line has completed yet (first one to complete is winner)
        const { data: completedLines } = await supabase
          .from("silent_order_lines")
          .select("id")
          .eq("event_id", eventId)
          .not("completed_at", "is", null);

        const isWinner = (completedLines?.length ?? 0) === 0;

        const { error } = await supabase
          .from("silent_order_lines")
          .update({
            completed_at: new Date().toISOString(),
            is_winner: isWinner,
          })
          .eq("event_id", eventId)
          .eq("line_number", lineNumber);
        if (error) throw error;

        return jsonResponse({ ok: true }, 200, corsHeaders);
      }

      // === Trade Floor ===
      case "deal_trade_floor_cards": {
        const { data: participants } = await supabase
          .from("event_participants")
          .select("id")
          .eq("event_id", eventId);

        if (!participants?.length) {
          return jsonResponse({ error: "No participants to deal to." }, 400, corsHeaders);
        }

        // Build 4 standard decks (208 cards)
        const suits = ["hearts", "diamonds", "clubs", "spades"] as const;
        const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
        const deck: { suit: string; rank: string; deck: number }[] = [];
        for (let d = 1; d <= 4; d++) {
          for (const s of suits) {
            for (const r of ranks) {
              deck.push({ suit: s, rank: r, deck: d });
            }
          }
        }

        // Fisher-Yates Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        // Deal 3 cards to each participant
        let cardIdx = 0;
        for (const p of participants) {
          const dealt = [deck[cardIdx++], deck[cardIdx++], deck[cardIdx++]];
          await supabase.from("trade_floor_hands").upsert(
            {
              event_id: eventId,
              participant_id: p.id,
              dealt_cards: dealt,
              final_cards: dealt,
              hand_finalized: false,
              hand_score: null,
            },
            { onConflict: "event_id,participant_id" },
          );
        }

        await supabase
          .from("event_state")
          .update({ trade_floor_dealt: true, trade_floor_trading_open: true, updated_at: new Date().toISOString() })
          .eq("event_id", eventId);

        return jsonResponse({ ok: true }, 200, corsHeaders);
      }

      case "get_trade_floor_leaderboard": {
        const cardValues: Record<string, number> = {
          A: 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, J: 11, Q: 12, K: 13,
        };

        const { data: hands } = await supabase
          .from("trade_floor_hands")
          .select("participant_id,final_cards,hand_finalized")
          .eq("event_id", eventId);

        const { data: participants } = await supabase
          .from("event_participants")
          .select("id,full_name")
          .eq("event_id", eventId);

        const nameMap = new Map((participants ?? []).map((p) => [p.id, p.full_name]));
        const leaderboard: { participantName: string; finalCards: any[]; handScore: number }[] = [];

        for (const h of hands ?? []) {
          const cards = (h.final_cards as any[]) ?? [];
          // Calculate score based on unique ranks
          const rankCounts: Record<string, number> = {};
          for (const c of cards) {
            rankCounts[c.rank] = (rankCounts[c.rank] ?? 0) + 1;
          }
          let score = 0;
          for (const c of cards) {
            if (rankCounts[c.rank] === 1) {
              score += cardValues[c.rank] ?? 0;
            }
          }

          // Update hand score in DB
          await supabase
            .from("trade_floor_hands")
            .update({ hand_score: score })
            .eq("event_id", eventId)
            .eq("participant_id", h.participant_id);

          leaderboard.push({
            participantName: nameMap.get(h.participant_id) ?? "Unknown",
            finalCards: cards,
            handScore: score,
          });
        }

        leaderboard.sort((a, b) => b.handScore - a.handScore);
        return jsonResponse(leaderboard, 200, corsHeaders);
      }

      default:
        return jsonResponse({ error: "Host action is not supported." }, 400, corsHeaders);
    }
  } catch (error) {
    console.error("host-control request failed", summarizeError(error));
    return jsonResponse(
      { error: "Host action failed. Check the Supabase function logs." },
      500,
      corsHeaders,
    );
  }
});
