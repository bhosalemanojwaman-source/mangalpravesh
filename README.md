# MangalPravesh (Stage 1 foundation)

Next.js 14 + Supabase. Includes login, workspaces, projects, the Kerala land checklist and a payment log, all saved per workspace with row-level security.

## Run locally
1. Create a Supabase project (Mumbai region). In the SQL editor, run `supabase/schema.sql`.
2. Copy `.env.example` to `.env.local` and fill in the project URL and anon key (Project settings, API).
3. `npm install` then `npm run dev`, and open http://localhost:3000.
4. In Supabase, Authentication, URL configuration: add `http://localhost:3000/auth/callback` as a redirect URL.

## Deploy on mangalpravesh.in
1. Push this folder to a GitHub repository.
2. In Vercel, import the repository and add the two environment variables.
3. In Vercel, Settings, Domains: add `mangalpravesh.in`. Copy the DNS records it shows into the DNS settings for the domain at GoDaddy.
4. In Supabase, URL configuration: set the Site URL to `https://mangalpravesh.in` and add `https://mangalpravesh.in/auth/callback` as a redirect URL.

## Not built yet
Approvals tracker, estimator, budget lines, document uploads, vendor and labour ledgers, team invites, admin area, and the full marketing site. The tables for budgets and approvals already exist in the schema.
