-- Voz principal (uno o más integrantes) y marca de "cantable" por canción.
alter table public.songs add column if not exists singers text[] not null default '{}';
alter table public.songs add column if not exists singable boolean not null default false;
-- La lista de integrantes se guarda en public.settings con key = 'members' (array JSON de nombres).
