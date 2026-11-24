create or replace function public.get_spectrum_distribution(
  p_event_id uuid,
  p_prompt_index integer
)
returns table(response_value integer, response_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.value::integer as response_value, count(*) as response_count
  from public.participant_responses r
  where r.event_id = p_event_id
    and r.response_type = 'spectrum'
    and r.prompt_index = p_prompt_index
    and r.value ~ '^[0-4]$'
  group by r.value::integer
$$;

revoke all on function public.get_spectrum_distribution(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.get_spectrum_distribution(uuid, integer)
  to anon, authenticated;
