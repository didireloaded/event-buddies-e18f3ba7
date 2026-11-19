-- Real-time crew pin pipe for Event Buddies (Lovable Cloud / Supabase)
-- 1. public.pins table with expires_at, crew_id, user_id, point_id, rounded x/y and optional rounded GPS lat/lng
-- 2. public.drop_pin, public.remove_pin and public.list_crew_pins RPCs (used by drop-pin Edge Function & client)
-- 3. Realtime broadcast trigger on public.pins (pin:upserted / pin:removed on topic crew:{id}:pins) + realtime.messages RLS
-- 4. pg_cron job (cleanup-expired-pins) that deletes expired pins every minute and broadcasts pin:removed

begin;

-- 1. public.pins table
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

-- 2. Realtime broadcast trigger on insert / update / delete of public.pins
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

-- Private channel authorization on realtime.messages for topic crew:{id}:pins
do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute 'drop policy if exists "crew_members_realtime_pins_select" on realtime.messages';
    execute $pol$
      create policy "crew_members_realtime_pins_select"
        on realtime.messages
        for select
        to authenticated
        using (
          exists (
            select 1 from public.attendee_crew_members m
            where ('crew:' || m.crew_id::text || ':pins') = realtime.topic()
              and m.user_id = auth.uid()
          )
        )
    $pol$;
    execute 'drop policy if exists "crew_members_realtime_pins_insert" on realtime.messages';
    execute $pol$
      create policy "crew_members_realtime_pins_insert"
        on realtime.messages
        for insert
        to authenticated
        with check (
          exists (
            select 1 from public.attendee_crew_members m
            where ('crew:' || m.crew_id::text || ':pins') = realtime.topic()
              and m.user_id = auth.uid()
          )
        )
    $pol$;
  end if;
exception when others then
  null;
end $$;

-- Ensure live-GPS metadata columns exist before drop_pin / list_crew_pins reference them
alter table public.pins
  add column if not exists accuracy_m numeric(6,1),
  add column if not exists session_id uuid;

-- 3. drop_pin (server-authoritative expiry), remove_pin, and list_crew_pins RPCs
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
  delete from public.pins
    where crew_id = p_crew_id and user_id = actor;
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

-- 4. Update cleanup_expired_event_data() to delete expired public.pins (firing pin:removed broadcast)
-- and schedule via pg_cron every minute when pg_cron is available
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

-- 5. Optional live-GPS metadata on public.pins (additive, idempotent)
alter table public.pins
  add column if not exists accuracy_m numeric(6,1),
  add column if not exists session_id uuid;

-- 6. public.tickets table for personal ticket copies and map tier unlocks
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

notify pgrst, 'reload schema';
commit;
