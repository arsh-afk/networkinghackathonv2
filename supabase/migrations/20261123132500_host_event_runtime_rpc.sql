grant select, update on public.event_state to service_role;

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
  v_next public.event_state%rowtype;
begin
  v_next := public.host_update_event(p_event_id, p_patch);

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

revoke all on function public.host_update_event_runtime(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.host_update_event_runtime(uuid, jsonb)
  to service_role;
