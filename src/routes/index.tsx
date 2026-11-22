import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Btn, Logo, Kicker } from "@/app/ui";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Join Networkathon" },
    { name: "description", content: "Join the Networkathon live event with your name and student ID." },
    { property: "og:title", content: "Join Networkathon" },
    { property: "og:description", content: "Join the live event on your phone in seconds." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Join,
});

function Join() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [sid, setSid] = useState("");
  const [dup, setDup] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sid.trim() === "22-4817") return setDup(true);
    localStorage.setItem("nk-me", JSON.stringify({ name: name || "Guest", id: sid }));
    nav({ to: "/live" });
  };
  return (
    <main className="relative mx-auto flex min-h-screen max-w-md flex-col overflow-hidden bg-deck-bg px-6 py-10 text-deck-ink">
      <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-deck-lime opacity-20 blur-3xl" />
      <Logo className="text-2xl" />
      {dup ? (
        <div className="flex flex-1 flex-col justify-center gap-4 text-center">
          <div className="text-6xl">👋</div>
          <h1 className="font-display text-3xl font-bold">Welcome back</h1>
          <p className="text-deck-dim">Student ID <b className="text-deck-ink">22-4817</b> already joined as <b className="text-deck-ink">Aisha Rahman</b>.</p>
          <Btn onClick={() => { localStorage.setItem("nk-me", JSON.stringify({ name: "Aisha Rahman", id: "22-4817" })); nav({ to: "/live" }); }}>That's me — continue</Btn>
          <Btn tone="ghost" onClick={() => setDup(false)}>Not me</Btn>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-1 flex-col justify-center gap-5">
          <Kicker className="text-deck-lime">● Live now</Kicker>
          <h1 className="font-display text-5xl font-bold leading-[1.02]">Join the room.</h1>
          <p className="text-lg text-deck-dim">No passwords. Just your name and student ID.</p>
          <label className="space-y-2"><Kicker>Full name</Kicker>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Aisha Rahman" className="w-full rounded-2xl border-2 border-deck-line bg-deck-surface px-4 py-4 text-lg outline-none focus:border-deck-lime" /></label>
          <label className="space-y-2"><Kicker>Student ID</Kicker>
            <input required value={sid} onChange={(e) => setSid(e.target.value)} placeholder="22-0000" className="w-full rounded-2xl border-2 border-deck-line bg-deck-surface px-4 py-4 font-mono text-lg outline-none focus:border-deck-lime" /></label>
          <Btn type="submit" className="mt-2 py-4 text-lg">Join the event →</Btn>
          <p className="text-center text-xs text-deck-dim">Tip: try ID 22-4817 to see the "already joined" screen.</p>
        </form>
      )}
      <nav className="flex justify-center gap-4 font-mono text-xs text-deck-dim">
        <Link to="/present" className="hover:text-deck-ink">Projector</Link><Link to="/admin" className="hover:text-deck-ink">Host panel</Link>
      </nav>
    </main>
  );
}
