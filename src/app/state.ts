import { useEffect, useState } from "react";

export const STATES = [
  "waiting_room", "opening_spectrum", "planes", "shuffle", "infomercial",
  "crisis", "silent_ranking", "item_trade", "final_summary", "closing",
] as const;
export type EventStateKey = (typeof STATES)[number];

export const LABELS: Record<EventStateKey, string> = {
  waiting_room: "Waiting room", opening_spectrum: "Opening spectrum", planes: "Flight path",
  shuffle: "Shuffle", infomercial: "60-sec spotlight", crisis: "Red alert", silent_ranking: "Silent ranking",
  item_trade: "Trade floor", final_summary: "Final summary", closing: "Closing",
};

export type EventState = { state: EventStateKey; round: number; paused: boolean; timerEnd: number | null };
const KEY = "nk-event-state";
const DEFAULT: EventState = { state: "waiting_room", round: 1, paused: false, timerEnd: null };

// Design-only stand-in for the realtime event_state row: syncs across tabs via localStorage.
export function useEventState() {
  const [s, setS] = useState<EventState>(DEFAULT);
  useEffect(() => {
    const read = () => { try { const v = localStorage.getItem(KEY); if (v) setS(JSON.parse(v)); } catch { /* ignore */ } };
    read();
    const on = (e: StorageEvent) => e.key === KEY && read();
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);
  const update = (patch: Partial<EventState>) => setS((prev) => {
    const next = { ...prev, ...patch };
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  });
  return [s, update] as const;
}

export function useCountdown(end: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);
  const left = end ? Math.max(0, Math.round((end - now) / 1000)) : 0;
  return `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
}

export const PEOPLE = [
  { name: "Omar Khalid", id: "22-1093", score: 34, skills: 5 },
  { name: "Aisha Rahman", id: "22-4817", score: 31, skills: 3 },
  { name: "Lin Wei", id: "23-0021", score: 29, skills: 4 },
  { name: "Sam Taylor", id: "21-7730", score: 27, skills: 2 },
  { name: "Priya Desai", id: "22-5512", score: 25, skills: 3 },
  { name: "Jonas Berg", id: "23-3308", score: 22, skills: 1 },
  { name: "Maya Okafor", id: "21-9045", score: 19, skills: 2 },
];
export const SPECTRUM = [{ l: "🌅 Morning person", p: 34 }, { l: "⚖️ Somewhere between", p: 21 }, { l: "🌙 Night owl", p: 45 }];
