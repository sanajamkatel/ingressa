
# Ingressa 

**The modern, production-ready job application dashboard with automated Gmail ingestion, intelligent spreadsheet tracking, and real-time analytics.**

---

##  What is Ingressa?

Job hunting is exhausting, and keeping track of applications across dozens of spreadsheets, emails, and portals shouldn't be. **Ingressa** is a lightning-fast, zero-cost serverless command center designed to take the friction out of your job search.

Built with modern web technologies, Ingressa automatically syncs your application updates straight from Gmail, parses legacy Excel/CSV trackers with smart deduplication, and gives you a bird's-eye view of your interview pipeline—all wrapped in a gorgeous dark-mode interface.

---

##  Key Features

* **Automated Gmail Sync:** Seamlessly scans and syncs job application emails, automatically extracting status updates and company responses so you never miss a beat.
* **Smart Excel/CSV Importer:** Drag and drop your old spreadsheet trackers. Ingressa parses your rows instantly and handles intelligent deduplication so you never import double.
* **Interactive Analytics & Funnels:** Visualize your job search pipeline with dynamic stat cards, follow-up trackers, and recent activity feeds.
* **Dark Mode by Default:** Designed from the ground up with a distraction-free, elegant dark aesthetic and dynamic time-of-day atmospheric backgrounds.
* **Secure Authentication:** Powered by Clerk for frictionless, secure user logins and protected private routes.
* **High-Performance Architecture:** Backed by Upstash Redis for rapid rate limiting and smooth client-side caching.

---

##  The Tech Stack

Ingressa is built using a modern, scalable cloud architecture:

* **Framework:** Next.js (App Router, Server Actions, Serverless Functions)
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **Database & ORM:** PostgreSQL (Supabase/Neon) managed via Prisma ORM
* **Caching & Rate Limiting:** Upstash Redis
* **Authentication:** Clerk
* **Testing:** Vitest (Comprehensive integration test suite)
* **CI/CD:** GitHub Actions & Vercel automated deployments

---

## Live Demo & Deployment

Ingressa is fully optimized for zero-cost cloud deployment:

* **Hosted on:** Vercel
* **Database:** Cloud PostgreSQL
* **CI/CD Pipeline:** Fully automated GitHub Actions integration tests running on every push to `main`.

---

Open [Ingressa](https://ingressa-alpha.vercel.app/) in your browser to see Ingressa in action!

---

=======
# Ingressa

**Your job search, finally in motion.**

Ingressa organizes every job application you send, automatically — so your tracker stays current without a spreadsheet.

## The problem

Applying to jobs generates a mess that nobody tracks well:

- Applications live scattered across dozens of confirmation emails, each from a different company, a different ATS platform, with no common format.
- The only record most people keep is a half-updated spreadsheet — accurate the day it's created, stale a week later.
- Status changes (an interview invite, a rejection) show up as *another* email, disconnected from the row you already have for that company.
- By the time you're deciding where to follow up, you're reconstructing your own job search from memory and inbox search.

## How Ingressa solves it

Ingressa connects to your Gmail and turns that inbox noise into a single, current tracker — without you doing any data entry.

- **Automatic ingestion** — click "Sync Gmail" and Ingressa scans your inbox for application-related emails, filters out noise (job-alert digests, newsletters) with a fast local pass before anything expensive runs, and uses Claude to extract the company, role, status, job posting link, and more from what's left.
- **Status that moves forward, never backward** — a later "you've been invited to interview" email automatically advances that row's status past "applied." Rejections and offers lock in once reached. A status you set by hand is permanently protected from ever being overwritten by a future sync.
- **No duplicate rows** — matches incoming emails against what you're already tracking by company and role, filling in missing fields (job URL, salary, location) instead of creating a second, blank entry.
- **A real dashboard** — KPIs, a funnel view, and a follow-up list surfaced from cached aggregate queries, not a manual count.
- **Bring your own data** — already have a spreadsheet? Import it directly; the same deduplication logic merges it with anything Gmail has already found.

## Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL via Prisma ORM 7
- **Cache:** Redis (cache-aside, for the applications list and dashboard stats)
- **Auth:** Clerk (including Google OAuth for Gmail access)
- **AI extraction:** Anthropic Claude
- **Validation:** Zod at every server-action boundary
- **Testing:** Vitest — integration-style, against real Postgres/Redis rather than mocks
- **CI:** GitHub Actions (typecheck, test, build on every push)

## Getting started

**Live demo:** _coming soon_

To run it locally:

```bash
npm install
```

Create `.env.local` with:

```
DATABASE_URL=
REDIS_URL=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

Apply the database schema, then start the dev server:

```bash
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## License

All rights reserved. See [LICENSE](./LICENSE).

demo preview deployment.
