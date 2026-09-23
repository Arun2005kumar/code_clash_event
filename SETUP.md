# Coding Club Challenge — Setup & Deployment Guide

## Prerequisites
- Node.js 18+
- npm
- A [Supabase](https://supabase.com) account (free tier works)
- A [Vercel](https://vercel.com) account (for deployment)

---

## Step 1 — Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a project name (e.g., `codeclash`)
3. Set a strong database password — **save it somewhere safe**
4. Choose region closest to your event location
5. Wait for project to initialize (~2 minutes)

---

## Step 2 — Run SQL Migrations

In your Supabase project dashboard:
1. Click **SQL Editor** in the left sidebar
2. Run each migration file **in order**:

### Migration 1 — Schema
Copy + paste contents of `supabase/migrations/001_initial_schema.sql` → Click **Run**

### Migration 2 — RLS Policies  
Copy + paste contents of `supabase/migrations/002_rls_policies.sql` → Click **Run**

### Migration 3 — Functions
Copy + paste contents of `supabase/migrations/003_functions.sql` → Click **Run**

### Seed Data (optional but recommended for testing)
Copy + paste contents of `supabase/seed.sql` → Click **Run**

---

## Step 3 — Get Supabase Credentials

1. In Supabase dashboard → **Settings** → **API**
2. Copy:
   - **Project URL** (looks like `https://xxxxxxxxxxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

---

## Step 4 — Configure Environment Variables

Edit `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ujzsvnqjbdhynqpamutj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqenN2bnFqYmRoeW5xcGFtdXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMzYzNDIsImV4cCI6MjEwNTcxMjM0Mn0.enCsXZSCl1VEmmUxlRLYdaWLPMqaJXEs9Uv1QAoZc10
```

---

## Step 5 — Create Admin Account

1. In Supabase dashboard → **Authentication** → **Users** → **Add User**
2. Enter your admin email and a strong password
3. Click **Create User**
4. The middleware automatically protects all `/admin/*` routes

---

## Step 6 — Run Locally

```bash
npm run dev
```

Open http://localhost:3000

- **Team Login**: http://localhost:3000/
- **Admin Panel**: http://localhost:3000/admin/login

---

## Step 7 — Deploy to Vercel

1. Push code to GitHub
2. Go to vercel.com → **New Project** → Import from GitHub
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**

---

## Pre-Event Checklist

Before the actual event:

- [ ] Replace all [SAMPLE] questions with real questions (Admin → Round 1/Round 2 pages)
- [ ] Add all registered teams via Admin → Teams
- [ ] Verify admin login works at /admin/login
- [ ] Test team login with one registered team
- [ ] Verify Round 1 loads (toggle active in Admin → Dashboard)
- [ ] Test Round 2 bid flow end-to-end
- [ ] Test hammer lock on a sample question
- [ ] Check violation logging works (try switching tabs)
- [ ] Verify correct answers are NEVER visible in browser DevTools Network tab

---

## Event Day Workflow

### Before Teams Arrive
1. Login to admin panel at /admin/login
2. Dashboard → Toggle Round 1 OFF (activate when ready)
3. Ensure all teams are registered under Teams

### Running Round 1
1. Admin → Dashboard → Toggle Round 1 ON
2. Teams see the MCQ interface
3. Timer starts per team when they enter
4. Monitor violations in R2 Results → Violations tab

### Running Round 2
1. Admin → Dashboard → Click "Initialize Round 2 States" (ONCE!)
2. Toggle Round 2 ON
3. Admin → Round 2 → Set Q1 status to live → bidding_open
4. Monitor bids in Live Auction
5. Select winner → LOCK HAMMER
6. Advance to next question → repeat for all 6

---

## Security Notes

- Correct answers NEVER sent to client (server-side PostgreSQL functions only)
- Score calculation via RPC functions — no client-side manipulation possible
- RLS policies enforce team data isolation
- Admin routes protected by Supabase Auth session
- Hammer lock uses PostgreSQL transactions (no race conditions)
- Duplicate submission prevention via unique constraints
