I've explored the **Event-Buddies** repository and analyzed its structure, code, and configuration. Here's a comprehensive breakdown.

---

## 🎯 Overview & Purpose

Event-Buddies (branded in the UI as **“Event Companion”**) is a full‑stack web application designed to enhance the live‑event experience for both **attendees** and **organisers**. The description in the layout metadata says it all: *“Know where you are, where your people are, and what happens next.”*. It appears to be a **demo/template** rather than a production‑ready product, given the use of seeded demo data and placeholder IDs.

---

## 🛠 Tech Stack

The project uses a modern, TypeScript‑first stack:

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router) |
| **UI Library** | React 19 |
| **Styling** | Tailwind CSS 4 (via `@tailwindcss/postcss`) |
| **Database** | PostgreSQL (using `pg`) |
| **ORM** | Drizzle ORM (`drizzle-orm` + `drizzle-kit`) |
| **Validation** | Zod |
| **Icons** | Lucide React |
| **Language** | TypeScript 5.9 |

These dependencies are listed in `package.json`.

---

## 📁 Project Structure

```
src/
├── app/                     # Next.js App Router
│   ├── api/                 # API route handlers
│   │   ├── demo-actions/
│   │   ├── health/
│   │   └── organiser-actions/
│   ├── organiser/           # Organiser-facing page
│   ├── globals.css
│   ├── layout.tsx
│   ├── organiser.css
│   └── page.tsx             # Attendee-facing home page
├── components/              # React components
│   ├── event-companion.tsx  # Attendee UI (map, schedule, crew, etc.)
│   └── organiser-command-centre.tsx  # Organiser dashboard
├── db/                      # Database layer
│   ├── index.ts
│   └── schema.ts            # Drizzle schema (15+ tables)
└── lib/
    └── demo-data.ts         # Seed data & data‑fetching helpers
```

This structure is confirmed by the repository listings.

---

## ✨ Key Features

### 1. Event Companion (Attendee View)
The `EventCompanion` component is a highly interactive client‑side UI that includes:
- **Map view** with filters (stages, food, bars, toilets, crew, safety, transport).
- **Schedule** of performances.
- **Crew** – likely friend‑location sharing and meeting points.
- **More** menu for additional actions.

It uses a wide range of Lucide icons and integrates with a `/api/demo-actions` endpoint to persist user actions such as toggling event follow, scheduling performances, and enabling location sharing.

### 2. Organiser Command Centre
The `OrganiserCommandCentre` provides a dashboard for event organisers with workspaces:
- **Overview**
- **Schedule** (performance status management)
- **Site map**
- **Communications** (announcements)

It also supports performance status changes (scheduled, live, delayed, etc.) and sends actions to `/api/organiser-actions`.

---

## 🗄 Database Schema

The schema (`src/db/schema.ts`) defines a rich relational model for event management. Key tables include:

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts |
| `organisers` | Event organisers |
| `organiserMembers` | Roles/permissions within an organiser |
| `events` | Core event details (venue, coordinates, dates, images, etc.) |
| `eventFollows` | Users following events |
| `stages` | Stages within an event (with map coordinates) |
| `artists` | Performing artists |
| `performances` | Scheduled performances (links artists, stages, times) |
| `userScheduleItems` | Personal schedules with reminders |
| `eventMapPoints` | Points of interest on the map |
| `eventAnnouncements` | Organiser announcements |
| `crews` / `crewMembers` | Friend groups for location sharing |
| `locationShares` | Real‑time location sharing records |
| `meetingPoints` | Designated meeting spots |
| `auditLogs` | Action logging |

The schema is defined using Drizzle’s `pgTable` helpers and includes foreign keys, unique indexes, and JSONB fields.

---

## 🔌 API Endpoints

Three API route groups are present:

| Route | Purpose |
|-------|---------|
| `/api/demo-actions` | Handles attendee actions: toggle event follow, toggle schedule items, toggle location sharing. |
| `/api/organiser-actions` | Handles organiser actions (status changes, announcements, etc.) – referenced in the organiser component. |
| `/api/health` | Likely a simple health‑check endpoint. |

The demo‑actions route validates input, uses Drizzle ORM to insert/delete/update records, and returns JSON responses.

---

## 🧪 Demo Data & Seeding

The file `src/lib/demo-data.ts` defines fixed UUIDs for demo users, organisers, events, stages, artists, and performances. It also contains an `ensureDemoSeed()` function that inserts this data into the database using Drizzle’s `onConflictDoNothing()` to avoid duplicates. The home page (`page.tsx`) fetches this demo data and passes it to the `EventCompanion` component.

This confirms that the app is designed as a **demonstration** or **starter template**, not a production system with real authentication or dynamic data creation.

---

## 🔍 Observations & Potential Improvements

### Strengths
- **Modern stack**: Next.js 16 + React 19 + Drizzle + Tailwind 4 is a forward‑looking combination.
- **Rich domain model**: The database schema covers many real‑world event‑management needs (crews, location sharing, map points, announcements).
- **Clean component structure**: Separation between attendee and organiser UIs is clear.

### Gaps / Opportunities
- **No README or documentation**: The repository lacks a README, making onboarding harder. A basic `README.md` explaining setup, environment variables, and seeding would help.
- **Demo‑oriented**: Many IDs are hard‑coded, and there’s no authentication or user management. Converting this to a real app would require auth (e.g., NextAuth), proper user flows, and dynamic event creation.
- **Error handling**: API routes have basic validation but could benefit from centralized error handling and logging.
- **Testing**: No test files or testing framework are present. Adding unit/integration tests (e.g., Vitest, Playwright) would improve reliability.
- **Environment configuration**: The database connection likely relies on environment variables (e.g., `DATABASE_URL`), but no `.env.example` is provided.

---

## 📌 Summary

**Event-Buddies** is a well‑structured, modern full‑stack demo for an event‑companion platform. It showcases a sophisticated database schema, two distinct user experiences (attendee vs. organiser), and a clean Next.js App Router architecture. While it’s not production‑ready out of the box, it serves as an excellent foundation for building a real‑world event management and social coordination app. Adding documentation, authentication, and test coverage would be the logical next steps for anyone looking to evolve this repository into a live product.