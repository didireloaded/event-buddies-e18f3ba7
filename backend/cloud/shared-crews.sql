-- Apply through Lovable Cloud SQL editor. Additive private crew storage.
begin;
create table if not exists public.attendee_crews (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.event_sync_catalogue,
 name text not null check(length(name) between 2 and 60), meeting jsonb,
 revision bigint not null default 0, created_at timestamptz not null default now(),
 check(public.valid_attendee_selection(event_id,'{}',meeting))
);
create table if not exists public.attendee_crew_members (
 crew_id uuid not null references public.attendee_crews on delete cascade,
 event_id uuid not null references public.event_sync_catalogue,
 user_id uuid not null references auth.users on delete cascade,
 display_name text not null check(length(display_name) between 2 and 50),
 is_owner boolean not null default false, joined_at timestamptz not null default clock_timestamp(),
 pin_generation bigint not null default 0, point_id text, expires_at timestamptz,
 primary key(crew_id,user_id), unique(event_id,user_id)
);
create unique index if not exists one_crew_owner on public.attendee_crew_members(crew_id) where is_owner;
create table if not exists public.attendee_crew_invites (
 crew_id uuid primary key references public.attendee_crews on delete cascade,
 verifier text unique not null, expires_at timestamptz not null
);
create table if not exists public.attendee_crew_commands (
 user_id uuid not null references auth.users on delete cascade, request_id uuid not null,
 fingerprint text not null, operation text not null, result jsonb not null,
 created_at timestamptz not null default clock_timestamp(), primary key(user_id,request_id)
);
create index if not exists crew_command_rate on public.attendee_crew_commands(user_id,operation,created_at);
alter table public.attendee_crews enable row level security;
alter table public.attendee_crew_members enable row level security;
alter table public.attendee_crew_invites enable row level security;
alter table public.attendee_crew_commands enable row level security;
-- Every read and mutation goes through caller-checked functions. No direct client table access.
revoke all on public.attendee_crews,public.attendee_crew_members,public.attendee_crew_invites,public.attendee_crew_commands from anon,authenticated;

create or replace function public.attendee_crew_state(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid=auth.uid(); selected public.attendee_crews%rowtype;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select c.* into selected from public.attendee_crews c join public.attendee_crew_members m on m.crew_id=c.id where m.user_id=actor and m.event_id=p_event_id;
 if not found then return 'null'::jsonb; end if;
 return jsonb_build_object('id',selected.id,'name',selected.name,'revision',selected.revision,'meeting',selected.meeting,
 'members',(select jsonb_agg(jsonb_build_object('id',m.user_id,'name',m.display_name,'owner',m.is_owner,'generation',m.pin_generation,
 'pointId',case when m.expires_at>clock_timestamp() then m.point_id else null end,
 'expiresAt',case when m.expires_at>clock_timestamp() then m.expires_at else null end) order by m.joined_at,m.user_id)
 from public.attendee_crew_members m where m.crew_id=selected.id));
end $$;
revoke all on function public.attendee_crew_state(uuid) from public,anon;
grant execute on function public.attendee_crew_state(uuid) to authenticated;

create or replace function public.attendee_crew_command(p_event_id uuid,p_request_id uuid,p_command jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid=auth.uid(); op text; prior public.attendee_crew_commands%rowtype; selected public.attendee_crews%rowtype;
 member public.attendee_crew_members%rowtype; invite public.attendee_crew_invites%rowtype;
 result jsonb; token uuid; expires timestamptz; stamp timestamptz; next_owner uuid; input_name text;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_request_id is null or jsonb_typeof(p_command) is distinct from 'object' or octet_length(p_command::text)>16000 then raise exception 'Invalid command' using errcode='22023'; end if;
 op=p_command->>'op';
 if op is null or op not in ('create','join','invite','meeting','leave','share','stop') then raise exception 'Invalid operation' using errcode='22023'; end if;
 if not exists(select 1 from public.event_sync_catalogue where event_id=p_event_id) then raise exception 'Unknown event' using errcode='22023'; end if;
 -- Serialise requests from one account, including retries and create/join races.
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 select * into prior from public.attendee_crew_commands where user_id=actor and request_id=p_request_id;
 if found then
  if prior.fingerprint<>md5(p_event_id::text||p_command::text) then raise exception 'Request ID reused' using errcode='22023'; end if;
  return prior.result;
 end if;
 select * into member from public.attendee_crew_members where user_id=actor and event_id=p_event_id;
 if op in ('create','join') then
  input_name=btrim(p_command->>'displayName');
  if input_name is null or length(input_name) not between 2 and 50 then raise exception 'Invalid attendee name' using errcode='22023'; end if;
  if member.user_id is not null then result=jsonb_build_object('ok',false,'error','Leave your current crew before joining another.');
  elsif (select count(*) from public.attendee_crew_commands where user_id=actor and operation=op and created_at>clock_timestamp()-interval '1 minute')>=10 then result=jsonb_build_object('ok',false,'error','Too many attempts. Wait a minute and retry.');
  elsif op='create' then
   if length(btrim(p_command->>'name')) not between 2 and 60 or p_command->>'name' is null then raise exception 'Invalid crew name' using errcode='22023'; end if;
   insert into public.attendee_crews(event_id,name) values(p_event_id,btrim(p_command->>'name')) returning * into selected;
   insert into public.attendee_crew_members(crew_id,event_id,user_id,display_name,is_owner) values(selected.id,p_event_id,actor,input_name,true);
   token=gen_random_uuid();
   select least(clock_timestamp()+interval '7 days',ends_at+interval '2 hours') into expires from public.event_sync_catalogue where event_id=p_event_id;
   insert into public.attendee_crew_invites values(selected.id,md5(token::text),expires);
   result=jsonb_build_object('ok',true,'invite',token,'expiresAt',expires);
  else
   select i.* into invite from public.attendee_crew_invites i join public.attendee_crews c on c.id=i.crew_id where i.verifier=md5(lower(btrim(p_command->>'code'))) and c.event_id=p_event_id and i.expires_at>clock_timestamp();
   if not found then result=jsonb_build_object('ok',false,'error','This invite is invalid or expired. Ask the crew owner for a new code.');
   else
    select * into selected from public.attendee_crews where id=invite.crew_id for update;
    if not found or not exists(select 1 from public.attendee_crew_invites where crew_id=selected.id and verifier=invite.verifier and expires_at>clock_timestamp()) then result=jsonb_build_object('ok',false,'error','This invite has expired. Ask for a new code.');
    elsif (select count(*) from public.attendee_crew_members where crew_id=selected.id)>=100 then result=jsonb_build_object('ok',false,'error','This crew has reached its member limit.');
    else
     insert into public.attendee_crew_members(crew_id,event_id,user_id,display_name) values(selected.id,p_event_id,actor,input_name);
     result=jsonb_build_object('ok',true);
    end if;
   end if;
  end if;
 else
  if member.user_id is null or member.crew_id::text is distinct from p_command->>'crewId' then raise exception 'Crew membership required' using errcode='42501'; end if;
  select * into selected from public.attendee_crews where id=member.crew_id for update;
  -- Recheck membership after acquiring the crew lock.
  select * into member from public.attendee_crew_members where crew_id=selected.id and user_id=actor;
  if not found then raise exception 'Crew membership required' using errcode='42501'; end if;
  if op='invite' then
   if not member.is_owner then raise exception 'Only the owner can replace the invite' using errcode='42501'; end if;
   token=gen_random_uuid();
   select least(clock_timestamp()+interval '7 days',ends_at+interval '2 hours') into expires from public.event_sync_catalogue where event_id=p_event_id;
   insert into public.attendee_crew_invites values(selected.id,md5(token::text),expires) on conflict(crew_id) do update set verifier=excluded.verifier,expires_at=excluded.expires_at;
   result=jsonb_build_object('ok',true,'invite',token,'expiresAt',expires);
  elsif op='meeting' then
   if (p_command->>'revision')::bigint is distinct from selected.revision then result=jsonb_build_object('ok',false,'error','The crew plan changed. Review the latest meeting and try again.');
   elsif not (p_command ? 'meeting') or not public.valid_attendee_selection(p_event_id,'{}',p_command->'meeting') then raise exception 'Invalid meeting' using errcode='22023';
   else
    update public.attendee_crews set meeting=nullif(p_command->'meeting','null'::jsonb),revision=revision+1 where id=selected.id;
    result=jsonb_build_object('ok',true);
   end if;
  elsif op='share' then
   stamp=(p_command->>'sentAt')::timestamptz;
   select least(stamp+interval '1 hour',ends_at+interval '2 hours') into expires from public.event_sync_catalogue where event_id=p_event_id;
   if (p_command->>'generation')::bigint is distinct from member.pin_generation or stamp is null or stamp>clock_timestamp()+interval '1 minute' or expires<=clock_timestamp() or not exists(select 1 from public.event_sync_catalogue where event_id=p_event_id and (p_command->>'pointId')=any(point_ids)) then result=jsonb_build_object('ok',false,'error','This pin expired or sharing changed. Choose the landmark again.');
   else
    update public.attendee_crew_members set point_id=p_command->>'pointId',expires_at=expires where crew_id=selected.id and user_id=actor;
    result=jsonb_build_object('ok',true);
   end if;
  elsif op='stop' then
   update public.attendee_crew_members set point_id=null,expires_at=null,pin_generation=pin_generation+1 where crew_id=selected.id and user_id=actor;
   result=jsonb_build_object('ok',true);
  elsif op='leave' then
   delete from public.attendee_crew_members where crew_id=selected.id and user_id=actor;
   if not exists(select 1 from public.attendee_crew_members where crew_id=selected.id) then delete from public.attendee_crews where id=selected.id;
   elsif member.is_owner then
    select user_id into next_owner from public.attendee_crew_members where crew_id=selected.id order by joined_at,user_id limit 1;
    update public.attendee_crew_members set is_owner=true where crew_id=selected.id and user_id=next_owner;
    delete from public.attendee_crew_invites where crew_id=selected.id;
   end if;
   result=jsonb_build_object('ok',true);
  end if;
 end if;
 insert into public.attendee_crew_commands(user_id,request_id,fingerprint,operation,result) values(actor,p_request_id,md5(p_event_id::text||p_command::text),op,result);
 return result;
end $$;
revoke all on function public.attendee_crew_command(uuid,uuid,jsonb) from public,anon;
grant execute on function public.attendee_crew_command(uuid,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
