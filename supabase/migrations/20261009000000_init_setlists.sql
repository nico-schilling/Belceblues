-- Esquema de Belceblues Setlists (aplicado en el proyecto Supabase "Belceblues Setlists").
-- Acceso: la app envía el header x-band-code; las políticas RLS lo validan contra un hash bcrypt.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.band_secret (
  id boolean primary key default true check (id),
  code_hash text not null
);

create or replace function public.band_ok()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  code text := coalesce(current_setting('request.headers', true)::json ->> 'x-band-code', '');
  h text;
begin
  if code = '' then
    return false;
  end if;
  select code_hash into h from private.band_secret where id;
  return h is not null and h = extensions.crypt(code, h);
end;
$$;

create or replace function public.check_band_code()
returns boolean
language sql
stable
set search_path = ''
as $$ select public.band_ok(); $$;

grant execute on function public.band_ok() to anon, authenticated;
grant execute on function public.check_band_code() to anon, authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  spotify_id text unique,
  title text not null,
  artist text not null default '',
  album text,
  year int,
  duration_ms int,
  image_url text,
  spotify_url text,
  playlist_position int,
  added_at timestamptz,
  in_playlist boolean not null default true,
  default_key text,
  notes text,
  energy smallint not null default 3 check (energy between 1 and 5),
  style text,
  moods text[] not null default '{}',
  danceable boolean not null default false,
  well_known boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date,
  venue text,
  notes text,
  audience jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.setlist_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  position int not null,
  kind text not null default 'song' check (kind in ('song', 'break')),
  song_id uuid references public.songs(id) on delete set null,
  song_key text,
  transition_type text,
  transition text,
  notes text,
  label text,
  created_at timestamptz not null default now()
);
create index setlist_items_event_idx on public.setlist_items (event_id, position);
create index setlist_items_song_idx on public.setlist_items (song_id);

create table public.settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);

create trigger songs_touch before update on public.songs for each row execute function public.touch_updated_at();
create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.settings for each row execute function public.touch_updated_at();

alter table public.songs enable row level security;
alter table public.events enable row level security;
alter table public.setlist_items enable row level security;
alter table public.settings enable row level security;

create policy "banda" on public.songs for all to anon, authenticated
  using ((select public.band_ok())) with check ((select public.band_ok()));
create policy "banda" on public.events for all to anon, authenticated
  using ((select public.band_ok())) with check ((select public.band_ok()));
create policy "banda" on public.setlist_items for all to anon, authenticated
  using ((select public.band_ok())) with check ((select public.band_ok()));
create policy "banda" on public.settings for all to anon, authenticated
  using ((select public.band_ok())) with check ((select public.band_ok()));

grant select, insert, update, delete on public.songs, public.events, public.setlist_items, public.settings to anon, authenticated;

-- Para fijar o cambiar el código de banda (ejecutar en el SQL Editor de Supabase):
-- insert into private.band_secret (id, code_hash) values (true, extensions.crypt('NUEVO-CODIGO', extensions.gen_salt('bf')))
-- on conflict (id) do update set code_hash = excluded.code_hash;
