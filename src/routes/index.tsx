import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Btn, Kicker, Logo } from "@/app/ui";
import { joinEvent } from "@/app/backend";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useEventSettings } from "@/app/state";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Join Networkathon" },
      {
        name: "description",
        content: "Join the Networkathon live event with your name and student ID.",
      },
    ],
  }),
  component: Join,
});

function Join() {
  const navigate = useNavigate();
  const [settings] = useEventSettings();
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanId = studentId.trim();
    if (!cleanName || !cleanId) {
      setError("Enter your full name and student ID.");
      return;
    }
    setSubmitting(true);
    try {
      await joinEvent(cleanName, cleanId);
      setError(null);
      void navigate({ to: "/live" });
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Could not join the event.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative mx-auto flex min-h-screen max-w-xl flex-col overflow-hidden bg-deck-bg px-6 py-8 text-deck-ink sm:px-8">
      <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-deck-lime/15 blur-3xl" />
      <header className="relative flex items-center justify-between gap-4">
        <Logo className="text-2xl" />
        <span
          className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${isSupabaseConfigured() ? "border-deck-lime/60 text-deck-lime" : "border-deck-coral/60 text-deck-coral"}`}
        >
          {isSupabaseConfigured() ? "Live event" : "Setup required"}
        </span>
      </header>

      <form onSubmit={submit} className="relative flex flex-1 flex-col justify-center gap-5 py-12">
        <Kicker className="text-deck-lime">● Join the event</Kicker>
        {!isSupabaseConfigured() && (
          <p
            role="status"
            className="rounded-xl border border-deck-coral/50 px-4 py-3 text-sm text-deck-coral"
          >
            Event sign-in is unavailable until Supabase is configured.
          </p>
        )}
        <div className="space-y-3">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
            Welcome to {settings.eventTitle}.
          </h1>
          <p className="text-lg leading-relaxed text-deck-dim">
            Enter your name and student ID to open your event view.
          </p>
        </div>
        <label className="grid gap-2">
          <Kicker>Full name</Kicker>
          <input
            required
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            className="min-h-14 w-full rounded-2xl border-2 border-deck-line bg-deck-surface px-4 text-lg outline-none focus:border-deck-lime"
          />
        </label>
        <label className="grid gap-2">
          <Kicker>Student ID</Kicker>
          <input
            required
            autoComplete="off"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            placeholder="Your student ID"
            className="min-h-14 w-full rounded-2xl border-2 border-deck-line bg-deck-surface px-4 font-mono text-lg outline-none focus:border-deck-lime"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-deck-coral">
            {error}
          </p>
        )}
        <Btn
          type="submit"
          disabled={submitting || !isSupabaseConfigured()}
          className="mt-1 min-h-14 text-lg"
        >
          {submitting ? "Joining…" : "Join the event"}
          {!submitting && <span aria-hidden="true"> →</span>}
        </Btn>
        <p className="text-center text-xs leading-relaxed text-deck-dim">
          No password required. Your browser receives a private anonymous session so your event
          details stay associated with you.
        </p>
      </form>

      <nav className="relative flex justify-center gap-6 border-t border-deck-line pt-5 font-mono text-xs text-deck-dim">
        <Link to="/present" className="hover:text-deck-ink">
          Projector preview
        </Link>
        <Link to="/admin" className="hover:text-deck-ink">
          Host setup
        </Link>
      </nav>
    </main>
  );
}
