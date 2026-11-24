# Project instructions

- Keep the app on TanStack Start, React, TypeScript, Vite, and Tailwind CSS.
- Supabase is managed directly in this repository. Track schema changes in `supabase/migrations/`; never put service keys or host secrets in client-exposed `VITE_*` variables.
- Enable row-level security for every exposed table and keep privileged host operations in Supabase Edge Functions.
- Do not manually edit generated `src/routeTree.gen.ts`; let the TanStack Router plugin regenerate it.
- Use the existing design tokens and components. Run focused tests, ESLint, TypeScript, and a production build for code changes.
