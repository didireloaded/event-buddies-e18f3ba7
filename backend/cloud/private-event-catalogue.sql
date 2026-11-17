-- Remove broad catalogue access while preserving owner-scoped preference writes.
-- Run through Lovable Cloud SQL editor.
begin;
drop policy if exists catalogue_read on public.event_sync_catalogue;
revoke all on public.event_sync_catalogue from public, anon, authenticated;
alter table public.event_sync_catalogue enable row level security;
create or replace function public.valid_attendee_selection(p_event_id uuid, p_artists text[], p_meeting jsonb)
returns boolean language plpgsql stable security definer set search_path = '' as $fn$
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

create or replace function public.apply_attendee_action(p_event_id uuid,p_action_id uuid,p_action jsonb)
returns public.attendee_event_preferences language plpgsql security invoker set search_path = '' as $fn$
declare actor uuid=auth.uid(); current_row public.attendee_event_preferences%rowtype; edit jsonb; next_artists text[]; next_meeting jsonb; accepted uuid;
begin
  if actor is null then raise exception 'Sign in to save account preferences' using errcode='42501'; end if;
  if p_action_id is null or jsonb_typeof(p_action) is distinct from 'object' or octet_length(p_action::text)>16000 or exists(select 1 from jsonb_object_keys(p_action) k where k not in ('artists','meeting')) then raise exception 'Invalid preference action' using errcode='22023'; end if;
  if not public.valid_attendee_selection(p_event_id,'{}'::text[],null) then raise exception 'Unknown event' using errcode='22023'; end if;
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
      if not public.valid_attendee_selection(p_event_id,array[edit->>'id'],null) then raise exception 'Unknown artist' using errcode='22023'; end if;
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
