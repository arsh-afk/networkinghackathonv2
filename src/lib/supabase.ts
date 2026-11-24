import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export const DEFAULT_EVENT_ID = "00000000-0000-4000-8000-000000000001";

export function isSupabaseConfigured() {
  return Boolean(import.meta.env["VITE_SUPABASE_URL"] && import.meta.env["VITE_SUPABASE_ANON_KEY"]);
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.",
    );
  }
  if (!client) {
    client = createClient(
      import.meta.env["VITE_SUPABASE_URL"],
      import.meta.env["VITE_SUPABASE_ANON_KEY"],
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        realtime: {
          params: { eventsPerSecond: 5 },
        },
      },
    );
  }
  return client;
}

export function getEventId() {
  return import.meta.env["VITE_NETWORKATHON_EVENT_ID"] || DEFAULT_EVENT_ID;
}
