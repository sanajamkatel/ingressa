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

