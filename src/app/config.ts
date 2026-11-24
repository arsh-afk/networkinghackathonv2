export type EventSettings = {
  eventTitle: string;
  tagline: string;
  joinUrl: string;
  tableCount: number;
  planesRounds: number;
  planesMinutes: number;
  spotlightSeconds: number;
  crisisMinutes: number;
  shuffleClockwisePercent: number;
  shuffleAnticlockwisePercent: number;
  spectrumQuestions: string[];
  spectrumOptions: string[];
  planesInstructions: string;
  spotlightScript: string;
  crisisScenario: string;
  crisisInstructions: string;
  silentRankingPrompt: string;
  shuffleMessage: string;
  tradeFloorInstructions: string;
  closingMessage: string;
  skills: string[];
  promoSlideSeconds: number;
  promoOrder: PromoSection[];
  communityLinks: {
    whatsapp: string;
    instagram: string;
    linkedin: string;
    clubWebsite: string;
    opportunities: string;
    threeV: string;
  };
  flightPathCategories: string[];
  flightPathMaterialSets: string[];
  spotlightScripts: Record<number, string>;
  spotlightPresentationOrder: number[];
  silentOrderFactors: string[];
  tradeFloorTradingSeconds: number;
  tradeFloorCardValues: Record<string, number>;
};

export type PromoSection = "brand" | "community" | "opportunities" | "threeV";
export const SPECTRUM_DURATION_SECONDS = 30;

export const DEFAULT_SETTINGS: EventSettings = {
  eventTitle: "Networkathon",
  tagline: "Build connections. Build things.",
  joinUrl: "",
  tableCount: 8,
  planesRounds: 3,
  planesMinutes: 5,
  spotlightSeconds: 60,
  crisisMinutes: 5,
  shuffleClockwisePercent: 33,
  shuffleAnticlockwisePercent: 33,
  spectrumQuestions: [
    "Morning person or night owl?",
    "Plan everything or wing it?",
    "Big group or one-on-one?",
  ],
  spectrumOptions: ["Agree", "Slightly agree", "Neutral", "Slightly disagree", "Disagree"],
  planesInstructions: "Follow the host’s round instructions. The host records team results.",
  spotlightScript: "Present your team's idea in 60 seconds.",
  crisisScenario: "The keynote speaker cancelled ten minutes before the doors open.",
  crisisInstructions: "Work with your team to solve the scenario. The host will guide the room.",
  silentRankingPrompt: "Line up in your assigned line silently according to your line's factor.",
  shuffleMessage: "Move to your assigned table direction.",
  tradeFloorInstructions: "Follow the host’s instructions and make your trades at the tables.",
  closingMessage: "Thank you — see you next time.",
  skills: ["Precision", "Team player", "Fast thinker", "Pitch pro", "Leader"],
  promoSlideSeconds: 10,
  promoOrder: ["brand", "community", "opportunities", "threeV"],
  communityLinks: {
    whatsapp: "",
    instagram: "",
    linkedin: "",
    clubWebsite: "",
    opportunities: "",
    threeV: "",
  },
  flightPathCategories: ["Longest flight time", "Fastest", "Most accurate"],
  flightPathMaterialSets: ["Set A (Cardstock & Paperclips)", "Set B (Foam & Rubber Bands)", "Set C (Lightweight Foil & Straws)"],
  spotlightScripts: {},
  spotlightPresentationOrder: [],
  silentOrderFactors: ["Birthday (Jan-Dec)", "Height (Short to Tall)", "First name alphabetical (A-Z)"],
  tradeFloorTradingSeconds: 300,
  tradeFloorCardValues: {
    A: 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13,
  },
};

export function isEventSettings(value: unknown): value is EventSettings {
  if (typeof value !== "object" || value === null) return false;
  const settings = value as Partial<EventSettings>;
  return (
    typeof settings.eventTitle === "string" &&
    typeof settings.tagline === "string" &&
    typeof settings.joinUrl === "string" &&
    Number.isInteger(settings.tableCount) &&
    typeof settings.planesRounds === "number" &&
    typeof settings.planesMinutes === "number" &&
    typeof settings.spotlightSeconds === "number" &&
    typeof settings.crisisMinutes === "number" &&
    typeof settings.shuffleClockwisePercent === "number" &&
    typeof settings.shuffleAnticlockwisePercent === "number" &&
    Array.isArray(settings.spectrumQuestions) &&
    settings.spectrumQuestions.every((item) => typeof item === "string") &&
    typeof settings.spotlightScript === "string" &&
    typeof settings.crisisScenario === "string" &&
    typeof settings.silentRankingPrompt === "string" &&
    typeof settings.planesInstructions === "string" &&
    typeof settings.shuffleMessage === "string" &&
    typeof settings.tradeFloorInstructions === "string" &&
    typeof settings.closingMessage === "string" &&
    Array.isArray(settings.spectrumOptions) &&
    settings.spectrumOptions.every((item) => typeof item === "string") &&
    typeof settings.promoSlideSeconds === "number" &&
    Array.isArray(settings.promoOrder) &&
    settings.promoOrder.every((item) =>
      ["brand", "community", "opportunities", "threeV"].includes(item),
    ) &&
    Array.isArray(settings.skills) &&
    settings.skills.every((item) => typeof item === "string") &&
    typeof settings.communityLinks === "object" &&
    settings.communityLinks !== null &&
    ["whatsapp", "instagram", "linkedin", "clubWebsite", "opportunities", "threeV"].every(
      (key) =>
        typeof settings.communityLinks?.[key as keyof EventSettings["communityLinks"]] === "string",
    )
  );
}

export function validateEventSettings(settings: EventSettings): string | null {
  if (!settings.eventTitle.trim()) return "Enter an event name.";
  if (
    !Number.isInteger(settings.tableCount) ||
    settings.tableCount < 1 ||
    settings.tableCount > 100
  ) {
    return "Table count must be a whole number between 1 and 100.";
  }
  if (
    !Number.isInteger(settings.planesRounds) ||
    settings.planesRounds < 1 ||
    settings.planesRounds > 10
  ) {
    return "Flight Path must have between 1 and 10 rounds.";
  }
  if (settings.planesMinutes < 1 || settings.planesMinutes > 60)
    return "Flight Path timer must be between 1 and 60 minutes.";
  if (settings.spotlightSeconds < 15 || settings.spotlightSeconds > 600) {
    return "Spotlight timer must be between 15 and 600 seconds.";
  }
  if (settings.crisisMinutes < 1 || settings.crisisMinutes > 60)
    return "Red Alert timer must be between 1 and 60 minutes.";
  if (
    !Number.isInteger(settings.spotlightSeconds) ||
    !Number.isInteger(settings.planesMinutes) ||
    !Number.isInteger(settings.crisisMinutes)
  ) {
    return "Timer values must be whole numbers.";
  }
  if (
    !Number.isInteger(settings.promoSlideSeconds) ||
    settings.promoSlideSeconds < 5 ||
    settings.promoSlideSeconds > 60
  ) {
    return "Promo slide duration must be between 5 and 60 seconds.";
  }
  if (
    settings.promoOrder.length !== 4 ||
    new Set(settings.promoOrder).size !== 4 ||
    !["brand", "community", "opportunities", "threeV"].every((section) =>
      settings.promoOrder.includes(section as PromoSection),
    )
  ) {
    return "Promo order must include each of the four sections once.";
  }
  if (
    !settings.spectrumOptions.length ||
    settings.spectrumOptions.some((option) => !option.trim())
  ) {
    return "Add at least one non-empty Spectrum answer option.";
  }
  if (
    settings.shuffleClockwisePercent < 0 ||
    settings.shuffleAnticlockwisePercent < 0 ||
    settings.shuffleClockwisePercent + settings.shuffleAnticlockwisePercent > 100
  ) {
    return "Shuffle percentages must be non-negative and total no more than 100%. The remaining group stays put.";
  }
  if (
    !settings.spectrumQuestions.length ||
    settings.spectrumQuestions.some((question) => !question.trim())
  ) {
    return "Remove empty Spectrum questions before saving.";
  }
  if (settings.skills.some((skill) => !skill.trim()))
    return "Remove empty skill names before saving.";
  const links = Object.values(settings.communityLinks).filter(Boolean);
  if (settings.joinUrl) links.push(settings.joinUrl);
  if (links.some((link) => !/^https?:\/\//i.test(link))) {
    return "Links must start with https:// or http://.";
  }
  return null;
}

export function readEventSettings(raw: string | null): {
  settings: EventSettings;
  error: string | null;
} {
  if (!raw) return { settings: DEFAULT_SETTINGS, error: null };
  try {
    const value: unknown = JSON.parse(raw);
    if (!isEventSettings(value)) {
      return {
        settings: DEFAULT_SETTINGS,
        error: "Saved event settings are invalid. Defaults are shown.",
      };
    }
    // Merge with defaults to ensure all newer properties exist
    return {
      settings: {
        ...DEFAULT_SETTINGS,
        ...value,
        flightPathCategories: value.flightPathCategories ?? DEFAULT_SETTINGS.flightPathCategories,
        flightPathMaterialSets: value.flightPathMaterialSets ?? DEFAULT_SETTINGS.flightPathMaterialSets,
        spotlightScripts: value.spotlightScripts ?? DEFAULT_SETTINGS.spotlightScripts,
        spotlightPresentationOrder: value.spotlightPresentationOrder ?? DEFAULT_SETTINGS.spotlightPresentationOrder,
        crisisInstructions: value.crisisInstructions ?? DEFAULT_SETTINGS.crisisInstructions,
        silentOrderFactors: value.silentOrderFactors ?? DEFAULT_SETTINGS.silentOrderFactors,
        tradeFloorTradingSeconds: value.tradeFloorTradingSeconds ?? DEFAULT_SETTINGS.tradeFloorTradingSeconds,
        tradeFloorCardValues: value.tradeFloorCardValues ?? DEFAULT_SETTINGS.tradeFloorCardValues,
      },
      error: null,
    };
  } catch {
    return {
      settings: DEFAULT_SETTINGS,
      error: "Saved event settings could not be read. Defaults are shown.",
    };
  }
}
