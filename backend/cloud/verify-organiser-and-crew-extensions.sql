-- Run in Lovable Cloud SQL editor after organiser-and-crew-extensions.sql.
-- Rolls back all test fixtures after verifying RLS, ownership, admin checks,
-- broadcasts, aggregate counts, crew artist overlap, and account cleanup.
begin;
do $$
declare
  org_a uuid := 'e1111111-1111-4111-8111-111111111111';
  org_b uuid := 'e2222222-2222-4222-8222-222222222222';
  adm   uuid := 'e3333333-3333-4333-8333-333333333333';
  ev_id uuid;
  invite_code text;
  bcast jsonb;
  aggs jsonb;
  overlap jsonb;
begin
  insert into auth.users(id, aud, role, email) values
    (org_a, 'authenticated', 'authenticated', 'orga@example.invalid'),
    (org_b, 'authenticated', 'authenticated', 'orgb@example.invalid'),
    (adm,   'authenticated', 'authenticated', 'admin@example.invalid')
  on conflict (id) do nothing;

  insert into public.user_roles(user_id, role) values (adm, 'admin') on conflict do nothing;

  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', org_a::text, true);

  insert into public.organiser_profiles(user_id, display_name, organisation)
    values (org_a, 'Alex', 'Namib Rage');
  update public.organiser_profiles
    set verification_document_path = org_a::text || '/verification/doc.pdf',
        verification_status = 'pending'
    where user_id = org_a;

  insert into public.organiser_events(owner_id, name, start_date, venue, site_plan_path, program, zones)
    values (
      org_a,
      'Coast Test Fest',
      '2026-12-30',
      'Langstrand',
      org_a::text || '/site-plans/map.png',
      '[{"title":"Shimza","place":"Main Stage","time":"21:00","status":"scheduled"}]'::jsonb,
      '[{"name":"Main Stage","type":"stage","x":50,"y":50}]'::jsonb
    )
    returning id into ev_id;

  -- Non-admin cannot approve verification
  begin
    perform public.admin_review_organiser(org_a, 'verified');
    raise exception 'Non-admin approved verification';
  exception when insufficient_privilege then null;
  end;

  -- Admin approves verification
  perform set_config('request.jwt.claim.sub', adm::text, true);
  perform public.admin_review_organiser(org_a, 'verified');

  -- Owner publishes event -> syncs to event_sync_catalogue and public list
  perform set_config('request.jwt.claim.sub', org_a::text, true);
  update public.organiser_events set status = 'published' where id = ev_id;

  if not exists (select 1 from public.event_sync_catalogue where event_id = ev_id) then
    raise exception 'Published event did not sync to event_sync_catalogue';
  end if;

  bcast := public.send_organiser_broadcast(ev_id, 'update', 'Gates open at 12:00 CAT.');
  if (bcast->>'message') <> 'Gates open at 12:00 CAT.' then
    raise exception 'Broadcast insert failed';
  end if;

  -- Other organiser cannot broadcast or read aggregates on org_a event
  perform set_config('request.jwt.claim.sub', org_b::text, true);
  begin
    perform public.send_organiser_broadcast(ev_id, 'update', 'Spoof');
    raise exception 'Cross-organiser broadcast allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.organiser_event_aggregates(ev_id);
    raise exception 'Cross-organiser aggregates allowed';
  exception when insufficient_privilege then null;
  end;

  -- Crew artist overlap & account data deletion
  perform set_config('request.jwt.claim.sub', org_a::text, true);
  perform public.apply_attendee_action(
    '20000000-0000-4000-8000-000000000002',
    'a1111111-1111-4111-8111-111111111111',
    '{"artists":[{"id":"shimza","saved":true}]}'::jsonb
  );
  invite_code := public.attendee_crew_command(
    '20000000-0000-4000-8000-000000000002',
    'a1111111-1111-4111-8111-111111111112',
    '{"op":"create","name":"Test Crew","displayName":"Alex"}'::jsonb
  )->'invite'->>'code';

  perform set_config('request.jwt.claim.sub', org_b::text, true);
  perform public.apply_attendee_action(
    '20000000-0000-4000-8000-000000000002',
    'a2222222-2222-4222-8222-222222222221',
    '{"artists":[{"id":"shimza","saved":true}]}'::jsonb
  );
  perform public.attendee_crew_command(
    '20000000-0000-4000-8000-000000000002',
    'a2222222-2222-4222-8222-222222222222',
    jsonb_build_object('op', 'join', 'code', invite_code, 'displayName', 'Maya')
  );

  overlap := public.attendee_crew_artist_overlap('20000000-0000-4000-8000-000000000002');
  if (overlap->'shimza'->>0) <> 'Alex' then
    raise exception 'Crew artist overlap mismatch: %', overlap;
  end if;

  perform set_config('request.jwt.claim.sub', org_a::text, true);
  aggs := public.organiser_event_aggregates(ev_id);
  if (aggs->>'savedPlansCount')::int <> 0 then
    raise exception 'Unexpected aggregate count on fresh event';
  end if;

  -- Owner deletes synced attendee data -> ownership transfers to org_b
  perform public.delete_my_attendee_account_data();
  if not exists (
    select 1 from public.attendee_crew_members
    where user_id = org_b and is_owner = true
  ) then
    raise exception 'Crew ownership did not transfer on account data deletion';
  end if;
end $$;
rollback;
