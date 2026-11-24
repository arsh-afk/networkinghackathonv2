create table public.event_config (
  event_id uuid primary key,
  settings jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.event_state (
  event_id uuid primary key references public.event_config(event_id) on delete cascade,
  state text not null default 'waiting_room' check (
    state in (
      'waiting_room',
      'opening_spectrum',
      'planes',
      'shuffle_after_flight_path',
      'infomercial',
      'shuffle_after_spotlight',
      'crisis',
      'silent_ranking',
      'item_trade',
      'final_summary',
      'closing'
    )
  ),
  round integer not null default 1 check (round > 0),
  paused boolean not null default false,
  timer_end timestamptz,
  spectrum_question integer not null default 0 check (spectrum_question >= 0),
  promo_active boolean not null default false,
  promo_index integer not null default 0 check (promo_index >= 0),
  participant_count integer not null default 0 check (participant_count >= 0),
  shuffle_count integer not null default 0 check (shuffle_count >= 0),
  updated_at timestamptz not null default now()
);

create table public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event_config(event_id) on delete cascade,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 100),
  student_id text not null check (char_length(student_id) between 2 and 32),
  normalized_student_id text not null,
  table_number integer check (table_number > 0),
  created_at timestamptz not null default now(),
  unique (event_id, normalized_student_id)
);

create index event_participants_event_created_idx
  on public.event_participants(event_id, created_at);

create table public.participant_responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event_config(event_id) on delete cascade,
  participant_id uuid not null references public.event_participants(id) on delete cascade,
  response_type text not null check (
    response_type in ('spectrum', 'spotlight_vote', 'ready', 'trade_broadcast')
  ),
  prompt_index integer not null default 0 check (prompt_index >= 0),
  value text not null check (char_length(value) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (participant_id, response_type, prompt_index)
);

create index participant_responses_event_type_idx
  on public.participant_responses(event_id, response_type, prompt_index);

create table public.round_scores (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event_config(event_id) on delete cascade,
  participant_id uuid not null references public.event_participants(id) on delete cascade,
  activity text not null,
  round integer not null check (round > 0),
  score integer not null check (score >= 0),
  updated_at timestamptz not null default now(),
  unique (participant_id, activity, round)
);

create table public.skill_awards (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event_config(event_id) on delete cascade,
  participant_id uuid not null references public.event_participants(id) on delete cascade,
  skill_name text not null,
  activity text not null,
  awarded_at timestamptz not null default now(),
  unique (participant_id, skill_name, activity)
);

create table public.shuffle_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event_config(event_id) on delete cascade,
  shuffle_number integer not null check (shuffle_number > 0),
  participant_id uuid not null references public.event_participants(id) on delete cascade,
  direction text not null check (direction in ('clockwise', 'anti-clockwise', 'stay')),
  from_table integer not null check (from_table > 0),
  to_table integer not null check (to_table > 0),
  created_at timestamptz not null default now(),
  unique (event_id, shuffle_number, participant_id)
);

create index shuffle_assignments_participant_idx
  on public.shuffle_assignments(event_id, participant_id, shuffle_number desc);

alter table public.event_config enable row level security;
alter table public.event_state enable row level security;
alter table public.event_participants enable row level security;
alter table public.participant_responses enable row level security;
alter table public.round_scores enable row level security;
alter table public.skill_awards enable row level security;
alter table public.shuffle_assignments enable row level security;

revoke all on public.event_config, public.event_state, public.event_participants,
  public.participant_responses, public.round_scores, public.skill_awards,
  public.shuffle_assignments from anon, authenticated;

grant select on public.event_config, public.event_state to anon, authenticated;
grant select on public.event_participants, public.participant_responses,
  public.round_scores, public.skill_awards, public.shuffle_assignments to authenticated;
grant insert, update on public.participant_responses to authenticated;

create policy "Public can read event settings"
  on public.event_config for select to anon, authenticated using (true);

create policy "Public can read event state"
  on public.event_state for select to anon, authenticated using (true);

create policy "Participants can read their own profile"
  on public.event_participants for select to authenticated
  using (auth_user_id = (select auth.uid()));

create policy "Participants can read their own responses"
  on public.participant_responses for select to authenticated
  using (
    exists (
      select 1 from public.event_participants p
      where p.id = participant_responses.participant_id
        and p.auth_user_id = (select auth.uid())
    )
  );

create policy "Participants can submit their own responses"
  on public.participant_responses for insert to authenticated
  with check (
    (select auth.jwt() ->> 'is_anonymous') = 'true'
    and exists (
      select 1 from public.event_participants p
      where p.id = participant_responses.participant_id
        and p.event_id = participant_responses.event_id
        and p.auth_user_id = (select auth.uid())
    )
  );

create policy "Participants can update their own responses"
  on public.participant_responses for update to authenticated
  using (
    exists (
      select 1 from public.event_participants p
      where p.id = participant_responses.participant_id
        and p.auth_user_id = (select auth.uid())
    )
  )
  with check (
    (select auth.jwt() ->> 'is_anonymous') = 'true'
    and exists (
      select 1 from public.event_participants p
      where p.id = participant_responses.participant_id
        and p.event_id = participant_responses.event_id
        and p.auth_user_id = (select auth.uid())
    )
  );

create policy "Participants can read their own scores"
  on public.round_scores for select to authenticated
  using (
    exists (
      select 1 from public.event_participants p
      where p.id = round_scores.participant_id
        and p.auth_user_id = (select auth.uid())
    )
  );

create policy "Participants can read their own skill awards"
  on public.skill_awards for select to authenticated
  using (
    exists (
      select 1 from public.event_participants p
      where p.id = skill_awards.participant_id
        and p.auth_user_id = (select auth.uid())
    )
  );

create policy "Participants can read their own shuffle directions"
  on public.shuffle_assignments for select to authenticated
  using (
    exists (
      select 1 from public.event_participants p
      where p.id = shuffle_assignments.participant_id
        and p.auth_user_id = (select auth.uid())
    )
  );

create or replace function public.join_networkathon(
  p_event_id uuid,
  p_full_name text,
  p_student_id text
)
returns table (
  participant_id uuid,
  full_name text,
  student_id text,
  table_number integer,
  already_joined boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.event_participants%rowtype;
  v_inserted public.event_participants%rowtype;
  v_student_id text := btrim(p_student_id);
begin
  if v_user_id is null or (auth.jwt() ->> 'is_anonymous') is distinct from 'true' then
    raise exception 'Anonymous participant sign-in is required.' using errcode = '42501';
  end if;
  if btrim(p_full_name) is null or char_length(btrim(p_full_name)) not between 2 and 100 then
    raise exception 'Enter a name between 2 and 100 characters.' using errcode = '22023';
  end if;
  if v_student_id is null or char_length(v_student_id) not between 2 and 32 then
    raise exception 'Enter a valid student ID.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.event_config c where c.event_id = p_event_id) then
    raise exception 'This event is not configured.' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.event_participants p
    where p.event_id = p_event_id and p.auth_user_id = v_user_id
  ) then
    select * into v_existing from public.event_participants p
    where p.event_id = p_event_id and p.auth_user_id = v_user_id;
    return query select v_existing.id, v_existing.full_name, v_existing.student_id,
      v_existing.table_number, true;
    return;
  end if;

  insert into public.event_participants as p (
    event_id, auth_user_id, full_name, student_id, normalized_student_id
  )
  values (
    p_event_id, v_user_id, btrim(p_full_name), v_student_id, lower(regexp_replace(v_student_id, '\s+', '', 'g'))
  )
  on conflict do nothing
  returning p.* into v_inserted;

  if v_inserted.id is null then
    raise exception 'This student ID has already joined.' using errcode = '23505';
  end if;

  return query select v_inserted.id, v_inserted.full_name, v_inserted.student_id,
    v_inserted.table_number, false;
end;
$$;

revoke all on function public.join_networkathon(uuid, text, text) from public, anon;
grant execute on function public.join_networkathon(uuid, text, text) to authenticated;

create or replace function public.host_update_event(p_event_id uuid, p_patch jsonb)
returns public.event_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous public.event_state%rowtype;
  v_next public.event_state%rowtype;
  v_settings jsonb;
  v_table_count integer;
  v_clockwise_pct numeric;
  v_anticlockwise_pct numeric;
  v_clockwise_count integer;
  v_anticlockwise_count integer;
  v_participant_count integer;
begin
  select * into v_previous from public.event_state
  where event_id = p_event_id for update;
  if not found then
    raise exception 'Event state was not found.' using errcode = 'P0002';
  end if;
  select settings into v_settings from public.event_config where event_id = p_event_id;

  update public.event_state
  set state = coalesce(p_patch ->> 'state', state),
      round = coalesce((p_patch ->> 'round')::integer, round),
      paused = coalesce((p_patch ->> 'paused')::boolean, paused),
      timer_end = case
        when p_patch ? 'timerEnd' and p_patch -> 'timerEnd' = 'null'::jsonb then null
        when p_patch ? 'timerEnd' then to_timestamp((p_patch ->> 'timerEnd')::numeric / 1000)
        else timer_end
      end,
      spectrum_question = coalesce((p_patch ->> 'spectrumQuestion')::integer, spectrum_question),
      promo_active = coalesce((p_patch ->> 'promoActive')::boolean, promo_active),
      promo_index = coalesce((p_patch ->> 'promoIndex')::integer, promo_index),
      updated_at = now()
  where event_id = p_event_id
  returning * into v_next;

  if v_previous.state = 'opening_spectrum' and v_next.state = 'planes' then
    v_table_count := greatest(1, coalesce((v_settings ->> 'tableCount')::integer, 8));
    with numbered as (
      select id, row_number() over (order by created_at, id) as position
      from public.event_participants
      where event_id = p_event_id
    )
    update public.event_participants p
    set table_number = ((numbered.position - 1)::integer % v_table_count) + 1
    from numbered
    where p.id = numbered.id;
  end if;

  if v_next.state in ('shuffle_after_flight_path', 'shuffle_after_spotlight')
     and v_previous.state <> v_next.state then
    v_table_count := greatest(1, coalesce((v_settings ->> 'tableCount')::integer, 8));
    v_clockwise_pct := greatest(0, least(100, coalesce((v_settings ->> 'shuffleClockwisePercent')::numeric, 33)));
    v_anticlockwise_pct := greatest(0, least(100 - v_clockwise_pct, coalesce((v_settings ->> 'shuffleAnticlockwisePercent')::numeric, 33)));
    select count(*) into v_participant_count from public.event_participants
    where event_id = p_event_id;
    v_clockwise_count := round(v_participant_count * v_clockwise_pct / 100)::integer;
    v_anticlockwise_count := least(
      round(v_participant_count * v_anticlockwise_pct / 100)::integer,
      v_participant_count - v_clockwise_count
    );
    v_next.shuffle_count := v_previous.shuffle_count + 1;
    update public.event_state set shuffle_count = v_next.shuffle_count where event_id = p_event_id;

    with randomized as (
      select
        p.id,
        p.table_number,
        row_number() over (order by gen_random_uuid()) as position,
        count(*) over () as total
      from public.event_participants p
      where p.event_id = p_event_id
    ),
    assignment as (
      select
        id,
        coalesce(table_number, ((position - 1)::integer % v_table_count) + 1) as from_table,
        case
          when position <= v_clockwise_count then 'clockwise'
          when position <= v_clockwise_count + v_anticlockwise_count then 'anti-clockwise'
          else 'stay'
        end as direction
      from randomized
    )
    insert into public.shuffle_assignments (
      event_id, shuffle_number, participant_id, direction, from_table, to_table
    )
    select p_event_id, v_next.shuffle_count, a.id, a.direction, a.from_table,
      case a.direction
        when 'clockwise' then (a.from_table % v_table_count) + 1
        when 'anti-clockwise' then ((a.from_table + v_table_count - 2) % v_table_count) + 1
        else a.from_table
      end
    from assignment a;

    update public.event_participants p
    set table_number = s.to_table
    from public.shuffle_assignments s
    where s.event_id = p_event_id
      and s.shuffle_number = v_next.shuffle_count
      and s.participant_id = p.id;
  end if;

  select * into v_next from public.event_state where event_id = p_event_id;
  return v_next;
end;
$$;

revoke all on function public.host_update_event(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.host_update_event(uuid, jsonb) to service_role;

create or replace function public.update_participant_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.event_state set participant_count = participant_count + 1, updated_at = now()
    where event_id = new.event_id;
    return new;
  end if;
  update public.event_state set participant_count = greatest(0, participant_count - 1), updated_at = now()
  where event_id = old.event_id;
  return old;
end;
$$;

create trigger event_participants_count_insert
  after insert on public.event_participants
  for each row execute function public.update_participant_count();
create trigger event_participants_count_delete
  after delete on public.event_participants
  for each row execute function public.update_participant_count();

revoke all on function public.update_participant_count() from public, anon, authenticated;

insert into public.event_config (event_id, settings)
values (
  '00000000-0000-4000-8000-000000000001',
  '{
    "eventTitle": "Networkathon",
    "tagline": "Build connections. Build things.",
    "joinUrl": "",
    "tableCount": 8,
    "planesRounds": 3,
    "planesMinutes": 5,
    "spotlightSeconds": 60,
    "crisisMinutes": 5,
    "shuffleClockwisePercent": 33,
    "shuffleAnticlockwisePercent": 33,
    "spectrumQuestions": [
      "Morning person or night owl?",
      "Plan everything or wing it?",
      "Big group or one-on-one?"
    ],
    "spectrumOptions": ["Agree", "Somewhere between", "Disagree"],
    "planesInstructions": "Follow the host’s round instructions. The host records team results.",
    "spotlightScript": "Present your team’s idea in 60 seconds.",
    "crisisScenario": "The keynote speaker cancelled ten minutes before the doors open.",
    "silentRankingPrompt": "Line up by birthday — January to December. No talking.",
    "shuffleMessage": "Move to your assigned table direction.",
    "tradeFloorInstructions": "Follow the host’s instructions and make your trades at the tables.",
    "closingMessage": "Thank you — see you next time.",
    "skills": ["Precision", "Team player", "Fast thinker", "Pitch pro", "Leader"],
    "promoSlideSeconds": 10,
    "promoOrder": ["brand", "community", "opportunities", "threeV"],
    "communityLinks": {
      "whatsapp": "",
      "instagram": "",
      "linkedin": "",
      "clubWebsite": "",
      "opportunities": "",
      "threeV": ""
    }
  }'::jsonb
)
on conflict (event_id) do nothing;

insert into public.event_state (event_id)
values ('00000000-0000-4000-8000-000000000001')
on conflict (event_id) do nothing;

alter publication supabase_realtime add table public.event_config;
alter publication supabase_realtime add table public.event_state;
alter publication supabase_realtime add table public.event_participants;
alter publication supabase_realtime add table public.participant_responses;
alter publication supabase_realtime add table public.round_scores;
alter publication supabase_realtime add table public.skill_awards;
alter publication supabase_realtime add table public.shuffle_assignments;
