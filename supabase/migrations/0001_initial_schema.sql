-- World Scoreboard Arcade — Initial Schema, RLS, Views, Indexes, and RPCs
-- Run in Supabase SQL Editor or via `supabase db push`

create extension if not exists pgcrypto;

-- 1. Profiles (private + public columns; direct reads restricted to owner via RLS)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  username_display text not null,
  name text,
  birth_year smallint not null check (birth_year between 1900 and 2100),
  country_code char(2) not null,
  country_name text not null,
  state_name text,
  district_name text,
  state_source text not null default 'list' check (state_source in ('list', 'custom', 'none')),
  district_source text not null default 'list' check (district_source in ('list', 'custom', 'none')),
  is_banned boolean not null default false,
  is_seed boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create unique index if not exists idx_profiles_username_lower on public.profiles (lower(username));
create index if not exists idx_profiles_country_code on public.profiles (country_code) where is_banned = false;
create index if not exists idx_profiles_is_seed on public.profiles (is_seed) where is_seed = true;

-- 2. Games catalog & plausibility bounds
create table if not exists public.games (
  slug text primary key,
  name text not null,
  score_direction text not null check (score_direction in ('higher', 'lower')),
  unit text not null,
  min_valid numeric not null,
  max_valid numeric not null,
  min_ms_per_unit numeric not null default 0,
  min_duration_ms integer not null default 0,
  is_active boolean not null default true
);

-- 3. Scores (one best score per player per game)
create table if not exists public.scores (
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_slug text not null references public.games(slug) on delete cascade,
  best_score numeric not null,
  plays integer not null default 1 check (plays >= 1),
  achieved_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_slug)
);

-- Direction-aware composite indexes for keyset pagination
create index if not exists idx_scores_higher
  on public.scores (game_slug, best_score desc, achieved_at asc, user_id asc);

create index if not exists idx_scores_lower
  on public.scores (game_slug, best_score asc, achieved_at asc, user_id asc);

create index if not exists idx_scores_user_id on public.scores (user_id);

-- 4. Server-tracked game sessions for anti-cheat
create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_slug text not null references public.games(slug) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'rejected', 'expired')),
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_game_sessions_user_game on public.game_sessions (user_id, game_slug, started_at desc);

-- 5. Login attempts (lockout tracking: 5 fails / 15 min)
create table if not exists public.login_attempts (
  id bigserial primary key,
  username text not null,
  ip_hash text not null,
  succeeded boolean not null default false,
  attempted_at timestamptz not null default now()
);

create index if not exists idx_login_attempts_username_time on public.login_attempts (lower(username), attempted_at desc);
create index if not exists idx_login_attempts_ip_time on public.login_attempts (ip_hash, attempted_at desc);

-- 6. Postgres fallback rate-limit table
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 1,
  window_start timestamptz not null default now()
);

-- 7. Moderation reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  game_slug text references public.games(slug) on delete set null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create index if not exists idx_reports_status on public.reports (status, created_at desc);

-- 8. Admin users
create table if not exists public.admin_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 9. Suspicious submissions log (server-only)
create table if not exists public.suspicious_submissions (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete set null,
  game_slug text,
  session_id uuid,
  submitted_score numeric,
  reason text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Public Views (explicitly expose only non-PII columns)
-- ============================================================================

create or replace view public.public_profiles as
  select
    id,
    username,
    username_display,
    country_code,
    country_name,
    created_at
  from public.profiles
  where is_banned = false;

create or replace view public.country_player_counts as
  select
    country_code,
    country_name,
    count(*)::integer as player_count
  from public.profiles
  where is_banned = false
  group by country_code, country_name;

create or replace view public.arcade_stats as
  select
    (select count(*)::integer from public.profiles where is_banned = false) as total_players,
    (select count(*)::integer from public.scores s join public.profiles p on p.id = s.user_id where p.is_banned = false) as total_scores,
    (select coalesce(sum(s.plays), 0)::bigint from public.scores s join public.profiles p on p.id = s.user_id where p.is_banned = false) as total_plays;

grant select on public.public_profiles to anon, authenticated;
grant select on public.country_player_counts to anon, authenticated;
grant select on public.arcade_stats to anon, authenticated;

-- ============================================================================
-- Row Level Security (enabled on EVERY table)
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.scores enable row level security;
alter table public.game_sessions enable row level security;
alter table public.login_attempts enable row level security;
alter table public.rate_limits enable row level security;
alter table public.reports enable row level security;
alter table public.admin_users enable row level security;
alter table public.suspicious_submissions enable row level security;

-- profiles: only the owner can read their own full profile; no direct client writes
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- games: public read-only
drop policy if exists "games_select_all" on public.games;
create policy "games_select_all"
  on public.games for select
  to anon, authenticated
  using (is_active = true);

-- scores: public read-only for non-banned users; NO direct client writes
drop policy if exists "scores_select_public" on public.scores;
create policy "scores_select_public"
  on public.scores for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = scores.user_id and p.is_banned = false
    )
  );

-- game_sessions: no direct client access (server route handlers use service role)
-- login_attempts: no direct client access
-- rate_limits: no direct client access
-- suspicious_submissions: no direct client access
-- admin_users: authenticated users can only check if they themselves are admin
drop policy if exists "admin_users_select_self" on public.admin_users;
create policy "admin_users_select_self"
  on public.admin_users for select
  to authenticated
  using (auth.uid() = user_id);

-- reports: authenticated users can insert a report for themselves as reporter, cannot read others
drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
  on public.reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- ============================================================================
-- Server-only RPC functions (SECURITY DEFINER)
-- ============================================================================

create or replace function public.submit_score(
  p_user_id uuid,
  p_game_slug text,
  p_score numeric
)
returns table (
  is_new_best boolean,
  best_score numeric,
  plays integer,
  achieved_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_direction text;
  v_existing public.scores%rowtype;
  v_is_better boolean;
  v_now timestamptz := now();
begin
  select g.score_direction into v_direction
  from public.games g
  where g.slug = p_game_slug and g.is_active = true;

  if v_direction is null then
    raise exception 'Unknown or inactive game: %', p_game_slug;
  end if;

  select * into v_existing
  from public.scores s
  where s.user_id = p_user_id and s.game_slug = p_game_slug
  for update;

  if not found then
    insert into public.scores (user_id, game_slug, best_score, plays, achieved_at, updated_at)
    values (p_user_id, p_game_slug, p_score, 1, v_now, v_now);

    return query select true, p_score, 1, v_now;
    return;
  end if;

  if v_direction = 'higher' then
    v_is_better := p_score > v_existing.best_score;
  else
    v_is_better := p_score < v_existing.best_score;
  end if;

  if v_is_better then
    update public.scores
    set
      best_score = p_score,
      plays = v_existing.plays + 1,
      achieved_at = v_now,
      updated_at = v_now
    where user_id = p_user_id and game_slug = p_game_slug;

    return query select true, p_score, v_existing.plays + 1, v_now;
  else
    update public.scores
    set
      plays = v_existing.plays + 1,
      updated_at = v_now
    where user_id = p_user_id and game_slug = p_game_slug;

    return query select false, v_existing.best_score, v_existing.plays + 1, v_existing.achieved_at;
  end if;
end;
$$;

-- Restrict submit_score so only service_role can call it
revoke all on function public.submit_score(uuid, text, numeric) from public;
revoke all on function public.submit_score(uuid, text, numeric) from anon, authenticated;
grant execute on function public.submit_score(uuid, text, numeric) to service_role;

-- Compute a player's exact rank (direction-aware, tie-broken by earlier achieved_at then user_id)
create or replace function public.get_player_rank(
  p_game_slug text,
  p_user_id uuid,
  p_country_code text default null
)
returns table (
  rank bigint,
  total_players bigint,
  best_score numeric,
  plays integer,
  achieved_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_direction text;
  v_score numeric;
  v_achieved timestamptz;
  v_plays integer;
  v_better bigint;
  v_total bigint;
begin
  select g.score_direction into v_direction
  from public.games g
  where g.slug = p_game_slug;

  if v_direction is null then
    return;
  end if;

  select s.best_score, s.achieved_at, s.plays
  into v_score, v_achieved, v_plays
  from public.scores s
  join public.profiles p on p.id = s.user_id
  where s.game_slug = p_game_slug
    and s.user_id = p_user_id
    and p.is_banned = false;

  if not found then
    return;
  end if;

  select count(*) into v_total
  from public.scores s
  join public.profiles p on p.id = s.user_id
  where s.game_slug = p_game_slug
    and p.is_banned = false
    and (p_country_code is null or p.country_code = p_country_code);

  if v_direction = 'higher' then
    select count(*) into v_better
    from public.scores s
    join public.profiles p on p.id = s.user_id
    where s.game_slug = p_game_slug
      and p.is_banned = false
      and (p_country_code is null or p.country_code = p_country_code)
      and (
        s.best_score > v_score
        or (s.best_score = v_score and s.achieved_at < v_achieved)
        or (s.best_score = v_score and s.achieved_at = v_achieved and s.user_id < p_user_id)
      );
  else
    select count(*) into v_better
    from public.scores s
    join public.profiles p on p.id = s.user_id
    where s.game_slug = p_game_slug
      and p.is_banned = false
      and (p_country_code is null or p.country_code = p_country_code)
      and (
        s.best_score < v_score
        or (s.best_score = v_score and s.achieved_at < v_achieved)
        or (s.best_score = v_score and s.achieved_at = v_achieved and s.user_id < p_user_id)
      );
  end if;

  return query select (v_better + 1), v_total, v_score, v_plays, v_achieved;
end;
$$;

grant execute on function public.get_player_rank(text, uuid, text) to anon, authenticated, service_role;

-- Atomic rate limit check (Postgres fallback when Upstash is not configured)
create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_row public.rate_limits%rowtype;
begin
  select * into v_row from public.rate_limits where key = p_key for update;

  if not found then
    insert into public.rate_limits (key, count, window_start) values (p_key, 1, v_now);
    return true;
  end if;

  if extract(epoch from (v_now - v_row.window_start)) >= p_window_seconds then
    update public.rate_limits set count = 1, window_start = v_now where key = p_key;
    return true;
  end if;

  if v_row.count >= p_limit then
    return false;
  end if;

  update public.rate_limits set count = v_row.count + 1 where key = p_key;
  return true;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- ============================================================================
-- Seed the 9 games catalog
-- ============================================================================

insert into public.games (slug, name, score_direction, unit, min_valid, max_valid, min_ms_per_unit, min_duration_ms, is_active)
values
  ('higher-or-lower', 'Higher or Lower', 'higher', 'streak', 0, 500, 350, 1000, true),
  ('flag-streak', 'Flag Streak', 'higher', 'streak', 0, 250, 400, 1000, true),
  ('typing-sprint', 'Typing Sprint', 'higher', 'WPM', 0, 250, 0, 27000, true),
  ('math-dash', 'Math Dash', 'higher', 'correct', 0, 150, 200, 27000, true),
  ('word-scramble', 'Word Scramble', 'higher', 'words', 0, 120, 400, 55000, true),
  ('blind-stopwatch', 'Blind Stopwatch', 'lower', 'ms', 0, 30000, 0, 2000, true),
  ('blurry-reveal', 'Blurry Reveal', 'higher', 'pts', 0, 5000, 0, 2000, true),
  ('guess-the-number', 'Guess the Number', 'higher', 'pts', 0, 5000, 0, 3000, true),
  ('color-whisperer', 'Color Whisperer', 'higher', 'pts', 0, 5000, 0, 15000, true)
on conflict (slug) do update set
  name = excluded.name,
  score_direction = excluded.score_direction,
  unit = excluded.unit,
  min_valid = excluded.min_valid,
  max_valid = excluded.max_valid,
  min_ms_per_unit = excluded.min_ms_per_unit,
  min_duration_ms = excluded.min_duration_ms,
  is_active = excluded.is_active;
