# Networkathon Event App

Mobile-first participant experience, organizer console, and projector view for the Networkathon event.

## What is implemented

- Shared event state, editable event settings, participant sign-in, and live updates through Supabase.
- Participant Spectrum responses, readiness, Spotlight table voting, shuffle directions, scores, and skill awards.
- Host passcode checked on every privileged operation by the `host-control` Supabase Edge Function.
- Host-controlled timers, two shuffle transitions (after Flight Path and after Spotlight), roster, scoring, skills, CSV export, and promo loop.
- Host can jump to any event slide or promo slide and return to the live event; entering Flight Path or a shuffle slide runs its normal assignment action.
- Spectrum uses a 30-second host-started countdown with a visual progress ring and aggregate-only projector results.
- Projector route that reads shared state and does not perform privileged writes.
- Static promo assets in `public/assets/event/`; filenames and upload locations are listed in [`public/assets/event/README.md`](./public/assets/event/README.md).

The app is not ready for a real event until a Supabase project has been configured, migrations and the Edge Function deployed, and a multi-device rehearsal completed. The repository does not include credentials or a configured production project. Do not claim 60-user readiness without the rehearsal.

## Requirements and local start

Use Node.js and npm, or Bun. From this directory:

```powershell
npm.cmd install
npm.cmd run dev
```

In PowerShell without Bun on `PATH`, you can use `npx.cmd --yes bun install` and `npx.cmd --yes bun run dev`. Open the URL printed by Vite.

| Route      | Purpose                                         |
| ---------- | ----------------------------------------------- |
| `/`        | Join with name and student ID                   |
| `/live`    | Participant view                                |
| `/admin`   | Passcode-protected organizer controls and setup |
| `/present` | Read-only projector view                        |

## Connect Supabase

1. Create a Supabase project. In **Authentication → Sign In / Providers**, enable **Anonymous Sign-Ins**.
2. Copy the project URL and publishable/anon key from **Project Settings → API**.
3. Create `beautiful-slide-studio/.env.local`:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
   VITE_NETWORKATHON_EVENT_ID=00000000-0000-4000-8000-000000000001
   ```

   The event ID shown is the default seeded by the migration. Keep the Supabase service-role/secret key and host passcode out of `.env.local` and all `VITE_*` variables.

4. Install the Supabase CLI, authenticate, link the project, and check migration status:

   ```powershell
   npx.cmd supabase login
   npx.cmd supabase link --project-ref YOUR_PROJECT_REF
   npx.cmd supabase migration list --remote
   ```

   This app now includes `supabase/config.toml`; anonymous sign-ins are enabled for local Supabase development. The hosted project must also have anonymous sign-ins enabled in its Authentication settings.

5. Preview the pending production migration before applying it:

   ```powershell
   npx.cmd supabase db push --remote --dry-run
   ```

   If your terminal cannot prompt for the database password, set it for the command process using a secure prompt:

   ```powershell
   $secure = Read-Host "Supabase database password" -AsSecureString
   $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
   try {
     $env:SUPABASE_DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
     npx.cmd supabase db push --remote --dry-run
   } finally {
     Remove-Item Env:SUPABASE_DB_PASSWORD -ErrorAction SilentlyContinue
     [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
     $secure.Dispose()
   }
   ```

   Review that output, then run `npx.cmd supabase db push --remote` (repeat the secure prompt setup if needed) to apply the migration.

6. Set the host passcode and allowed production origin as Edge Function secrets. Include the local Vite origin for local development if needed:

   ```powershell
   npx.cmd supabase secrets set HOST_PASSCODE="choose-a-long-random-passcode" CORS_ALLOWED_ORIGINS="https://YOUR_WORKER.workers.dev,http://localhost:5173"
   ```

   Supabase provides the function’s `SUPABASE_URL` and secret key in its environment. Do not set these as frontend variables.

7. Deploy the privileged function:

   ```powershell
   npx.cmd supabase functions deploy host-control --project-ref YOUR_PROJECT_REF
   ```

8. Start the app, open `/admin`, and unlock it with the configured host passcode. It is kept only in the page’s memory and sent over HTTPS for each host action.

Migrations create the event config/state, participant records, response, score, award, and shuffle tables; row-level policies; the participant join RPC; the privileged event-update RPC; and Realtime publication entries. Review migration output and function logs before using the app.

## Configure and run the event

1. Unlock `/admin` and use **Event setup** to set event details, tables, activity text, prompts, timers, shuffle percentages, skills, QR destinations, promo slide order, and duration.
2. Upload/replace image files under `public/assets/event/` using the exact preset names in its README, then redeploy.
3. Set the public join URL to the deployed app URL. Open `/present` on the projector and test scanning its join QR.
4. Use **Live controls** to advance or pause the event, jump to an event or promo slide, return from promos, start timers, enter round points, award skills, refresh the roster, and export results. Spectrum's timer starts at 30 seconds.

Event flow:

1. Waiting Room
2. Spectrum
3. Flight Path (three rounds by default)
4. Shuffle after Flight Path
5. 60-Second Spotlight
6. Shuffle after Spotlight
7. Red Alert
8. Silent Order
9. Trade Floor
10. Final Summit
11. Closing

## Free hosting and load rehearsal

The intended low-cost setup is Supabase Free for database/auth/Realtime and Cloudflare Workers Free for the web app. Configure production `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_NETWORKATHON_EVENT_ID` in the Cloudflare build environment. Deploy the app using the repository’s Cloudflare-compatible Nitro/Vite build.

For a CLI deployment, authenticate Wrangler, ensure the three `VITE_*` values are available to the build, then run:

```powershell
npx.cmd wrangler login
npm.cmd run build
npx.cmd nitro deploy --prebuilt
```

The generated Worker URL can be used as `joinUrl` in Host Setup and as an allowed origin in the Supabase `CORS_ALLOWED_ORIGINS` secret.

Provider quotas, free-tier limits, CPU budgets, and inactivity behavior can change. Verify current Supabase and Cloudflare limits before the event. Before public use, rehearse with 60 concurrent clients: join, keep the Realtime connection open, advance state, exercise both shuffles and timers, submit responses, score, export, and confirm updates arrive correctly on each device. Prepare a manual roster/score backup; free services do not provide an uptime guarantee.

## Development checks

```powershell
npm.cmd test
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd run build
```

Do not edit generated `src/routeTree.gen.ts` by hand. Project conventions are in [`AGENTS.md`](./AGENTS.md); the implementation handoff is in the workspace-level [`context3.md`](../context3.md).
