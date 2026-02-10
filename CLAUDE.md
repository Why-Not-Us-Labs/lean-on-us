# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lean On Us is an AI voice assistant service for businesses. The repo contains:
- **Landing page** (`src/`) - Static HTML/CSS marketing site
- **Dashboard** (`dashboard/`) - Next.js 16 app for customers to manage their AI assistants

## Commands

```bash
# Dashboard development
cd dashboard
npm install
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run lint     # ESLint

# Landing page (static)
cd src && python3 -m http.server 8000
```

## Architecture

### Dashboard (`dashboard/`)

Next.js 16 App Router with:
- **Auth**: Supabase Auth with middleware protection (`src/middleware.ts`)
- **Database**: Supabase PostgreSQL
- **Payments**: Stripe (checkout, portal, webhooks)
- **Voice AI**: VAPI integration with webhooks
- **SMS**: Twilio for follow-up messages
- **UI**: shadcn/ui components with Tailwind CSS v4

Key paths:
- `src/app/dashboard/` - Protected dashboard pages (calls, leads, analytics, billing, settings)
- `src/app/api/webhooks/` - Stripe and VAPI webhook handlers
- `src/app/api/stripe/` - Checkout and portal endpoints
- `src/lib/supabase/` - Supabase client configs and types
- `src/lib/tier-config.ts` - Subscription tier definitions (free/starter/pro/enterprise)
- `supabase/migrations/` - Database schema

Database tables: `organizations`, `org_members`, `assistants`, `calls`, `leads`

### Landing Page (`src/`)

Static HTML with embedded CSS. Deployed via Vercel from `src/` directory (no build step).

## Environment Variables

Dashboard requires:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

## Deployment

- Landing page: Vercel serves `src/` as static files
- Dashboard: Vercel builds and deploys `dashboard/` as Next.js app
- Domain: leanon.us

## Brand Colors

```css
--primary-teal: #009690;
--dark-teal: #006663;
--light-teal: #4DC8C2;
--accent-teal: #5ED4CE;
```
