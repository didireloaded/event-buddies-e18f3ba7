-- Transaction-scoped integration and authorisation tests. No fixture records persist.
begin;
insert into auth.users(id) values ('e1111111-1111-4111-8111-111111111111'),('e2222222-2222-4222-8222-222222222222'),('e3333333-3333-4333-8333-333333333333'),('e4444444-4444-4444-8444-444444444444');
set local role authenticated;
do $$
declare event uuid='20000000-0000-4000-8000-000000000002'; a uuid='e1111111-1111-4111-8111-111111111111'; b uuid='e2222222-2222-4222-8222-222222222222'; c uuid='e3333333-3333-4333-8333-333333333333'; d uuid='e4444444-4444-4444-8444-444444444444';
 result jsonb; repeated jsonb; state jsonb; crew text; code text; request uuid=gen_random_uuid(); i integer;
begin
 perform set_config('request.jwt.claim.sub',a::text,true);
 result=public.attendee_crew_command(event,request,'{"op":"create","name":"QA private crew","displayName":"QA Alice"}');
 repeated=public.attendee_crew_command(event,request,'{"op":"create","name":"QA private crew","displayName":"QA Alice"}');
 if result<>repeated or not (result->>'ok')::boolean then raise exception 'Create replay failed'; end if;
 code=result->>'invite'; state=public.attendee_crew_state(event); crew=state->>'id';
 if jsonb_array_length(state->'members')<>1 then raise exception 'Creator membership failed'; end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 if public.attendee_crew_state(event)<>'null'::jsonb then raise exception 'Outsider read failed'; end if;
 begin
  perform public.attendee_crew_command(event,gen_random_uuid(),jsonb_build_object('op','meeting','crewId',crew,'revision',0,'meeting',null));
  raise exception 'Outsider write allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.attendee_crew_members(crew_id,event_id,user_id,display_name) values(crew::uuid,event,b,'intruder');
  raise exception 'Direct self-join allowed';
 exception when insufficient_privilege then null; end;
 result=public.attendee_crew_command(event,gen_random_uuid(),jsonb_build_object('op','join','code',code,'displayName','QA Bob'));
 if not (result->>'ok')::boolean or jsonb_array_length(public.attendee_crew_state(event)->'members')<>2 then raise exception 'Join failed'; end if;
 begin
  perform public.attendee_crew_command(event,gen_random_uuid(),jsonb_build_object('op','invite','crewId',crew));
  raise exception 'Member rotated invite';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub',a::text,true);
 result=public.attendee_crew_command(event,gen_random_uuid(),jsonb_build_object('op','meeting','crewId',crew,'revision',0,'meeting',jsonb_build_object('pointId','sos-main','at','2026-12-28T17:30:00+02:00')));
 if not (result->>'ok')::boolean then raise exception 'Meeting failed'; end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 state=public.attendee_crew_state(event);
 if state->'meeting'->>'pointId'<>'sos-main' then raise exception 'Shared meeting read failed'; end if;
 result=public.attendee_crew_command(event,gen_random_uuid(),jsonb_build_object('op','meeting','crewId',crew,'revision',0,'meeting',null));
 if (result->>'ok')::boolean then raise exception 'Meeting conflict accepted'; end if;
 begin
  perform public.attendee_crew_command(event,gen_random_uuid(),jsonb_build_object('op','meeting','crewId',crew,'revision',1,'meeting',jsonb_build_object('pointId','unknown','at','2026-12-28T17:30:00+02:00')));
  raise exception 'Invalid venue point accepted';
 exception when invalid_parameter_value then null; end;
 perform set_config('request.jwt.claim.sub',a::text,true);
 result=public.attendee_crew_command(event,gen_random_uuid(),jsonb_build_object('op','share','crewId',crew,'generation',0,'pointId','sos-main','sentAt',clock_timestamp()));
 if not (result->>'ok')::boolean then raise exception 'Pin share failed'; end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 state=public.attendee_crew_state(event);
 if not exists(select 1 from jsonb_array_elements(state->'members') m where m->>'id'=a::text and m->>'pointId'='sos-main') then raise exception 'Crew pin not visible'; end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform public.attendee_crew_command(event,gen_random_uuid(),jsonb_build_object('op','stop','crewId',crew));
 result=public.attendee_crew_command(event,gen_random_uuid(),jsonb_build_object('op','share','crewId',crew,'generation',0,'pointId','sos-main','sentAt',clock_timestamp()));
 if (result->>'ok')::boolean then raise exception 'Old pin revived after stop'; end if;
 result=public.attendee_crew_command(event,gen_random_uuid(),jsonb_build_object('op','share','crewId',crew,'generation',1,'pointId','sos-main','sentAt',clock_timestamp()-interval '2 hours'));
 if (result->>'ok')::boolean then raise exception 'Expired queued pin accepted'; end if;
 perform public.attendee_crew_command(event,gen_random_uuid(),jsonb_build_object('op','leave','crewId',crew));
 if public.attendee_crew_state(event)<>'null'::jsonb then raise exception 'Former member retained read access'; end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 state=public.attendee_crew_state(event);
 if not (state->'members'->0->>'owner')::boolean then raise exception 'Owner transfer failed'; end if;
 perform set_config('request.jwt.claim.sub',c::text,true);
 result=public.attendee_crew_command(event,gen_random_uuid(),jsonb_build_object('op','join','code',code,'displayName','QA Charlie'));
 if (result->>'ok')::boolean then raise exception 'Revoked owner invite accepted'; end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 result=public.attendee_crew_command(event,gen_random_uuid(),jsonb_build_object('op','invite','crewId',crew));code=result->>'invite';
 perform set_config('request.jwt.claim.sub',c::text,true);
 result=public.attendee_crew_command(event,gen_random_uuid(),jsonb_build_object('op','join','code',code,'displayName','QA Charlie'));
 if not (result->>'ok')::boolean then raise exception 'Replacement invite failed'; end if;
 perform set_config('request.jwt.claim.sub',d::text,true);
 for i in 1..11 loop result=public.attendee_crew_command(event,gen_random_uuid(),jsonb_build_object('op','join','code',gen_random_uuid(),'displayName','QA Delta')); end loop;
 if result->>'error' not like 'Too many attempts%' then raise exception 'Invite rate limit failed'; end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 perform public.attendee_crew_command(event,gen_random_uuid(),jsonb_build_object('op','leave','crewId',crew));
 perform set_config('request.jwt.claim.sub',c::text,true);
 perform public.attendee_crew_command(event,gen_random_uuid(),jsonb_build_object('op','leave','crewId',crew));
 if public.attendee_crew_state(event)<>'null'::jsonb then raise exception 'Final leave failed'; end if;
end $$;
reset role;
select 'PASS: create/join/replay, member-only reads/writes, direct-join denial, shared meetings, version conflicts, pin expiry and revocation, owner transfer, invite revocation/rate limits, leave' as verification;
rollback;
