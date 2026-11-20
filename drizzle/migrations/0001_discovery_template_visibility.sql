alter table public.organiser_events
  add column if not exists bar_menus jsonb not null default '[]'::jsonb,
  add column if not exists map_calibration jsonb,
  add column if not exists template_config jsonb,
  add column if not exists visibility text not null default 'public' check (visibility in ('public', 'private_invite'));

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