-- Applied through the existing project's Lovable Cloud SQL editor.
-- Source event IDs and hours come from getDemoData(), exported on 17 November 2026.
-- Additive setup. No existing records or authentication settings are removed.
begin;
create table if not exists public.event_sync_catalogue (
  event_id uuid primary key,
  artist_ids text[] not null,
  point_ids text[] not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at)
);
alter table public.event_sync_catalogue enable row level security;
drop policy if exists catalogue_read on public.event_sync_catalogue;
create policy catalogue_read on public.event_sync_catalogue for select to anon, authenticated using (true);
revoke all on public.event_sync_catalogue from anon, authenticated;
grant select on public.event_sync_catalogue to anon, authenticated;
insert into public.event_sync_catalogue values ('20000000-0000-4000-8000-000000000002',array['shimza','buddykev','celso-fabbri','donbey','dreas','kandy','kaytee','mapiiano','pequenogang','xduppy','faffa-bruwer','hartbeat','housecat','hugo','lmt','lazarusman','nam-got-funk','alu','kurt-april','maps','macky','shafa','skelm','timo-odv','yd-fresh']::text[],array['sos-main','sos-afro','sos-jetty','sos-poi-1','sos-poi-2','sos-poi-3','sos-poi-4','sos-poi-5','sos-poi-6','sos-poi-7','sos-poi-8','sos-poi-9','sos-poi-10','sos-poi-11','sos-poi-12','sos-poi-13','sos-poi-14','sos-poi-15','sos-poi-16','sos-poi-17','sos-poi-18','sos-poi-19','sos-poi-20','sos-poi-21','sos-poi-22','sos-poi-23','sos-poi-24','sos-poi-25','sos-poi-26','sos-poi-27','sos-poi-28','sos-poi-29','sos-poi-30','sos-poi-31','sos-poi-32','sos-poi-33','sos-poi-34','sos-poi-35','sos-poi-36','sos-poi-37','sos-poi-38']::text[],'2026-12-28T10:00:00.000Z','2026-12-28T21:00:00.000Z')
on conflict (event_id) do update set artist_ids=excluded.artist_ids, point_ids=excluded.point_ids, starts_at=excluded.starts_at, ends_at=excluded.ends_at;

create or replace function public.valid_attendee_selection(p_event_id uuid, p_artists text[], p_meeting jsonb)
returns boolean language plpgsql stable security invoker set search_path = '' as $fn$
declare catalogue public.event_sync_catalogue%rowtype; meeting_at timestamptz;
begin
  select * into catalogue from public.event_sync_catalogue where event_id=p_event_id;
  if not found or p_artists is null or cardinality(p_artists)>50 or array_position(p_artists,null) is not null or not (p_artists <@ catalogue.artist_ids) then return false; end if;
  if p_meeting is null or p_meeting='null'::jsonb then return true; end if;
  if jsonb_typeof(p_meeting) is distinct from 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(p_meeting))<>2 or jsonb_typeof(p_meeting->'pointId') is distinct from 'string' or jsonb_typeof(p_meeting->'at') is distinct from 'string' then return false; end if;
  if not ((p_meeting->>'pointId')=any(catalogue.point_ids)) or length(p_meeting->>'at')>40 or (p_meeting->>'at') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$' then return false; end if;
  meeting_at=(p_meeting->>'at')::timestamptz;
  return meeting_at>=catalogue.starts_at and meeting_at<=catalogue.ends_at;
exception when others then return false;
end;
$fn$;
revoke all on function public.valid_attendee_selection(uuid,text[],jsonb) from public, anon;
grant execute on function public.valid_attendee_selection(uuid,text[],jsonb) to authenticated;

create table if not exists public.attendee_event_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.event_sync_catalogue(event_id),
  saved_artist_ids text[] not null default '{}',
  meeting jsonb,
  revision bigint not null default 0 check (revision>=0),
  updated_at timestamptz not null default now(),
  primary key (user_id,event_id),
  constraint attendee_selection_valid check (public.valid_attendee_selection(event_id,saved_artist_ids,meeting))
);
alter table public.attendee_event_preferences enable row level security;
revoke all on public.attendee_event_preferences from anon, authenticated;
grant select,insert,update,delete on public.attendee_event_preferences to authenticated;
drop policy if exists preferences_select_own on public.attendee_event_preferences;
create policy preferences_select_own on public.attendee_event_preferences for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists preferences_insert_own on public.attendee_event_preferences;
create policy preferences_insert_own on public.attendee_event_preferences for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists preferences_update_own on public.attendee_event_preferences;
create policy preferences_update_own on public.attendee_event_preferences for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists preferences_delete_own on public.attendee_event_preferences;
create policy preferences_delete_own on public.attendee_event_preferences for delete to authenticated using ((select auth.uid())=user_id);

create table if not exists public.attendee_preference_actions (
  user_id uuid not null,
  event_id uuid not null,
  action_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id,event_id,action_id),
  foreign key (user_id,event_id) references public.attendee_event_preferences(user_id,event_id) on delete cascade
);
alter table public.attendee_preference_actions enable row level security;
revoke all on public.attendee_preference_actions from anon, authenticated;
grant select,insert on public.attendee_preference_actions to authenticated;
drop policy if exists actions_select_own on public.attendee_preference_actions;
create policy actions_select_own on public.attendee_preference_actions for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists actions_insert_own on public.attendee_preference_actions;
create policy actions_insert_own on public.attendee_preference_actions for insert to authenticated with check ((select auth.uid())=user_id);

create or replace function public.apply_attendee_action(p_event_id uuid,p_action_id uuid,p_action jsonb)
returns public.attendee_event_preferences language plpgsql security invoker set search_path = '' as $fn$
declare actor uuid=auth.uid(); current_row public.attendee_event_preferences%rowtype; edit jsonb; next_artists text[]; next_meeting jsonb; accepted uuid;
begin
  if actor is null then raise exception 'Sign in to save account preferences' using errcode='42501'; end if;
  if p_action_id is null or jsonb_typeof(p_action) is distinct from 'object' or octet_length(p_action::text)>16000 or exists(select 1 from jsonb_object_keys(p_action) k where k not in ('artists','meeting')) then raise exception 'Invalid preference action' using errcode='22023'; end if;
  if not exists(select 1 from public.event_sync_catalogue where event_id=p_event_id) then raise exception 'Unknown event' using errcode='22023'; end if;
  insert into public.attendee_event_preferences(user_id,event_id) values(actor,p_event_id) on conflict do nothing;
  select * into current_row from public.attendee_event_preferences where user_id=actor and event_id=p_event_id for update;
  insert into public.attendee_preference_actions(user_id,event_id,action_id) values(actor,p_event_id,p_action_id) on conflict do nothing returning action_id into accepted;
  if accepted is null then return current_row; end if;
  next_artists=current_row.saved_artist_ids;
  next_meeting=current_row.meeting;
  if p_action ? 'artists' then
    if jsonb_typeof(p_action->'artists') is distinct from 'array' or jsonb_array_length(p_action->'artists')>50 then raise exception 'Invalid artist edits' using errcode='22023'; end if;
    for edit in select * from jsonb_array_elements(p_action->'artists') loop
      if jsonb_typeof(edit) is distinct from 'object' or jsonb_typeof(edit->'id') is distinct from 'string' or jsonb_typeof(edit->'saved') is distinct from 'boolean' or (select count(*) from jsonb_object_keys(edit))<>2 then raise exception 'Invalid artist edit' using errcode='22023'; end if;
      if not exists(select 1 from public.event_sync_catalogue where event_id=p_event_id and (edit->>'id')=any(artist_ids)) then raise exception 'Unknown artist' using errcode='22023'; end if;
      next_artists=array_remove(next_artists,edit->>'id');
      if (edit->>'saved')::boolean then next_artists=array_append(next_artists,edit->>'id'); end if;
    end loop;
  end if;
  if p_action ? 'meeting' then next_meeting=nullif(p_action->'meeting','null'::jsonb); end if;
  if not public.valid_attendee_selection(p_event_id,next_artists,next_meeting) then raise exception 'Invalid favourite or meeting details' using errcode='22023'; end if;
  update public.attendee_event_preferences set saved_artist_ids=next_artists,meeting=next_meeting,revision=revision+1,updated_at=clock_timestamp() where user_id=actor and event_id=p_event_id returning * into current_row;
  return current_row;
end;
$fn$;
revoke all on function public.apply_attendee_action(uuid,uuid,jsonb) from public, anon;
grant execute on function public.apply_attendee_action(uuid,uuid,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
