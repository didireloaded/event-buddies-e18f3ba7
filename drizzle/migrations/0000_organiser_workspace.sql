create type public.app_role as enum ('admin');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create table public.organiser_profiles (
  user_id uuid primary key,
  display_name text not null default '' check (char_length(display_name) <= 80),
  organisation text not null default '' check (char_length(organisation) <= 120),
  logo_path text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified','rejected')),
  verification_document_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.organiser_profiles to authenticated;
grant all on public.organiser_profiles to service_role;
alter table public.organiser_profiles enable row level security;
create policy "Own profile read" on public.organiser_profiles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Own profile insert" on public.organiser_profiles for insert to authenticated with check (user_id = auth.uid() and verification_status = 'unverified');
create policy "Own profile update" on public.organiser_profiles for update to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin')) with check (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.guard_organiser_verification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if new.verification_status is distinct from old.verification_status and not public.has_role(auth.uid(),'admin') then
    if not (new.verification_status = 'pending' and old.verification_status in ('unverified','rejected') and new.verification_document_path is not null) then
      raise exception 'Verification status can only be changed by review';
    end if;
  end if;
  return new;
end $$;
create trigger organiser_profiles_guard before update on public.organiser_profiles for each row execute function public.guard_organiser_verification();

create table public.organiser_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  status text not null default 'draft' check (status in ('draft','imported','published')),
  event_type text not null default 'festival' check (event_type in ('festival','conference','corporate')),
  name text not null default '' check (char_length(name) <= 160),
  start_date date,
  end_date date,
  venue text not null default '' check (char_length(venue) <= 200),
  gates_open text not null default '' check (char_length(gates_open) <= 20),
  entry_rules text not null default '' check (char_length(entry_rules) <= 2000),
  program jsonb not null default '[]'::jsonb,
  zones jsonb not null default '[]'::jsonb,
  site_plan_path text,
  source_pdf_path text,
  source_label text,
  extraction_missing text[] not null default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index organiser_events_owner_idx on public.organiser_events(owner_id);
grant select, insert, update, delete on public.organiser_events to authenticated;
grant all on public.organiser_events to service_role;
alter table public.organiser_events enable row level security;
create policy "Owner reads events" on public.organiser_events for select to authenticated using (owner_id = auth.uid());
create policy "Owner inserts events" on public.organiser_events for insert to authenticated with check (owner_id = auth.uid() and status <> 'published');
create policy "Owner updates events" on public.organiser_events for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owner deletes drafts" on public.organiser_events for delete to authenticated using (owner_id = auth.uid() and status <> 'published');

create or replace function public.guard_organiser_publish()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.owner_id := old.owner_id;
  if new.status = 'published' and old.status <> 'published' then
    if coalesce(btrim(new.name),'') = '' or new.start_date is null or new.site_plan_path is null then
      raise exception 'Publishing needs a name, date and site plan';
    end if;
    if not exists (select 1 from public.organiser_profiles where user_id = new.owner_id and verification_status = 'verified') then
      raise exception 'Organiser verification is required before publishing';
    end if;
    new.published_at := now();
  elsif new.status <> 'published' then
    new.published_at := null;
  end if;
  return new;
end $$;
create trigger organiser_events_guard before update on public.organiser_events for each row execute function public.guard_organiser_publish();

create policy "Organiser files read own" on storage.objects for select to authenticated using (bucket_id = 'organiser-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Organiser files insert own" on storage.objects for insert to authenticated with check (bucket_id = 'organiser-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Organiser files update own" on storage.objects for update to authenticated using (bucket_id = 'organiser-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Organiser files delete own" on storage.objects for delete to authenticated using (bucket_id = 'organiser-files' and (storage.foldername(name))[1] = auth.uid()::text);