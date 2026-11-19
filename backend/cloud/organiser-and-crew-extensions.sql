-- Apply through Lovable Cloud SQL editor.
-- Additive schema and caller-checked RPCs for:
-- 1. One-way organiser broadcasts & emergency alerts (organiser_broadcasts)
-- 2. Published organiser events -> event_sync_catalogue trigger & public read RPC
-- 3. Admin organiser-verification review RPCs
-- 4. Aggregate-only organiser attendance counts RPC (zero PII)
-- 5. Cloud crew shared-artist overlap RPC & safe account-data deletion RPC
begin;

-- 1. One-way organiser broadcasts
create table if not exists public.organiser_broadcasts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'update' check (kind in ('update', 'emergency')),
  message text not null check (char_length(btrim(message)) between 1 and 240),
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists organiser_broadcasts_event_idx
  on public.organiser_broadcasts(event_id, created_at desc);
alter table public.organiser_broadcasts enable row level security;
revoke all on public.organiser_broadcasts from public, anon, authenticated;

create or replace function public.send_organiser_broadcast(
  p_event_id uuid,
  p_kind text,
  p_message text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  ev public.organiser_events%rowtype;
  inserted public.organiser_broadcasts%rowtype;
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if p_kind not in ('update', 'emergency') or char_length(btrim(coalesce(p_message, ''))) not between 1 and 240 then
    raise exception 'Broadcast message must be 1 to 240 characters' using errcode = '22023';
  end if;
  select * into ev from public.organiser_events where id = p_event_id and owner_id = actor;
  if not found or ev.status <> 'published' then
    raise exception 'Only the owner of a published event can send broadcasts' using errcode = '42501';
  end if;
  insert into public.organiser_broadcasts(event_id, owner_id, kind, message)
    values (p_event_id, actor, p_kind, btrim(p_message))
    returning * into inserted;
  return jsonb_build_object(
    'id', inserted.id,
    'eventId', inserted.event_id,
    'kind', inserted.kind,
    'message', inserted.message,
    'createdAt', inserted.created_at
  );
end $$;
revoke all on function public.send_organiser_broadcast(uuid, text, text) from public, anon;
grant execute on function public.send_organiser_broadcast(uuid, text, text) to authenticated;

create or replace function public.list_event_broadcasts(p_event_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  allowed boolean := false;
begin
  if p_event_id = '20000000-0000-4000-8000-000000000002'::uuid then
    allowed := true;
  elsif exists (
    select 1 from public.organiser_events
    where id = p_event_id and (status = 'published' or owner_id = actor)
  ) then
    allowed := true;
  end if;
  if not allowed then
    return '[]'::jsonb;
  end if;
  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'eventId', b.event_id,
          'kind', b.kind,
          'message', b.message,
          'createdAt', b.created_at
        )
        order by b.created_at desc
      )
      from (
        select * from public.organiser_broadcasts
        where event_id = p_event_id
        order by created_at desc
        limit 25
      ) b
    ),
    '[]'::jsonb
  );
end $$;
revoke all on function public.list_event_broadcasts(uuid) from public;
grant execute on function public.list_event_broadcasts(uuid) to anon, authenticated;

-- 2. Published organiser events -> event_sync_catalogue trigger & public discovery RPC
create or replace function public.sync_published_organiser_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  artists text[];
  points text[];
  s_at timestamptz;
  e_at timestamptz;
begin
  if new.status = 'published' and new.start_date is not null then
    select coalesce(array_agg(distinct lower(regexp_replace(elem->>'title', '[^a-zA-Z0-9]+', '-', 'g'))), '{}'::text[])
      into artists
      from jsonb_array_elements(coalesce(new.program, '[]'::jsonb)) elem
      where coalesce(btrim(elem->>'title'), '') <> '';
    select coalesce(array_agg(distinct lower(regexp_replace(elem->>'name', '[^a-zA-Z0-9]+', '-', 'g'))), '{}'::text[])
      into points
      from jsonb_array_elements(coalesce(new.zones, '[]'::jsonb)) elem
      where coalesce(btrim(elem->>'name'), '') <> '';
    s_at := (new.start_date::text || 'T10:00:00Z')::timestamptz;
    e_at := (coalesce(new.end_date, new.start_date)::text || 'T23:00:00Z')::timestamptz;
    if e_at <= s_at then
      e_at := s_at + interval '12 hours';
    end if;
    insert into public.event_sync_catalogue(event_id, artist_ids, point_ids, starts_at, ends_at)
      values (new.id, artists, points, s_at, e_at)
      on conflict (event_id) do update
      set artist_ids = excluded.artist_ids,
          point_ids = excluded.point_ids,
          starts_at = excluded.starts_at,
          ends_at = excluded.ends_at;
  end if;
  return new;
end $$;

drop trigger if exists organiser_events_catalogue_sync on public.organiser_events;
create trigger organiser_events_catalogue_sync
  after insert or update on public.organiser_events
  for each row execute function public.sync_published_organiser_event();

create or replace function public.list_published_events()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'eventType', e.event_type,
        'name', e.name,
        'startDate', e.start_date,
        'endDate', e.end_date,
        'venue', e.venue,
        'gatesOpen', e.gates_open,
        'entryRules', e.entry_rules,
        'publishedAt', e.published_at
      )
      order by e.start_date asc nulls last, e.published_at desc
    ),
    '[]'::jsonb
  )
  from public.organiser_events e
  where e.status = 'published';
$$;
revoke all on function public.list_published_events() from public;
grant execute on function public.list_published_events() to anon, authenticated;

-- 3. Admin organiser-verification review RPCs
create or replace function public.admin_list_organiser_verifications()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or not public.has_role(actor, 'admin') then
    raise exception 'Administrator role required' using errcode = '42501';
  end if;
  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'userId', p.user_id,
          'displayName', p.display_name,
          'organisation', p.organisation,
          'verificationStatus', p.verification_status,
          'verificationDocumentPath', p.verification_document_path,
          'updatedAt', p.updated_at
        )
        order by p.updated_at desc
      )
      from public.organiser_profiles p
    ),
    '[]'::jsonb
  );
end $$;
revoke all on function public.admin_list_organiser_verifications() from public, anon;
grant execute on function public.admin_list_organiser_verifications() to authenticated;

create or replace function public.admin_review_organiser(p_user_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  updated public.organiser_profiles%rowtype;
begin
  if actor is null or not public.has_role(actor, 'admin') then
    raise exception 'Administrator role required' using errcode = '42501';
  end if;
  if p_status not in ('verified', 'rejected') then
    raise exception 'Invalid verification decision' using errcode = '22023';
  end if;
  update public.organiser_profiles
    set verification_status = p_status,
        updated_at = now()
    where user_id = p_user_id
    returning * into updated;
  if not found then
    raise exception 'Organiser profile not found' using errcode = '22023';
  end if;
  return jsonb_build_object(
    'userId', updated.user_id,
    'verificationStatus', updated.verification_status,
    'updatedAt', updated.updated_at
  );
end $$;
revoke all on function public.admin_review_organiser(uuid, text) from public, anon;
grant execute on function public.admin_review_organiser(uuid, text) to authenticated;

-- 4. Aggregate-only attendance counts RPC (zero PII)
create or replace function public.organiser_event_aggregates(p_event_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organiser_events where id = p_event_id and owner_id = actor
  ) and not public.has_role(actor, 'admin') then
    raise exception 'Not authorised for this event' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'savedPlansCount', (
      select count(*)::int from public.attendee_event_preferences
      where event_id = p_event_id and (cardinality(saved_artist_ids) > 0 or meeting is not null)
    ),
    'crewsCount', (
      select count(*)::int from public.attendee_crews where event_id = p_event_id
    ),
    'crewMembersCount', (
      select count(*)::int from public.attendee_crew_members where event_id = p_event_id
    ),
    'activePinsCount', (
      select count(*)::int from public.attendee_crew_members
      where event_id = p_event_id and point_id is not null and expires_at > clock_timestamp()
    )
  );
end $$;
revoke all on function public.organiser_event_aggregates(uuid) from public, anon;
grant execute on function public.organiser_event_aggregates(uuid) to authenticated;

-- 5. Cloud crew shared-artist overlap & safe account-data deletion
create or replace function public.attendee_crew_artist_overlap(p_event_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  my_crew uuid;
begin
  if actor is null then
    return '{}'::jsonb;
  end if;
  select crew_id into my_crew
    from public.attendee_crew_members
    where event_id = p_event_id and user_id = actor;
  if my_crew is null then
    return '{}'::jsonb;
  end if;
  return coalesce(
    (
      select jsonb_object_agg(artist_id, names)
      from (
        select
          unnest(p.saved_artist_ids) as artist_id,
          jsonb_agg(m.display_name order by m.joined_at, m.user_id) as names
        from public.attendee_crew_members m
        join public.attendee_event_preferences p
          on p.user_id = m.user_id and p.event_id = m.event_id
        where m.crew_id = my_crew
          and m.event_id = p_event_id
          and m.user_id <> actor
        group by unnest(p.saved_artist_ids)
      ) grouped
    ),
    '{}'::jsonb
  );
end $$;
revoke all on function public.attendee_crew_artist_overlap(uuid) from public, anon;
grant execute on function public.attendee_crew_artist_overlap(uuid) to authenticated;

create or replace function public.delete_my_attendee_account_data()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  owned record;
  next_owner uuid;
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  for owned in
    select crew_id from public.attendee_crew_members
    where user_id = actor and is_owner = true
  loop
    select user_id into next_owner
      from public.attendee_crew_members
      where crew_id = owned.crew_id and user_id <> actor
      order by joined_at asc, user_id asc
      limit 1;
    delete from public.attendee_crew_members
      where crew_id = owned.crew_id and user_id = actor;
    if next_owner is not null then
      update public.attendee_crew_members
        set is_owner = true
        where crew_id = owned.crew_id and user_id = next_owner;
      delete from public.attendee_crew_invites where crew_id = owned.crew_id;
    else
      delete from public.attendee_crews where id = owned.crew_id;
    end if;
  end loop;

  delete from public.attendee_crew_members where user_id = actor;
  delete from public.attendee_crew_commands where user_id = actor;
  delete from public.attendee_preference_actions where user_id = actor;
  delete from public.attendee_event_preferences where user_id = actor;
  delete from public.organiser_events where owner_id = actor and status <> 'published';

  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.delete_my_attendee_account_data() from public, anon;
grant execute on function public.delete_my_attendee_account_data() to authenticated;

-- 6. Private crew coordination activities (delivered quick pings, safe check-in / crew SOS, polls, shared travel, short messages)
create table if not exists public.attendee_crew_activities (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  crew_id uuid not null references public.attendee_crews(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null check (char_length(btrim(author_name)) between 1 and 50),
  kind text not null check (kind in ('ping', 'safe', 'sos', 'poll', 'travel', 'message')),
  message text not null check (char_length(btrim(message)) between 1 and 200),
  point_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists attendee_crew_activities_crew_idx
  on public.attendee_crew_activities(crew_id, created_at desc);
alter table public.attendee_crew_activities enable row level security;
revoke all on public.attendee_crew_activities from public, anon, authenticated;

create or replace function public.crew_post_activity(
  p_event_id uuid,
  p_kind text,
  p_message text,
  p_point_id text default null,
  p_meta jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  member public.attendee_crew_members%rowtype;
  inserted public.attendee_crew_activities%rowtype;
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if p_kind not in ('ping', 'safe', 'sos', 'poll', 'travel', 'message') then
    raise exception 'Unsupported crew activity kind' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_message, ''))) not between 1 and 200 then
    raise exception 'Message must be 1 to 200 characters' using errcode = '22023';
  end if;
  select * into member
    from public.attendee_crew_members
    where event_id = p_event_id and user_id = actor;
  if not found then
    raise exception 'Join or start a crew for this event first' using errcode = '42501';
  end if;
  insert into public.attendee_crew_activities(
    event_id, crew_id, author_id, author_name, kind, message, point_id, meta
  )
  values (
    p_event_id,
    member.crew_id,
    actor,
    member.display_name,
    p_kind,
    btrim(p_message),
    nullif(btrim(coalesce(p_point_id, '')), ''),
    coalesce(p_meta, '{}'::jsonb)
  )
  returning * into inserted;

  return jsonb_build_object(
    'id', inserted.id,
    'eventId', inserted.event_id,
    'crewId', inserted.crew_id,
    'authorId', inserted.author_id,
    'authorName', inserted.author_name,
    'kind', inserted.kind,
    'message', inserted.message,
    'pointId', inserted.point_id,
    'meta', inserted.meta,
    'createdAt', inserted.created_at
  );
end $$;
revoke all on function public.crew_post_activity(uuid, text, text, text, jsonb) from public, anon;
grant execute on function public.crew_post_activity(uuid, text, text, text, jsonb) to authenticated;

create or replace function public.crew_vote_poll(
  p_event_id uuid,
  p_activity_id uuid,
  p_option_index int
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  member public.attendee_crew_members%rowtype;
  act public.attendee_crew_activities%rowtype;
  votes jsonb;
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  select * into member
    from public.attendee_crew_members
    where event_id = p_event_id and user_id = actor;
  if not found then
    raise exception 'Crew membership required' using errcode = '42501';
  end if;
  select * into act
    from public.attendee_crew_activities
    where id = p_activity_id and crew_id = member.crew_id and kind = 'poll'
    for update;
  if not found then
    raise exception 'Poll not found' using errcode = '22023';
  end if;
  if p_option_index < 0 or p_option_index >= jsonb_array_length(coalesce(act.meta->'options', '[]'::jsonb)) then
    raise exception 'Invalid poll option' using errcode = '22023';
  end if;
  votes := coalesce(act.meta->'votes', '{}'::jsonb) || jsonb_build_object(actor::text, p_option_index);
  update public.attendee_crew_activities
    set meta = jsonb_set(coalesce(act.meta, '{}'::jsonb), '{votes}', votes, true)
    where id = act.id
    returning * into act;
  return jsonb_build_object(
    'id', act.id,
    'meta', act.meta
  );
end $$;
revoke all on function public.crew_vote_poll(uuid, uuid, int) from public, anon;
grant execute on function public.crew_vote_poll(uuid, uuid, int) to authenticated;

create or replace function public.crew_list_activities(p_event_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  my_crew uuid;
begin
  if actor is null then
    return '[]'::jsonb;
  end if;
  select crew_id into my_crew
    from public.attendee_crew_members
    where event_id = p_event_id and user_id = actor;
  if my_crew is null then
    return '[]'::jsonb;
  end if;
  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'eventId', a.event_id,
          'crewId', a.crew_id,
          'authorId', a.author_id,
          'authorName', a.author_name,
          'kind', a.kind,
          'message', a.message,
          'pointId', a.point_id,
          'meta', a.meta,
          'createdAt', a.created_at
        )
        order by a.created_at desc
      )
      from (
        select * from public.attendee_crew_activities
        where crew_id = my_crew and event_id = p_event_id
        order by created_at desc
        limit 40
      ) a
    ),
    '[]'::jsonb
  );
end $$;
revoke all on function public.crew_list_activities(uuid) from public, anon;
grant execute on function public.crew_list_activities(uuid) to authenticated;

-- 7. Organiser team collaborator roles
create table if not exists public.organiser_team_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  member_email text not null check (char_length(btrim(member_email)) between 3 and 160),
  role text not null default 'editor' check (role in ('editor', 'live_ops', 'viewer')),
  created_at timestamptz not null default clock_timestamp(),
  unique (owner_id, member_email)
);
alter table public.organiser_team_members enable row level security;
revoke all on public.organiser_team_members from public, anon, authenticated;

create or replace function public.manage_organiser_team_member(
  p_action text,
  p_email text,
  p_role text default 'editor'
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if p_action = 'remove' then
    delete from public.organiser_team_members
      where owner_id = actor and lower(btrim(member_email)) = lower(btrim(coalesce(p_email, '')));
  elsif p_action = 'upsert' then
    if p_role not in ('editor', 'live_ops', 'viewer') then
      raise exception 'Invalid team role' using errcode = '22023';
    end if;
    insert into public.organiser_team_members(owner_id, member_email, role)
      values (actor, lower(btrim(p_email)), p_role)
      on conflict (owner_id, member_email) do update set role = excluded.role;
  else
    raise exception 'Unsupported team action' using errcode = '22023';
  end if;
  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'email', t.member_email,
          'role', t.role,
          'createdAt', t.created_at
        )
        order by t.created_at asc
      )
      from public.organiser_team_members t
      where t.owner_id = actor
    ),
    '[]'::jsonb
  );
end $$;
revoke all on function public.manage_organiser_team_member(text, text, text) from public, anon;
grant execute on function public.manage_organiser_team_member(text, text, text) to authenticated;

create or replace function public.list_organiser_team_members()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'email', t.member_email,
        'role', t.role,
        'createdAt', t.created_at
      )
      order by t.created_at asc
    ),
    '[]'::jsonb
  )
  from public.organiser_team_members t
  where t.owner_id = auth.uid();
$$;
revoke all on function public.list_organiser_team_members() from public, anon;
grant execute on function public.list_organiser_team_members() to authenticated;

-- 8. Physical expiry cleanup function for expired landmark pins and invites
create or replace function public.cleanup_expired_event_data()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  cleared_pins int := 0;
  cleared_invites int := 0;
begin
  update public.attendee_crew_members
    set point_id = null,
        expires_at = null,
        updated_at = clock_timestamp()
    where point_id is not null
      and (expires_at is null or expires_at <= clock_timestamp());
  get diagnostics cleared_pins = row_count;

  delete from public.attendee_crew_invites
    where expires_at <= clock_timestamp();
  get diagnostics cleared_invites = row_count;

  return jsonb_build_object(
    'clearedPins', cleared_pins,
    'clearedInvites', cleared_invites,
    'cleanedAt', clock_timestamp()
  );
end $$;
revoke all on function public.cleanup_expired_event_data() from public, anon;
grant execute on function public.cleanup_expired_event_data() to authenticated;

notify pgrst, 'reload schema';
commit;
