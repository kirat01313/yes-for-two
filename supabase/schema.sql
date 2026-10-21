create table if not exists public.destinations (
  id            bigint generated always as identity primary key,
  name_en       text not null,
  name_pt       text not null,
  country_en    text not null,
  country_pt    text not null,
  wikipedia_en  text not null,
  wikipedia_pt  text not null,
  image         text,
  lat           double precision not null,
  lon           double precision not null,
  flight        integer not null check (flight >= 0),
  night         integer not null check (night >= 0),
  phrase_en     text not null,
  phrase_pt     text not null,
  types         text[] not null,
  region        text not null check (region in ('portugal', 'europe', 'beyond'))
);

create table if not exists public.memories (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type        text not null check (type in ('restaurant', 'experience', 'trip')),
  name        text not null,
  category    text not null default '',
  place       text not null default '',
  nights      smallint check (nights > 0),
  price       integer check (price >= 0),
  icon        text not null,
  image       text,
  lat         double precision not null,
  lon         double precision not null,
  date        date not null default current_date,
  went        boolean not null default false,
  note        text not null default '' check (char_length(note) <= 280),
  origin      text not null default 'draw' check (origin in ('draw', 'manual')),
  created_at  timestamptz not null default now()
);

create index if not exists memories_user_id on public.memories (user_id);

create table if not exists public.photos (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  memory_id   bigint not null references public.memories (id) on delete cascade,
  path        text not null,
  caption     text not null default '' check (char_length(caption) <= 140),
  created_at  timestamptz not null default now()
);

create index if not exists photos_memory_id on public.photos (memory_id);

alter table public.destinations enable row level security;
alter table public.memories enable row level security;
alter table public.photos enable row level security;

drop policy if exists "destinations: public read" on public.destinations;
create policy "destinations: public read"
  on public.destinations for select
  using (true);

drop policy if exists "memories: read own" on public.memories;
create policy "memories: read own"
  on public.memories for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "memories: create own" on public.memories;
create policy "memories: create own"
  on public.memories for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "memories: update own" on public.memories;
create policy "memories: update own"
  on public.memories for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "memories: delete own" on public.memories;
create policy "memories: delete own"
  on public.memories for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "photos: read own" on public.photos;
create policy "photos: read own"
  on public.photos for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "photos: create own" on public.photos;
create policy "photos: create own"
  on public.photos for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "photos: delete own" on public.photos;
create policy "photos: delete own"
  on public.photos for delete to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "photos storage: read own" on storage.objects;
create policy "photos storage: read own"
  on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "photos storage: upload own" on storage.objects;
create policy "photos storage: upload own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "photos storage: delete own" on storage.objects;
create policy "photos storage: delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid()::text));