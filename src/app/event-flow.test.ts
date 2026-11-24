import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, readEventSettings, validateEventSettings } from "./config";
import {
  advanceEventState,
  assignBalancedShuffle,
  createEventSlideJumpPatch,
  DEFAULT_EVENT_STATE,
} from "./state";

describe("event flow", () => {
  it("runs configured Flight Path rounds and includes both shuffle transitions", () => {
    const roundTwo = advanceEventState(
      { ...DEFAULT_EVENT_STATE, state: "planes", round: 1 },
      DEFAULT_SETTINGS,
    );
    expect(roundTwo).toMatchObject({ state: "planes", round: 2 });

    const afterFlightPath = advanceEventState(
      { ...DEFAULT_EVENT_STATE, state: "planes", round: 3 },
      DEFAULT_SETTINGS,
    );
    expect(afterFlightPath.state).toBe("shuffle_after_flight_path");
    expect(advanceEventState(afterFlightPath, DEFAULT_SETTINGS).state).toBe("infomercial");

    const afterSpotlight = advanceEventState(
      { ...DEFAULT_EVENT_STATE, state: "infomercial" },
      DEFAULT_SETTINGS,
    );
    expect(afterSpotlight.state).toBe("shuffle_after_spotlight");
    expect(advanceEventState(afterSpotlight, DEFAULT_SETTINGS).state).toBe("crisis");
  });

  it("rejects invalid shuffle percentages and malformed saved settings", () => {
    expect(
      validateEventSettings({
        ...DEFAULT_SETTINGS,
        shuffleClockwisePercent: 70,
        shuffleAnticlockwisePercent: 40,
      }),
    ).toMatch(/total no more than 100/);
    expect(readEventSettings("{broken").error).toMatch(/could not be read/i);
  });

  it("fills new activity settings with defaults when loading a legacy config", () => {
    const newSettings = [
      "flightPathCategories",
      "flightPathMaterialSets",
      "spotlightScripts",
      "spotlightPresentationOrder",
      "crisisInstructions",
      "silentOrderFactors",
      "tradeFloorTradingSeconds",
      "tradeFloorCardValues",
    ];
    const legacySettings = Object.fromEntries(
      Object.entries(DEFAULT_SETTINGS).filter(([key]) => !newSettings.includes(key)),
    );

    const result = readEventSettings(JSON.stringify(legacySettings));

    expect(result.error).toBeNull();
    expect(result.settings.flightPathCategories).toEqual(DEFAULT_SETTINGS.flightPathCategories);
    expect(result.settings.spotlightScripts).toEqual(DEFAULT_SETTINGS.spotlightScripts);
    expect(result.settings.crisisInstructions).toBe(DEFAULT_SETTINGS.crisisInstructions);
  });

  it("resets transient state when jumping to an event slide", () => {
    const patch = createEventSlideJumpPatch(
      {
        ...DEFAULT_EVENT_STATE,
        state: "infomercial",
        round: 3,
        timerEnd: Date.now() + 10_000,
        spectrumQuestion: 2,
        promoActive: true,
        currentSpotlightTeam: 4,
        spotlightRatingOpen: true,
        silentOrderStarted: true,
        tradeFloorTradingOpen: true,
      },
      "opening_spectrum",
    );

    expect(patch).toMatchObject({
      state: "opening_spectrum",
      round: 1,
      timerEnd: null,
      spectrumQuestion: 0,
      promoActive: false,
      currentSpotlightTeam: 0,
      spotlightRatingOpen: false,
      silentOrderStarted: false,
      tradeFloorTradingOpen: false,
    });
  });

  it("balances 60 participants into three stable shuffle groups", () => {
    const ids = Array.from({ length: 60 }, (_, index) => `student-${index}`);
    const first = assignBalancedShuffle(ids, DEFAULT_SETTINGS, "after-spotlight");
    const second = assignBalancedShuffle([...ids].reverse(), DEFAULT_SETTINGS, "after-spotlight");

    expect(first).toEqual(second);
    expect(Object.values(first).filter((direction) => direction === "clockwise")).toHaveLength(20);
    expect(Object.values(first).filter((direction) => direction === "anti-clockwise")).toHaveLength(
      20,
    );
    expect(Object.values(first).filter((direction) => direction === "stay")).toHaveLength(20);
  });
});
