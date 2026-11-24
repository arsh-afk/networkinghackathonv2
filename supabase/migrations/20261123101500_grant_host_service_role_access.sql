grant usage on schema public to service_role;

grant select, update on public.event_config to service_role;

grant select, insert, update on public.round_scores, public.skill_awards to service_role;
grant select on public.event_participants to service_role;
