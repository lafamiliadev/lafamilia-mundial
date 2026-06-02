-- Referral / viral-loop support: per-participant share handle + attribution.

alter table participants
  add column if not exists slug text,
  add column if not exists referred_by text,
  add column if not exists referral_visits int not null default 0;

-- Backfill slugs for any pre-existing rows (first name + row suffix).
update participants
set slug = lower(regexp_replace(split_part(name, ' ', 1), '[^a-zA-Z0-9]+', '', 'g'))
           || '-' || left(id::text, 4)
where slug is null;

alter table participants alter column slug set not null;

create unique index if not exists idx_participants_slug on participants (slug);
create index if not exists idx_participants_referred_by on participants (referred_by);

-- Atomic visit counter increment (avoids read-modify-write races).
create or replace function increment_referral_visits(p_slug text)
returns void
language sql
as $$
  update participants set referral_visits = referral_visits + 1 where slug = p_slug;
$$;
