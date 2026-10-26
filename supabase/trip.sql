alter table public.destinations add column if not exists iata text unique;
alter table public.destinations add column if not exists country_code text;
alter table public.destinations alter column flight set default 0;
alter table public.destinations alter column night set default 0;
alter table public.destinations alter column phrase_en set default '';
alter table public.destinations alter column phrase_pt set default '';

create table if not exists public.country_costs (
  country_code  text primary key,
  night         integer not null check (night > 0),
  region        text not null check (region in ('portugal', 'europe', 'beyond'))
);

alter table public.country_costs enable row level security;

drop policy if exists "country costs: public read" on public.country_costs;
create policy "country costs: public read"
  on public.country_costs for select
  using (true);

insert into public.country_costs (country_code, night, region) values
  ('PT', 90, 'portugal'),
  ('AL', 55, 'europe'), ('AT', 120, 'europe'), ('BA', 55, 'europe'), ('BE', 120, 'europe'),
  ('BG', 55, 'europe'), ('BY', 50, 'europe'), ('CH', 180, 'europe'), ('CZ', 80, 'europe'),
  ('DE', 110, 'europe'), ('DK', 150, 'europe'), ('ES', 100, 'europe'), ('FI', 120, 'europe'),
  ('FR', 130, 'europe'), ('GB', 150, 'europe'), ('GR', 100, 'europe'), ('HR', 100, 'europe'),
  ('HU', 75, 'europe'), ('IE', 150, 'europe'), ('IS', 190, 'europe'), ('IT', 120, 'europe'),
  ('LT', 75, 'europe'), ('LU', 150, 'europe'), ('LV', 75, 'europe'), ('MD', 50, 'europe'),
  ('ME', 70, 'europe'), ('MT', 110, 'europe'), ('NL', 150, 'europe'), ('NO', 160, 'europe'),
  ('PL', 75, 'europe'), ('RO', 65, 'europe'), ('RS', 60, 'europe'), ('RU', 70, 'europe'),
  ('SE', 140, 'europe'), ('SI', 95, 'europe'), ('SK', 75, 'europe'), ('TR', 70, 'europe'),
  ('AE', 130, 'beyond'), ('AM', 60, 'beyond'), ('AO', 120, 'beyond'), ('AR', 70, 'beyond'),
  ('AU', 140, 'beyond'), ('AZ', 70, 'beyond'), ('BR', 70, 'beyond'), ('CA', 150, 'beyond'),
  ('CD', 120, 'beyond'), ('CL', 90, 'beyond'), ('CN', 70, 'beyond'), ('CO', 60, 'beyond'),
  ('CR', 90, 'beyond'), ('CV', 80, 'beyond'), ('DO', 90, 'beyond'), ('EG', 50, 'beyond'),
  ('GE', 55, 'beyond'), ('GW', 60, 'beyond'), ('HK', 140, 'beyond'), ('ID', 50, 'beyond'),
  ('IN', 50, 'beyond'), ('JP', 110, 'beyond'), ('KG', 45, 'beyond'), ('KR', 100, 'beyond'),
  ('KZ', 60, 'beyond'), ('LK', 50, 'beyond'), ('MA', 60, 'beyond'), ('MO', 130, 'beyond'),
  ('MU', 120, 'beyond'), ('MV', 200, 'beyond'), ('MX', 80, 'beyond'), ('MY', 55, 'beyond'),
  ('MZ', 90, 'beyond'), ('NG', 90, 'beyond'), ('NP', 40, 'beyond'), ('PA', 90, 'beyond'),
  ('PE', 65, 'beyond'), ('QA', 120, 'beyond'), ('SC', 200, 'beyond'), ('ST', 90, 'beyond'),
  ('TH', 50, 'beyond'), ('TN', 55, 'beyond'), ('TZ', 100, 'beyond'), ('US', 170, 'beyond'),
  ('UY', 90, 'beyond'), ('UZ', 50, 'beyond'), ('VE', 60, 'beyond'), ('VN', 40, 'beyond'),
  ('ZA', 80, 'beyond')
on conflict (country_code) do update set night = excluded.night, region = excluded.region;
