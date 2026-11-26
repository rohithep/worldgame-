# World Scoreboard Arcade

A bright, polished web arcade with **9 short skill games** and **9 uncapped global leaderboards**. Players join with a unique username and a 6-digit PIN — no email, no phone, no social login.

## Features

- **9 Games**: Higher or Lower, Flag Streak, Typing Sprint, Math Dash, Word Scramble, Blind Stopwatch (lowest wins), Blurry Reveal, Guess the Number, and Color Whisperer (CIEDE2000).
- **Username + 6-Digit PIN Auth**: Server-only auth via Next.js route handlers, HMAC-SHA256 peppered passwords, 5-attempt / 15-minute lockout, per-IP rate limiting, Turnstile CAPTCHA, and an in-memory Save-Your-Login card with PNG download.
- **Uncapped Global Leaderboards**: Virtualized infinite scroll (`@tanstack/react-virtual`) backed by keyset pagination, country filter, username search, animated Top-3 podium, "Jump to my rank", and moderation reporting.
- **Anti-Cheat Plausibility Layer**: Server-timed `game_sessions`, bounds & per-round human reaction checks, and `SECURITY DEFINER` `submit_score` RPC with strict Row Level Security on every table.
- **3D Scroll Landing Page**: Lazy-loaded React Three Fiber glossy globe + orbiting objects with GSAP ScrollTrigger & Lenis, pausing when hidden, and automatic static fallback on mobile / low-power / `prefers-reduced-motion`.
- **Share Cards, Profile & Admin Console**: Dynamic OG images (`/api/og`), `/share/[game]/[username]`, `/me` (bests, ranks, change PIN, delete account), and `/admin` moderation console.

---

## Local Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure Supabase & Environment Variables

1. Create a free project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in your credentials:
   ```bash
   cp .env.example .env.local
   ```
3. Generate strong random secrets for `SERVER_PEPPER` and `IP_HASH_SALT`:
   ```bash
   openssl rand -hex 32
   ```
4. Run the SQL migration in your Supabase SQL Editor (or via Supabase CLI):
   - File: `supabase/migrations/0001_initial_schema.sql`

### 3. (Optional) Seed 200 Demo Players

Populate all 9 leaderboards with 200 clearly marked demo players across 60 countries:

```bash
pnpm run seed
```

Remove all demo players cleanly before launch:

```bash
pnpm run unseed
```

### 4. Start the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Custom Assets to Supply

Drop transparent PNGs (~1024×1024 px) into `public/assets/png/` — the app automatically replaces its built-in glossy placeholders with zero code changes:

- `public/assets/png/globe.png`
- `public/assets/png/stopwatch.png`
- `public/assets/png/keycap.png`
- `public/assets/png/color-swatch.png`
- `public/assets/png/flag-pole.png`
- `public/assets/png/letter-tiles.png`
- `public/assets/png/calculator.png`
- `public/assets/png/magnifier.png`
- `public/assets/png/ruler-slider.png`
- `public/assets/png/trophy-gold.png`
- `public/assets/png/trophy-silver.png`
- `public/assets/png/trophy-bronze.png`

Optional Draco-compressed GLB 3D models (≤ 500 KB each) can be placed in `public/assets/3d/`.

---

## Quality & Testing

```bash
# Typecheck
pnpm run typecheck

# Lint
pnpm run lint

# Unit + RLS policy tests (Vitest)
pnpm test

# Production build check
pnpm run build

# End-to-end tests (Playwright — start dev server first)
pnpm run test:e2e
# With live Supabase auth + gameplay + lockout flow:
E2E_WITH_SUPABASE=1 pnpm run test:e2e
```

---

## Deploying to Vercel

1. Push the repository to GitHub/GitLab/Bitbucket.
2. Import the project in [Vercel](https://vercel.com) (framework preset: **Next.js**, install command: `pnpm install`).
3. Add all environment variables from `.env.example` in Vercel Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Server-only — never expose with `NEXT_PUBLIC_`)
   - `SERVER_PEPPER` & `IP_HASH_SALT`
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` & `TURNSTILE_SECRET_KEY`
   - `NEXT_PUBLIC_SITE_URL` (your production URL, e.g. `https://worldscoreboardarcade.com`)
   - `ADMIN_USER_IDS` (comma-separated Supabase user UUIDs for `/admin`)
   - Optional: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `NEXT_PUBLIC_SENTRY_DSN`
4. Deploy!
