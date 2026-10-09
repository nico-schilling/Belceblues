-- Momentos entre canciones (presentaciones, saludos, uniones…) como ítems del setlist.
alter table public.setlist_items drop constraint if exists setlist_items_kind_check;
alter table public.setlist_items add constraint setlist_items_kind_check check (kind in ('song', 'break', 'cue'));
alter table public.setlist_items add column if not exists speaker text;
