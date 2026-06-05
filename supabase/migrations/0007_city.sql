-- Optional free-text city for each participant — powers city/chapter community
-- insights (city leaderboards, most-accurate city, etc.). Nullable + additive,
-- so existing entries are unaffected.
alter table participants
  add column if not exists city text;
