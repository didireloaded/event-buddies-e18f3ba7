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

-- Ensure shared event columns exist before list_published_events() references them
alter table public.organiser_events
  add column if not exists bar_menus jsonb not null default '[]'::jsonb,
  add column if not exists map_calibration jsonb,
  add column if not exists template_config jsonb,
  add column if not exists visibility text not null default 'public' check (visibility in ('public', 'private_invite'));

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
        'program', coalesce(e.program, '[]'::jsonb),
        'zones', coalesce(e.zones, '[]'::jsonb),
        'sitePlanPath', e.site_plan_path,
        'barMenus', coalesce(e.bar_menus, '[]'::jsonb),
        'mapCalibration', e.map_calibration,
        'templateConfig', e.template_config,
        'visibility', coalesce(e.visibility, 'public'),
        'publishedAt', e.published_at
      )
      order by e.start_date asc nulls last, e.published_at desc
    ),
    '[]'::jsonb
  )
  from public.organiser_events e
  where e.status = 'published'
    and coalesce(e.visibility, 'public') = 'public';
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

-- 8. Real-time crew pin pipe (public.pins table, broadcast trigger on crew:{id}:pins, drop_pin / remove_pin / list_crew_pins RPCs, and pg_cron cleanup)
create table if not exists public.pins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  crew_id uuid not null references public.attendee_crews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 50),
  point_id text,
  x numeric(6,2) check (x is null or (x >= 0 and x <= 100)),
  y numeric(6,2) check (y is null or (y >= 0 and y <= 100)),
  lat numeric(9,4) check (lat is null or (lat >= -90 and lat <= 90)),
  lng numeric(9,4) check (lng is null or (lng >= -180 and lng <= 180)),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  unique (crew_id, user_id)
);
create index if not exists pins_crew_expires_idx
  on public.pins(crew_id, expires_at desc);
alter table public.pins enable row level security;

drop policy if exists "crew_members_select_pins" on public.pins;
create policy "crew_members_select_pins"
  on public.pins
  for select
  to authenticated
  using (
    expires_at > clock_timestamp()
    and exists (
      select 1 from public.attendee_crew_members m
      where m.crew_id = pins.crew_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "crew_members_manage_own_pin" on public.pins;
create policy "crew_members_manage_own_pin"
  on public.pins
  for all
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.attendee_crew_members m
      where m.crew_id = pins.crew_id and m.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.attendee_crew_members m
      where m.crew_id = pins.crew_id and m.user_id = auth.uid()
    )
  );

create or replace function public.broadcast_crew_pin_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  topic text;
  payload jsonb;
begin
  if tg_op = 'DELETE' then
    topic := 'crew:' || old.crew_id::text || ':pins';
    payload := jsonb_build_object(
      'id', old.id,
      'eventId', old.event_id,
      'crewId', old.crew_id,
      'userId', old.user_id,
      'pointId', old.point_id
    );
    begin
      perform realtime.send(payload, 'pin:removed', topic, true);
    exception when others then
      null;
    end;
    return old;
  else
    topic := 'crew:' || new.crew_id::text || ':pins';
    payload := jsonb_build_object(
      'id', new.id,
      'eventId', new.event_id,
      'crewId', new.crew_id,
      'userId', new.user_id,
      'displayName', new.display_name,
      'pointId', new.point_id,
      'x', new.x,
      'y', new.y,
      'lat', new.lat,
      'lng', new.lng,
      'accuracyMeters', new.accuracy_m,
      'sessionId', new.session_id,
      'createdAt', new.created_at,
      'expiresAt', new.expires_at
    );
    begin
      perform realtime.send(payload, 'pin:upserted', topic, true);
    exception when others then
      null;
    end;
    return new;
  end if;
end $$;

drop trigger if exists pins_realtime_broadcast_trg on public.pins;
create trigger pins_realtime_broadcast_trg
  after insert or update or delete on public.pins
  for each row execute function public.broadcast_crew_pin_change();

alter table public.pins
  add column if not exists accuracy_m numeric(6,1),
  add column if not exists session_id uuid;

drop function if exists public.drop_pin(uuid, uuid, text, numeric, numeric, numeric, numeric);
create or replace function public.drop_pin(
  p_event_id uuid,
  p_crew_id uuid,
  p_point_id text default null,
  p_x numeric default null,
  p_y numeric default null,
  p_lat numeric default null,
  p_lng numeric default null,
  p_duration_minutes integer default 60,
  p_expires_at timestamptz default null,
  p_accuracy_m numeric default null,
  p_session_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  member public.attendee_crew_members%rowtype;
  catalogue public.event_sync_catalogue%rowtype;
  now_at timestamptz := clock_timestamp();
  clamped_minutes integer := greatest(1, least(coalesce(p_duration_minutes, 60), 720));
  max_session_exp timestamptz := now_at + interval '12 hours';
  requested_exp timestamptz;
  exp_at timestamptz;
  clean_point text := nullif(btrim(coalesce(p_point_id, '')), '');
  rx numeric(6,2) := case when p_x is null then null else round(p_x, 1) end;
  ry numeric(6,2) := case when p_y is null then null else round(p_y, 1) end;
  rlat numeric(9,4) := case when p_lat is null then null else round(p_lat, 4) end;
  rlng numeric(9,4) := case when p_lng is null then null else round(p_lng, 4) end;
  racc numeric(6,1) := case when p_accuracy_m is null or p_accuracy_m < 0 or p_accuracy_m > 5000 then null else round(p_accuracy_m, 1) end;
  upserted public.pins%rowtype;
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  select * into member
    from public.attendee_crew_members
    where crew_id = p_crew_id and event_id = p_event_id and user_id = actor
    for update;
  if not found then
    raise exception 'Crew membership required to drop a pin' using errcode = '42501';
  end if;

  if p_expires_at is not null then
    requested_exp := least(p_expires_at, max_session_exp);
  else
    requested_exp := now_at + make_interval(mins => clamped_minutes);
  end if;

  select * into catalogue
    from public.event_sync_catalogue
    where event_id = p_event_id;
  if found then
    if clean_point is not null and not (clean_point = any(catalogue.point_ids)) then
      raise exception 'Unknown venue landmark for this event' using errcode = '22023';
    end if;
    exp_at := least(requested_exp, catalogue.ends_at + interval '2 hours', max_session_exp);
  else
    exp_at := least(requested_exp, max_session_exp);
  end if;
  if exp_at <= now_at then
    raise exception 'Pin sharing has closed for this event' using errcode = '22023';
  end if;

  insert into public.pins(
    event_id, crew_id, user_id, display_name, point_id, x, y, lat, lng, accuracy_m, session_id, created_at, expires_at
  )
  values (
    p_event_id, p_crew_id, actor, member.display_name, clean_point, rx, ry, rlat, rlng, racc, p_session_id, now_at, exp_at
  )
  on conflict (crew_id, user_id) do update
    set display_name = excluded.display_name,
        point_id = excluded.point_id,
        x = excluded.x,
        y = excluded.y,
        lat = excluded.lat,
        lng = excluded.lng,
        accuracy_m = excluded.accuracy_m,
        session_id = excluded.session_id,
        created_at = excluded.created_at,
        expires_at = excluded.expires_at
  returning * into upserted;

  update public.attendee_crew_members
    set point_id = clean_point,
        expires_at = exp_at,
        pin_generation = pin_generation + 1
    where crew_id = p_crew_id and user_id = actor;

  return jsonb_build_object(
    'id', upserted.id,
    'eventId', upserted.event_id,
    'crewId', upserted.crew_id,
    'userId', upserted.user_id,
    'displayName', upserted.display_name,
    'pointId', upserted.point_id,
    'x', upserted.x,
    'y', upserted.y,
    'lat', upserted.lat,
    'lng', upserted.lng,
    'accuracyMeters', upserted.accuracy_m,
    'sessionId', upserted.session_id,
    'createdAt', upserted.created_at,
    'expiresAt', upserted.expires_at
  );
end $$;
revoke all on function public.drop_pin(uuid, uuid, text, numeric, numeric, numeric, numeric, integer, timestamptz, numeric, uuid) from public, anon;
grant execute on function public.drop_pin(uuid, uuid, text, numeric, numeric, numeric, numeric, integer, timestamptz, numeric, uuid) to authenticated;

create or replace function public.remove_pin(p_crew_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  delete from public.pins where crew_id = p_crew_id and user_id = actor;
  update public.attendee_crew_members
    set point_id = null,
        expires_at = null,
        pin_generation = pin_generation + 1
    where crew_id = p_crew_id and user_id = actor;
  return jsonb_build_object('ok', true, 'confirmed', true, 'crewId', p_crew_id, 'userId', actor);
end $$;
revoke all on function public.remove_pin(uuid) from public, anon;
grant execute on function public.remove_pin(uuid) to authenticated;

create or replace function public.list_crew_pins(p_crew_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or not exists (
    select 1 from public.attendee_crew_members
    where crew_id = p_crew_id and user_id = actor
  ) then
    return '[]'::jsonb;
  end if;
  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'eventId', p.event_id,
          'crewId', p.crew_id,
          'userId', p.user_id,
          'displayName', p.display_name,
          'pointId', p.point_id,
          'x', p.x,
          'y', p.y,
          'lat', p.lat,
          'lng', p.lng,
          'accuracyMeters', p.accuracy_m,
          'sessionId', p.session_id,
          'createdAt', p.created_at,
          'expiresAt', p.expires_at
        )
        order by p.created_at desc
      )
      from public.pins p
      where p.crew_id = p_crew_id and p.expires_at > clock_timestamp()
    ),
    '[]'::jsonb
  );
end $$;
revoke all on function public.list_crew_pins(uuid) from public, anon;
grant execute on function public.list_crew_pins(uuid) to authenticated;

create or replace function public.cleanup_expired_event_data()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  deleted_pins int := 0;
  cleared_member_pins int := 0;
  cleared_invites int := 0;
begin
  delete from public.pins
    where expires_at <= clock_timestamp();
  get diagnostics deleted_pins = row_count;

  update public.attendee_crew_members
    set point_id = null,
        expires_at = null
    where point_id is not null
      and (expires_at is null or expires_at <= clock_timestamp());
  get diagnostics cleared_member_pins = row_count;

  delete from public.attendee_crew_invites
    where expires_at <= clock_timestamp();
  get diagnostics cleared_invites = row_count;

  return jsonb_build_object(
    'deletedPins', deleted_pins,
    'clearedPins', greatest(deleted_pins, cleared_member_pins),
    'clearedInvites', cleared_invites,
    'cleanedAt', clock_timestamp()
  );
end $$;
revoke all on function public.cleanup_expired_event_data() from public, anon;
grant execute on function public.cleanup_expired_event_data() to authenticated;

do $$
begin
  create extension if not exists pg_cron;
  if to_regnamespace('cron') is not null then
    perform cron.schedule(
      'cleanup-expired-pins',
      '* * * * *',
      $cron$select public.cleanup_expired_event_data();$cron$
    );
  end if;
exception when others then
  null;
end $$;

alter table public.pins
  add column if not exists accuracy_m numeric(6,1),
  add column if not exists session_id uuid;

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null,
  label text not null check (char_length(btrim(label)) between 1 and 80),
  tier text not null default 'general'
    check (tier in ('general', 'vip', 'vvip', 'all_access', 'press', 'staff', 'experience', 'platinum')),
  file_url text,
  file_type text check (file_type is null or file_type in ('image', 'pdf', 'code')),
  holder_name text,
  ticket_code text,
  added_at timestamptz not null default clock_timestamp(),
  unique (user_id, event_id, label)
);

create index if not exists tickets_user_event_idx
  on public.tickets(user_id, event_id, added_at desc);

alter table public.tickets enable row level security;

drop policy if exists "self manages tickets" on public.tickets;
create policy "self manages tickets"
  on public.tickets
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 9. Shared organiser bar menus, versioned GPS map calibration, template config & visibility
create or replace function public.get_organiser_event_extras(p_event_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  ev public.organiser_events%rowtype;
begin
  select * into ev
    from public.organiser_events
    where id = p_event_id
      and (status = 'published' or owner_id = actor);
  if not found then
    return jsonb_build_object(
      'barMenus', '[]'::jsonb,
      'mapCalibration', null,
      'templateConfig', null,
      'visibility', 'public'
    );
  end if;
  return jsonb_build_object(
    'barMenus', coalesce(ev.bar_menus, '[]'::jsonb),
    'mapCalibration', ev.map_calibration,
    'templateConfig', ev.template_config,
    'visibility', coalesce(ev.visibility, 'public')
  );
end $$;
revoke all on function public.get_organiser_event_extras(uuid) from public;
grant execute on function public.get_organiser_event_extras(uuid) to anon, authenticated;

drop function if exists public.save_organiser_event_extras(uuid, jsonb, jsonb);
create or replace function public.save_organiser_event_extras(
  p_event_id uuid,
  p_bar_menus jsonb default null,
  p_map_calibration jsonb default null,
  p_template_config jsonb default null,
  p_visibility text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  updated public.organiser_events%rowtype;
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if p_visibility is not null and p_visibility not in ('public', 'private_invite') then
    raise exception 'Invalid event visibility' using errcode = '22023';
  end if;
  update public.organiser_events
    set bar_menus = case when p_bar_menus is not null then p_bar_menus else bar_menus end,
        map_calibration = case when p_map_calibration is not null then p_map_calibration else map_calibration end,
        template_config = case when p_template_config is not null then p_template_config else template_config end,
        visibility = case when p_visibility is not null then p_visibility else visibility end,
        updated_at = now()
    where id = p_event_id and owner_id = actor
    returning * into updated;
  if not found then
    raise exception 'Only the event owner can update event settings' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'ok', true,
    'barMenus', coalesce(updated.bar_menus, '[]'::jsonb),
    'mapCalibration', updated.map_calibration,
    'templateConfig', updated.template_config,
    'visibility', coalesce(updated.visibility, 'public')
  );
end $$;
revoke all on function public.save_organiser_event_extras(uuid, jsonb, jsonb, jsonb, text) from public, anon;
grant execute on function public.save_organiser_event_extras(uuid, jsonb, jsonb, jsonb, text) to authenticated;

-- 10. Protected shared crew photos & member profile avatars (private `crew-media` bucket)
alter table public.attendee_crews
  add column if not exists photo_path text;

create table if not exists public.attendee_avatars (
  user_id uuid primary key references auth.users(id) on delete cascade,
  avatar_path text,
  updated_at timestamptz not null default clock_timestamp()
);
alter table public.attendee_avatars enable row level security;
revoke all on public.attendee_avatars from public, anon, authenticated;

create or replace function public.set_crew_photo(p_crew_id uuid, p_photo_path text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.attendee_crew_members
    where crew_id = p_crew_id and user_id = actor and is_owner = true
  ) then
    raise exception 'Only the crew owner can update the crew photo' using errcode = '42501';
  end if;
  if p_photo_path is not null and p_photo_path not like ('crews/' || p_crew_id::text || '/%') then
    raise exception 'Invalid crew photo path' using errcode = '22023';
  end if;
  update public.attendee_crews
    set photo_path = nullif(btrim(coalesce(p_photo_path, '')), '')
    where id = p_crew_id;
  return jsonb_build_object('ok', true, 'crewId', p_crew_id, 'photoPath', p_photo_path);
end $$;
revoke all on function public.set_crew_photo(uuid, text) from public, anon;
grant execute on function public.set_crew_photo(uuid, text) to authenticated;

create or replace function public.set_my_avatar(p_avatar_path text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if p_avatar_path is not null and p_avatar_path not like ('avatars/' || actor::text || '/%') then
    raise exception 'Invalid avatar path' using errcode = '22023';
  end if;
  insert into public.attendee_avatars(user_id, avatar_path, updated_at)
    values (actor, nullif(btrim(coalesce(p_avatar_path, '')), ''), clock_timestamp())
    on conflict (user_id) do update
      set avatar_path = excluded.avatar_path,
          updated_at = excluded.updated_at;
  return jsonb_build_object('ok', true, 'userId', actor, 'avatarPath', p_avatar_path);
end $$;
revoke all on function public.set_my_avatar(text) from public, anon;
grant execute on function public.set_my_avatar(text) to authenticated;

create or replace function public.get_crew_media(p_crew_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  crew_photo text;
  avatars jsonb;
begin
  if actor is null or not exists (
    select 1 from public.attendee_crew_members
    where crew_id = p_crew_id and user_id = actor
  ) then
    return jsonb_build_object('photoPath', null, 'memberAvatars', '{}'::jsonb);
  end if;

  select c.photo_path into crew_photo
    from public.attendee_crews c
    where c.id = p_crew_id;

  select coalesce(jsonb_object_agg(m.user_id::text, a.avatar_path), '{}'::jsonb)
    into avatars
    from public.attendee_crew_members m
    join public.attendee_avatars a on a.user_id = m.user_id
    where m.crew_id = p_crew_id
      and a.avatar_path is not null;

  return jsonb_build_object(
    'photoPath', crew_photo,
    'memberAvatars', coalesce(avatars, '{}'::jsonb)
  );
end $$;
revoke all on function public.get_crew_media(uuid) from public, anon;
grant execute on function public.get_crew_media(uuid) to authenticated;

-- Private storage bucket + crewmate-scoped RLS on storage.objects
do $$
begin
  insert into storage.buckets (id, name, public)
    values ('crew-media', 'crew-media', false)
    on conflict (id) do nothing;

  execute 'drop policy if exists "crew_media_manage_own_avatar" on storage.objects';
  execute $pol$
    create policy "crew_media_manage_own_avatar"
      on storage.objects
      for all
      to authenticated
      using (
        bucket_id = 'crew-media'
        and (storage.foldername(name))[1] = 'avatars'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
      with check (
        bucket_id = 'crew-media'
        and (storage.foldername(name))[1] = 'avatars'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
  $pol$;

  execute 'drop policy if exists "crew_media_read_crewmate_avatars" on storage.objects';
  execute $pol$
    create policy "crew_media_read_crewmate_avatars"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'crew-media'
        and (storage.foldername(name))[1] = 'avatars'
        and exists (
          select 1
          from public.attendee_crew_members me
          join public.attendee_crew_members mate on mate.crew_id = me.crew_id
          where me.user_id = auth.uid()
            and mate.user_id::text = (storage.foldername(name))[2]
        )
      )
  $pol$;

  execute 'drop policy if exists "crew_media_owner_manage_crew_photo" on storage.objects';
  execute $pol$
    create policy "crew_media_owner_manage_crew_photo"
      on storage.objects
      for all
      to authenticated
      using (
        bucket_id = 'crew-media'
        and (storage.foldername(name))[1] = 'crews'
        and exists (
          select 1 from public.attendee_crew_members m
          where m.crew_id::text = (storage.foldername(name))[2]
            and m.user_id = auth.uid()
            and m.is_owner = true
        )
      )
      with check (
        bucket_id = 'crew-media'
        and (storage.foldername(name))[1] = 'crews'
        and exists (
          select 1 from public.attendee_crew_members m
          where m.crew_id::text = (storage.foldername(name))[2]
            and m.user_id = auth.uid()
            and m.is_owner = true
        )
      )
  $pol$;

  execute 'drop policy if exists "crew_media_members_read_crew_photo" on storage.objects';
  execute $pol$
    create policy "crew_media_members_read_crew_photo"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'crew-media'
        and (storage.foldername(name))[1] = 'crews'
        and exists (
          select 1 from public.attendee_crew_members m
          where m.crew_id::text = (storage.foldername(name))[2]
            and m.user_id = auth.uid()
        )
      )
  $pol$;
exception when others then
  null;
end $$;

notify pgrst, 'reload schema';
commit;
