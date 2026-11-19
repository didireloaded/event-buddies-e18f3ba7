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

-- 3. drop_pin, remove_pin, and list_crew_pins RPCs
create or replace function public.drop_pin(
  p_event_id uuid,
  p_crew_id uuid,
  p_point_id text default null,
  p_x numeric default null,
  p_y numeric default null,
  p_lat numeric default null,
  p_lng numeric default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  member public.attendee_crew_members%rowtype;
  catalogue public.event_sync_catalogue%rowtype;
  now_at timestamptz := clock_timestamp();
  exp_at timestamptz;
  clean_point text := nullif(btrim(coalesce(p_point_id, '')), '');
  rx numeric(6,2) := case when p_x is null then null else round(p_x, 1) end;
  ry numeric(6,2) := case when p_y is null then null else round(p_y, 1) end;
  rlat numeric(9,4) := case when p_lat is null then null else round(p_lat, 4) end;
  rlng numeric(9,4) := case when p_lng is null then null else round(p_lng, 4) end;
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

  select * into catalogue
    from public.event_sync_catalogue
    where event_id = p_event_id;
  if found then
    if clean_point is not null and not (clean_point = any(catalogue.point_ids)) then
      raise exception 'Unknown venue landmark for this event' using errcode = '22023';
    end if;
    exp_at := least(now_at + interval '60 minutes', catalogue.ends_at + interval '2 hours');
  else
    exp_at := now_at + interval '60 minutes';
  end if;

  if exp_at <= now_at then
    raise exception 'Pin sharing has closed for this event' using errcode = '22023';
  end if;

  insert into public.pins(
    event_id, crew_id, user_id, display_name, point_id, x, y, lat, lng, created_at, expires_at
  )
  values (
    p_event_id, p_crew_id, actor, member.display_name, clean_point, rx, ry, rlat, rlng, now_at, exp_at
  )
  on conflict (crew_id, user_id) do update
    set display_name = excluded.display_name,
        point_id = excluded.point_id,
        x = excluded.x,
        y = excluded.y,
        lat = excluded.lat,
        lng = excluded.lng,
        created_at = excluded.created_at,
        expires_at = excluded.expires_at
  returning * into upserted;

  update public.attendee_crew_members
    set point_id = clean_point,
        shared_at = now_at,
        expires_at = exp_at,
        share_generation = share_generation + 1,
        updated_at = now_at
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
    'createdAt', upserted.created_at,
    'expiresAt', upserted.expires_at
  );
end $$;
revoke all on function public.drop_pin(uuid, uuid, text, numeric, numeric, numeric, numeric) from public, anon;
grant execute on function public.drop_pin(uuid, uuid, text, numeric, numeric, numeric, numeric) to authenticated;

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
        shared_at = null,
        expires_at = null,
        share_generation = share_generation + 1,
        updated_at = clock_timestamp()
    where crew_id = p_crew_id and user_id = actor;
  return jsonb_build_object('ok', true, 'crewId', p_crew_id, 'userId', actor);
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
        expires_at = null,
        updated_at = clock_timestamp()
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

notify pgrst, 'reload schema';
commit;
