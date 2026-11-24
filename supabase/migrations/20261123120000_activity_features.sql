-- Migration: 20261123120000_activity_features.sql
-- Adds tables, columns, RLS policies, and functions for Networkathon activity features

-- 1. Alter event_state for new activity runtime tracking
alter table public.event_state
  add column if not exists current_spotlight_team integer not null default 0,
  add column if not exists spotlight_rating_open boolean not null default false,
  add column if not exists silent_order_started boolean not null default false,
  add column if not exists trade_floor_dealt boolean not null default false,
  add column if not exists trade_floor_trading_open boolean not null default false;

-- 2. Flight Path: Team material choices and category measurements
create table if not exists public.flight_path_teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event_config(event_id) on delete cascade,
  team_number integer not null check (team_number > 0),
  material_set_1 text not null default '',
  material_set_2 text not null default '',
  material_set_3 text not null default '',
  created_at timestamptz not null default now(),
  unique (event_id, team_number)
);

create table if not exists public.flight_path_scores (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event_config(event_id) on delete cascade,
  team_number integer not null check (team_number > 0),
  round integer not null check (round > 0),
  category text not null check (category in ('longest_flight', 'fastest', 'most_accurate')),
  measurement numeric not null default 0,
  notes text not null default '',
  entered_by text not null default 'host',
  updated_at timestamptz not null default now(),
  unique (event_id, team_number, round, category)
);

-- 3. 60-Second Spotlight: Team scripts, prompts, backdrops, and ratings
create table if not exists public.spotlight_teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event_config(event_id) on delete cascade,
  team_number integer not null check (team_number > 0),
  script text not null default '',
  prompt_text text not null default '',
  prompt_submitted_by uuid references public.event_participants(id) on delete set null,
  background_image_url text not null default '',
  presentation_order integer not null default 0,
  rating_open boolean not null default false,
  average_rating numeric,
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, team_number)
);

create table if not exists public.spotlight_ratings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event_config(event_id) on delete cascade,
  participant_id uuid not null references public.event_participants(id) on delete cascade,
  team_number integer not null check (team_number > 0),
  rating integer not null check (rating between 0 and 100),
  created_at timestamptz not null default now(),
  unique (event_id, participant_id, team_number)
);

-- 4. Silent Order: 3 physical lines, factor pool assignment, timers, and winner
create table if not exists public.silent_order_lines (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event_config(event_id) on delete cascade,
  line_number integer not null check (line_number between 1 and 3),
  factor text not null,
  started_at timestamptz,
  completed_at timestamptz,
  is_winner boolean not null default false,
  unique (event_id, line_number)
);

-- 5. Trade Floor: 4 decks (208 cards), 3 cards per participant, private hands & scores
create table if not exists public.trade_floor_hands (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event_config(event_id) on delete cascade,
  participant_id uuid not null references public.event_participants(id) on delete cascade,
  dealt_cards jsonb not null default '[]'::jsonb,
  final_cards jsonb not null default '[]'::jsonb,
  hand_finalized boolean not null default false,
  hand_score integer,
  created_at timestamptz not null default now(),
  unique (event_id, participant_id)
);

-- 6. Enable Row-Level Security
alter table public.flight_path_teams enable row level security;
alter table public.flight_path_scores enable row level security;
alter table public.spotlight_teams enable row level security;
alter table public.spotlight_ratings enable row level security;
alter table public.silent_order_lines enable row level security;
alter table public.trade_floor_hands enable row level security;

-- 7. Revoke standard access
revoke all on public.flight_path_teams, public.flight_path_scores,
  public.spotlight_teams, public.spotlight_ratings,
  public.silent_order_lines, public.trade_floor_hands from anon, authenticated;

-- 8. Grants for authenticated (participants and projectors)
grant select on public.flight_path_teams, public.flight_path_scores,
  public.spotlight_teams, public.silent_order_lines to anon, authenticated;

grant select on public.spotlight_ratings to authenticated;
grant insert, update on public.spotlight_ratings to authenticated;

grant select on public.trade_floor_hands to authenticated;
grant update (final_cards, hand_finalized) on public.trade_floor_hands to authenticated;

-- Service role full access
grant all on public.flight_path_teams, public.flight_path_scores,
  public.spotlight_teams, public.spotlight_ratings,
  public.silent_order_lines, public.trade_floor_hands to service_role;

-- 9. Policies for public reading
create policy "Public can read flight path teams"
  on public.flight_path_teams for select to anon, authenticated using (true);

create policy "Public can read flight path scores"
  on public.flight_path_scores for select to anon, authenticated using (true);

create policy "Public can read spotlight teams"
  on public.spotlight_teams for select to anon, authenticated using (true);

create policy "Public can read silent order lines"
  on public.silent_order_lines for select to anon, authenticated using (true);

-- 10. Policies for Spotlight Ratings (participants see and submit their own)
create policy "Participants can read their own spotlight ratings"
  on public.spotlight_ratings for select to authenticated
  using (
    exists (
      select 1 from public.event_participants p
      where p.id = spotlight_ratings.participant_id
        and p.auth_user_id = (select auth.uid())
    )
  );

create policy "Participants can submit their own spotlight ratings"
  on public.spotlight_ratings for insert to authenticated
  with check (
    (select auth.jwt() ->> 'is_anonymous') = 'true'
    and exists (
      select 1 from public.event_participants p
      where p.id = spotlight_ratings.participant_id
        and p.event_id = spotlight_ratings.event_id
        and p.auth_user_id = (select auth.uid())
    )
  );

create policy "Participants can update their own spotlight ratings"
  on public.spotlight_ratings for update to authenticated
  using (
    exists (
      select 1 from public.event_participants p
      where p.id = spotlight_ratings.participant_id
        and p.auth_user_id = (select auth.uid())
    )
  )
  with check (
    (select auth.jwt() ->> 'is_anonymous') = 'true'
    and exists (
      select 1 from public.event_participants p
      where p.id = spotlight_ratings.participant_id
        and p.event_id = spotlight_ratings.event_id
        and p.auth_user_id = (select auth.uid())
    )
  );

-- 11. Policies for Trade Floor Hands (private to participant)
create policy "Participants can read their own hand"
  on public.trade_floor_hands for select to authenticated
  using (
    exists (
      select 1 from public.event_participants p
      where p.id = trade_floor_hands.participant_id
        and p.auth_user_id = (select auth.uid())
    )
  );

create policy "Participants can finalize their own hand"
  on public.trade_floor_hands for update to authenticated
  using (
    exists (
      select 1 from public.event_participants p
      where p.id = trade_floor_hands.participant_id
        and p.auth_user_id = (select auth.uid())
    )
  )
  with check (
    (select auth.jwt() ->> 'is_anonymous') = 'true'
    and exists (
      select 1 from public.event_participants p
      where p.id = trade_floor_hands.participant_id
        and p.event_id = trade_floor_hands.event_id
        and p.auth_user_id = (select auth.uid())
    )
  );

-- 12. Realtime Publications
alter publication supabase_realtime add table public.flight_path_teams;
alter publication supabase_realtime add table public.flight_path_scores;
alter publication supabase_realtime add table public.spotlight_teams;
alter publication supabase_realtime add table public.spotlight_ratings;
alter publication supabase_realtime add table public.silent_order_lines;
alter publication supabase_realtime add table public.trade_floor_hands;
