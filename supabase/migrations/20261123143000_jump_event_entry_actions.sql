create or replace function public.host_update_event_runtime(
  p_event_id uuid,
  p_patch jsonb
)
returns public.event_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_state text;
  v_settings jsonb;
  v_table_count integer;
  v_next public.event_state%rowtype;
begin
  select state into v_previous_state
  from public.event_state
  where event_id = p_event_id
  for update;
  if not found then
    raise exception 'Event state was not found.' using errcode = 'P0002';
  end if;

  v_next := public.host_update_event(p_event_id, p_patch);

  if p_patch ->> 'state' = 'planes'
     and v_previous_state not in ('opening_spectrum', 'planes') then
    select settings into v_settings
    from public.event_config
    where event_id = p_event_id;
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

  if p_patch ?| array[
    'currentSpotlightTeam',
    'spotlightRatingOpen',
    'silentOrderStarted',
    'tradeFloorDealt',
    'tradeFloorTradingOpen'
  ] then
    update public.event_state
    set current_spotlight_team = coalesce(
          (p_patch ->> 'currentSpotlightTeam')::integer,
          current_spotlight_team
        ),
        spotlight_rating_open = coalesce(
          (p_patch ->> 'spotlightRatingOpen')::boolean,
          spotlight_rating_open
        ),
        silent_order_started = coalesce(
          (p_patch ->> 'silentOrderStarted')::boolean,
          silent_order_started
        ),
        trade_floor_dealt = coalesce(
          (p_patch ->> 'tradeFloorDealt')::boolean,
          trade_floor_dealt
        ),
        trade_floor_trading_open = coalesce(
          (p_patch ->> 'tradeFloorTradingOpen')::boolean,
          trade_floor_trading_open
        ),
        updated_at = now()
    where event_id = p_event_id
    returning * into v_next;
  end if;

  return v_next;
end;
$$;
