-- No identities or preferences persist after these assertions.
begin;
insert into auth.users(id) values('f7777777-7777-4777-8777-777777777777');
set local role anon;
do $$ begin
 begin
  perform * from public.event_sync_catalogue;
  raise exception 'Anonymous catalogue access allowed';
 exception when insufficient_privilege then null; end;
 begin
  perform public.valid_attendee_selection('20000000-0000-4000-8000-000000000002','{}',null);
  raise exception 'Anonymous validation access allowed';
 exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','f7777777-7777-4777-8777-777777777777',true);
do $$
declare result public.attendee_event_preferences%rowtype;
begin
 begin
  perform * from public.event_sync_catalogue;
  raise exception 'Authenticated catalogue access allowed';
 exception when insufficient_privilege then null; end;
 if not public.valid_attendee_selection('20000000-0000-4000-8000-000000000002',array['shimza'],null) then raise exception 'Known artist validation broken'; end if;
 if public.valid_attendee_selection('20000000-0000-4000-8000-000000000002',array['unknown'],null) then raise exception 'Unknown artist accepted'; end if;
 select * into result from public.apply_attendee_action('20000000-0000-4000-8000-000000000002','f7777777-7777-4777-8777-777777777778','{"artists":[{"id":"shimza","saved":true}],"meeting":{"pointId":"sos-main","at":"2026-12-28T17:30:00+02:00"}}');
 if result.saved_artist_ids<>array['shimza'] or result.meeting->>'pointId'<>'sos-main' then raise exception 'Account save broken'; end if;
 perform public.apply_attendee_action('20000000-0000-4000-8000-000000000002','f7777777-7777-4777-8777-777777777779','{"artists":[{"id":"shimza","saved":false}]}');
 if (select cardinality(saved_artist_ids) from public.attendee_event_preferences)<>0 then raise exception 'Account artist removal broken'; end if;
end $$;
reset role;
select jsonb_build_object('anonymous_select',has_table_privilege('anon','public.event_sync_catalogue','select'),'authenticated_select',has_table_privilege('authenticated','public.event_sync_catalogue','select'),'catalogue_read_policy_exists',exists(select 1 from pg_policies where schemaname='public' and tablename='event_sync_catalogue' and policyname='catalogue_read'),'validation_and_account_writes','PASS') as verification;
rollback;
