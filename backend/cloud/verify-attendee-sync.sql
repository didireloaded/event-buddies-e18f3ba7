-- Run in Lovable Cloud SQL editor. Fixtures and writes are rolled back.
begin;
insert into auth.users(id) values ('f1111111-1111-4111-8111-111111111111'), ('f2222222-2222-4222-8222-222222222222');
set local role authenticated;
select set_config('request.jwt.claim.sub','f1111111-1111-4111-8111-111111111111',true);
do $$
declare first_revision bigint; repeat_revision bigint; saved text[];
begin
  select revision into first_revision from public.apply_attendee_action('20000000-0000-4000-8000-000000000002','a1111111-1111-4111-8111-111111111111','{"artists":[{"id":"shimza","saved":true}],"meeting":{"pointId":"sos-main","at":"2026-12-28T17:30:00+02:00"}}');
  select revision into repeat_revision from public.apply_attendee_action('20000000-0000-4000-8000-000000000002','a1111111-1111-4111-8111-111111111111','{"artists":[{"id":"shimza","saved":true}]}');
  if first_revision<>1 or repeat_revision<>first_revision then raise exception 'Idempotency failed'; end if;
  perform public.apply_attendee_action('20000000-0000-4000-8000-000000000002','a2222222-2222-4222-8222-222222222222','{"artists":[{"id":"buddykev","saved":true}]}');
  select saved_artist_ids into saved from public.attendee_event_preferences;
  if not (saved @> array['shimza','buddykev']) then raise exception 'Independent edits lost'; end if;
  begin
    perform public.apply_attendee_action('20000000-0000-4000-8000-000000000002','a3333333-3333-4333-8333-333333333333','{"artists":[{"id":"unknown","saved":false}]}');
    raise exception 'Unknown artist accepted';
  exception when others then if SQLERRM <> 'Unknown artist' then raise; end if; end;
  begin
    insert into public.attendee_event_preferences(user_id,event_id) values ('f2222222-2222-4222-8222-222222222222','20000000-0000-4000-8000-000000000002');
    raise exception 'Cross-user insert allowed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','f2222222-2222-4222-8222-222222222222',true);
do $$ begin
  if exists(select 1 from public.attendee_event_preferences) or exists(select 1 from public.attendee_preference_actions) then raise exception 'Cross-user read allowed'; end if;
  update public.attendee_event_preferences set meeting=null where user_id='f1111111-1111-4111-8111-111111111111';
  if found then raise exception 'Cross-user update allowed'; end if;
  delete from public.attendee_event_preferences where user_id='f1111111-1111-4111-8111-111111111111';
  if found then raise exception 'Cross-user delete allowed'; end if;
  perform public.apply_attendee_action('20000000-0000-4000-8000-000000000002','a1111111-1111-4111-8111-111111111111','{"artists":[{"id":"xduppy","saved":true}]}');
  if (select saved_artist_ids from public.attendee_event_preferences)<>array['xduppy'] then raise exception 'Account separation failed'; end if;
end $$;
reset role;
select 'PASS: owner isolation, cross-user read/write denial, idempotent replay, independent artist edits, invalid artist rejection' as verification;
rollback;
