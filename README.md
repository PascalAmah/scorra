# Scorra

Scorra is an LLM evaluation platform that helps teams score, compare, and rank model responses against curated datasets. It provides multi-evaluator workflows, inter-rater agreement analytics, AI-assisted judging, and portable exports.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Development Scripts](#development-scripts)
- [Database & Data Model](#database--data-model)
- [Architecture](#architecture)
- [Roles & Permissions](#roles--permissions)
- [Core Concepts](#core-concepts)
- [API Overview](#api-overview)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

Scorra is an **LLM evaluation platform** built around three evaluation workflows:

| Workflow                | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| **Scoring (SINGLE)**    | Rate a single model response against weighted criteria |
| **Pairwise (PAIRWISE)** | Compare two responses head-to-head and pick a winner   |
| **Ranking (RANKING)**   | Order multiple responses from best to worst            |

An org admin creates datasets (prompt/response collections) and evaluation tasks, invites evaluators, and tracks progress and agreement. Evaluators work through their assigned queues. Admins export results and analyze quality metrics.

---

## Tech Stack

### Backend (`apps/api`)

- **NestJS** — modular TypeScript server framework
- **Prisma ORM** — type-safe database access
- **PostgreSQL** — primary database
- **Redis** — job queue (Bull) and caching
- **Passport + JWT** — authentication
- **class-validator / class-transformer** — DTO validation
- **OpenAI + Anthropic SDKs** — AI judge & suggestions
- **Swagger** — API documentation

### Frontend (`apps/web`)

- **Next.js 15** — React framework (App Router)
- **React 19** — UI library
- **TanStack Query** — server-state management
- **Zustand** — client state (auth session)
- **React Hook Form + Zod** — form validation
- **Tailwind CSS 4** — styling
- **Motion** — animations
- **HugeIcons** — icon set

### Shared (`packages/types`)

- TypeScript types and enums shared between backend and frontend

### Tooling

- **pnpm** — package manager (workspaces)
- **Turborepo** — monorepo task runner
- **Docker Compose** — local infrastructure (Postgres, Redis)
- **ESLint + Prettier** — linting and formatting

---

## Repository Structure

```
Scorra/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema
│   │   │   ├── seed.ts         # Seed script
│   │   │   └── migrations/     # DB migrations
│   │   └── src/
│   │       ├── main.ts         # Bootstrap entrypoint
│   │       ├── app.module.ts   # Root module
│   │       ├── common/         # Guards, decorators, DTOs
│   │       ├── config/         # Env-based config (jwt, db, redis, ai)
│   │       ├── prisma/         # Prisma service
│   │       └── modules/        # Feature modules
│   │           ├── auth/       # Register, login, JWT, switch-org
│   │           ├── users/      # User management
│   │           ├── organizations/ # Org, members, invitations
│   │           ├── datasets/   # Dataset CRUD + upload
│   │           ├── evaluations/ # Task CRUD + scoring workflow
│   │           ├── comparisons/ # Pairwise + ranking workflow
│   │           ├── analytics/  # Dashboards, agreement, scores
│   │           ├── exports/    # Export generation
│   │           ├── ai/         # AI judge & suggestions
│   │           ├── queue/      # Bull job queue
│   │           └── health/     # Health check
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── app/            # App Router pages
│           ├── components/     # UI components
│           ├── hooks/          # React Query + custom hooks
│           ├── lib/            # API client, utils
│           ├── services/       # Auth service
│           ├── store/          # Zustand stores
│           ├── types/          # Local types
│           └── validations/    # Zod schemas
├── packages/
│   └── types/                  # Shared TypeScript types
├── docs/                       # Build plan, UI screens
├── scripts/                    # Dev helpers
├── docker-compose.yml          # Local Postgres + Redis
├── turbo.json                  # Turborepo config
└── package.json                # Root scripts
```

---

## Prerequisites

- **Node.js** ≥ 20 (project uses Node 22)
- **pnpm** 9.15.0 (`npm install -g pnpm@9.15.0`)
- **Docker Desktop** (for local Postgres + Redis)

---

## Getting Started

### 1. Install dependencies

```sh
pnpm install
```

### 2. Start infrastructure

```sh
pnpm docker:up
```

This starts:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- Redis Commander UI on `http://localhost:8081`

### 3. Configure environment variables

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Edit the files to set your database URL, JWT secrets, and AI keys (see [Environment Variables](#environment-variables)).

### 4. Generate Prisma client & run migrations

```sh
pnpm db:generate
pnpm db:migrate
```

### 5. (Optional) Seed the database

```sh
cd apps/api && pnpm exec ts-node prisma/seed.ts
```

### 6. Start the dev servers

```sh
pnpm dev
```

This runs both the API and web apps:

- **API**: `http://localhost:3001` (Swagger at `http://localhost:3001/api/docs`)
- **Web**: `http://localhost:3000`

---

## Environment Variables

### `apps/api/.env`

| Variable                          | Description                                              | Default                   |
| --------------------------------- | -------------------------------------------------------- | ------------------------- |
| `DATABASE_URL`                    | Postgres connection string                               | —                         |
| `PORT`                            | API port                                                 | `3001`                    |
| `API_PREFIX`                      | API route prefix                                         | `api/v1`                  |
| `FRONTEND_URL`                    | Frontend URL (CORS allowlist)                            | `http://localhost:3000`   |
| `JWT_SECRET`                      | Access token signing secret                              | —                         |
| `JWT_EXPIRES_IN`                  | Access token lifetime                                    | `15m`                     |
| `JWT_REFRESH_SECRET`              | Refresh token signing secret                             | —                         |
| `JWT_REFRESH_EXPIRES_IN`          | Refresh token lifetime                                   | `7d`                      |
| `REDIS_URL`                       | Redis connection URL (full URL incl. auth)               | `redis://localhost:6379`  |
| `AI_PROVIDER`                     | Default AI provider (`openai`, `anthropic`, `groq`, `gemini`) | `openai`             |
| `OPENAI_API_KEY`                  | OpenAI API key                                           | —                         |
| `ANTHROPIC_API_KEY`               | Anthropic API key                                        | —                         |
| `GROQ_API_KEY`                    | Groq API key                                             | —                         |
| `GEMINI_API_KEY`                  | Google Gemini API key                                    | —                         |
| `EVALUATION_AI_MODEL`             | OpenAI model for evaluation                              | `gpt-4o`                  |
| `EVALUATION_AI_MODEL_ANTHROPIC`   | Anthropic model for evaluation                           | `claude-3-5-sonnet-20241022` |
| `EVALUATION_AI_MODEL_GROQ`        | Groq model for evaluation                                | `openai/gpt-oss-120b`     |
| `EVALUATION_AI_MODEL_GEMINI`      | Gemini model for evaluation                              | `gemini-2.0-flash`        |
| `AI_MAX_TOKENS`                   | Max tokens for AI responses                              | `2048`                    |
| `AI_TEMPERATURE`                  | AI sampling temperature                                  | `0.2`                     |
| `STORAGE_DRIVER`                  | File storage driver (`local` or `supabase`)              | `local`                   |
| `SUPABASE_URL`                    | Supabase project URL                                     | —                         |
| `SUPABASE_SECRET_KEY`             | Supabase `service_role` key (full access)                | —                         |
| `SUPABASE_STORAGE_BUCKET`         | Supabase storage bucket name                             | `uploads`                 |
| `THROTTLE_TTL`                    | Rate-limit window in seconds                             | `60`                      |
| `THROTTLE_LIMIT`                  | Max requests per window                                  | `100`                     |
| `SMTP_HOST`                       | SMTP server host (leave blank to log invites only)       | —                         |
| `SMTP_PORT`                       | SMTP server port                                         | `587`                     |
| `SMTP_USER`                       | SMTP username                                            | —                         |
| `SMTP_PASS`                       | SMTP password                                            | —                         |
| `SMTP_FROM`                       | Sender address for invitation emails                     | `noreply@scorra.dev`      |

> **Note on Redis**: the app uses a single `REDIS_URL` (e.g. `redis://:password@host:6379`). The old `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` variables are no longer used.

> **Note on AI keys**: only the key for your chosen `AI_PROVIDER` is required. If no key is configured, all AI features fall back to deterministic heuristics (scores are returned with `confidence: 0`).

### `apps/web/.env.local`

| Variable              | Description                        | Default                          |
| --------------------- | ---------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_API_URL` | API base URL (used by the browser) | `http://localhost:3001/api/v1`   |

---

## Development Scripts

All scripts run from the repository root:

| Command            | Description                               |
| ------------------ | ----------------------------------------- |
| `pnpm dev`         | Start API + web with port cleanup on exit |
| `pnpm dev:kill`    | Kill processes on ports 3000/3001         |
| `pnpm build`       | Build all packages                        |
| `pnpm lint`        | Lint all packages                         |
| `pnpm test`        | Run all tests                             |
| `pnpm type-check`  | Type-check all packages                   |
| `pnpm db:generate` | Generate Prisma client                    |
| `pnpm db:migrate`  | Run Prisma migrations                     |
| `pnpm db:studio`   | Open Prisma Studio                        |
| `pnpm docker:up`   | Start Postgres + Redis                    |
| `pnpm docker:down` | Stop Postgres + Redis                     |

### Notes on `pnpm dev`

The dev script (`scripts/dev.mjs`) wraps `turbo run dev` and ensures orphaned processes on ports 3000/3001 are killed on shutdown — this prevents the common Windows `EADDRINUSE` error.

If you still hit `EADDRINUSE`:

```sh
pnpm dev:kill
# or manually:
netstat -ano | grep ":3001"
taskkill //PID <pid> //F
```

---

## Database & Data Model

The data model is defined in `apps/api/prisma/schema.prisma`. Key entities:

| Entity                           | Purpose                                     |
| -------------------------------- | ------------------------------------------- |
| `Organization`                   | Tenant / workspace                          |
| `OrganizationMember`             | A user's role within an org                 |
| `Invitation`                     | Pending invite (token, email, role)         |
| `User`                           | Global account (email, password, status)    |
| `RefreshToken`                   | Rotating refresh tokens                     |
| `Dataset`                        | A collection of prompt/response rows        |
| `DatasetRow`                     | A single prompt + context + expected output |
| `DatasetVersion`                 | Versioned dataset snapshots                 |
| `ModelResponse`                  | A model's output for a row                  |
| `EvaluationTask`                 | A scoring/comparison/ranking task           |
| `TaskAssignment`                 | Evaluator assignment to a task              |
| `Evaluation`                     | A single score submission (SINGLE)          |
| `PairwiseComparison`             | A head-to-head verdict (PAIRWISE)           |
| `RankingResult` / `RankingEntry` | Ordered responses (RANKING)                 |
| `Export`                         | Generated export file                       |
| `AuditLog`                       | Activity log                                |
| `ApiKey`                         | Org API keys                                |

---

## Architecture

### Backend (`apps/api`)

NestJS modules with a clean separation:

- **Controllers** handle HTTP, validation, and role guards
- **Services** contain business logic and Prisma access
- **DTOs** validate incoming requests
- **Guards** (`JwtAuthGuard`, `RolesGuard`) protect routes
- **Decorators** (`@CurrentUser`, `@CurrentOrgId`, `@Roles`, `@Public`) extract context

Authentication flow:

1. User registers or logs in → JWT access token + refresh token issued
2. Access token carries `sub`, `email`, `role`, `organizationId`, `organizationRole`
3. `RolesGuard` checks `organizationRole` (org-specific) against `@Roles(...)`
4. `JwtStrategy` validates the user exists and is still a member of their org

### Frontend (`apps/web`)

- **App Router** pages under `src/app/`
- **TanStack Query** hooks under `src/hooks/` for data fetching/mutations
- **Zustand** store (`auth-store`) for the persisted session
- **API client** (`lib/api.ts`) wraps `fetch` with auth headers and error handling

The dashboard is **role-aware** — admins see org stats, evaluators see their own task queue.

---

## Roles & Permissions

| Role            | Capabilities                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| **SUPER_ADMIN** | Everything. Platform owner. Can suspend/activate any user.                                               |
| **ORG_ADMIN**   | Full org control — tasks, datasets, members, invitations, exports, analytics. Cannot submit evaluations. |
| **EVALUATOR**   | Submit evaluations, comparisons, rankings. Can view tasks and org info.                                  |
| **VIEWER**      | Read-only access to dashboards, tasks, datasets, exports.                                                |

Authorization is enforced server-side via `@Roles(...)` decorators and the `RolesGuard`, which uses the org-specific role (`organizationRole`) from the JWT.

---

## Core Concepts

### Datasets

A dataset is a collection of `DatasetRow`s — each row contains a prompt, optional context, expected output, and one or more `ModelResponse`s (the model-generated responses to be evaluated).

Datasets support CSV, JSON, and JSONL formats, versioning, and cloning.

### Evaluation Tasks

An evaluation task ties a dataset to an evaluation workflow:

| Type       | What evaluators do                                  |
| ---------- | --------------------------------------------------- |
| `SINGLE`   | Score one response against weighted criteria (1-10) |
| `PAIRWISE` | Pick A/B winner or tie                              |
| `RANKING`  | Order multiple responses                            |

Tasks have a lifecycle: `DRAFT` → `ACTIVE` → `PAUSED` → `COMPLETED`/`ARCHIVED`.

### Scoring Criteria

Each task defines criteria with:

- `dimension` — a fixed enum (e.g. `ACCURACY`, `HELPFULNESS`, `CUSTOM`)
- `label` — human-readable name
- `weight` — relative importance (overall score = weighted average)
- `minScore` / `maxScore` — scoring range

> **Important**: the `dimension` field must be a valid `ScoreDimension` enum value. Use `CUSTOM` for ad-hoc criteria and set your own `label`.

### Multi-evaluator & Agreement

Multiple evaluators can be assigned to the same task. Each evaluator has an **independent queue** — they work through items they personally haven't completed. This enables inter-rater agreement metrics (overall agreement rate, Fleiss' kappa).

### AI Judge

The platform can auto-evaluate responses using OpenAI or Anthropic models. Evaluators can request AI suggestions to pre-fill scores or calibrate their judgment.

### Exports

Results can be exported as JSONL, CSV, or JSON with optional filters.

---

## API Overview

Base URL: `http://localhost:3001/api/v1`

Full interactive docs are available at Swagger (`/api/docs`) when running the API.

Key endpoints:

| Method | Path                                       | Description                 |
| ------ | ------------------------------------------ | --------------------------- |
| `POST` | `/auth/register`                           | Register a user + org       |
| `POST` | `/auth/login`                              | Login                       |
| `POST` | `/auth/refresh`                            | Refresh access token        |
| `POST` | `/auth/switch-org/:orgId`                  | Switch active org           |
| `GET`  | `/auth/me`                                 | Current user                |
| `GET`  | `/organizations`                           | List user's orgs            |
| `POST` | `/organizations/:id/invitations`           | Invite member               |
| `POST` | `/organizations/invitations/:token/accept` | Accept invite               |
| `GET`  | `/organizations/invitations/:token`        | Get invite details (public) |
| `GET`  | `/datasets`                                | List datasets               |
| `POST` | `/datasets`                                | Create dataset              |
| `POST` | `/datasets/:id/upload`                     | Upload dataset file         |
| `GET`  | `/evaluations/tasks`                       | List tasks                  |
| `POST` | `/evaluations/tasks`                       | Create task                 |
| `GET`  | `/evaluations/tasks/:id/next`              | Next item to score          |
| `POST` | `/evaluations/submit`                      | Submit a score              |
| `GET`  | `/comparisons/:id/next`                    | Next pair to compare        |
| `POST` | `/comparisons`                             | Submit a verdict            |
| `GET`  | `/rankings/:id/next`                       | Next set to rank            |
| `POST` | `/rankings`                                | Submit a ranking            |
| `GET`  | `/analytics/dashboard`                     | Org analytics               |
| `GET`  | `/analytics/tasks/:id/agreement`           | Inter-rater agreement       |
| `GET`  | `/exports`                                 | List exports                |
| `POST` | `/exports`                                 | Request export              |

---

## Testing

```sh
pnpm test
```

Tests are written with Jest (backend) and located alongside source files (`*.spec.ts`).

---

## Deployment

The project deploys the API on **Render** and the web on **Vercel**, with **Supabase** for Postgres and file storage and **Upstash** for Redis.

### API → Render

A `render.yaml` blueprint is included at the repo root. Render will detect it automatically when you connect the repository.

1. Go to Render → **New** → **Blueprint** → connect `PascalAmah/scorra`, branch `main`
2. Render creates the `scorra-api` service (Docker runtime, `apps/api/Dockerfile`)
3. Fill in the secret env vars marked `sync: false` in `render.yaml`:
   - `DATABASE_URL` — Supabase → Project Settings → Database → connection string
   - `REDIS_URL` — Upstash → your Redis instance → connection URL
   - `FRONTEND_URL` — your Vercel URL (set after web deploy)
   - `SUPABASE_URL` and `SUPABASE_SECRET_KEY` — Supabase → Project Settings → API
   - Any AI provider keys you want active
4. Deploy. The container runs `prisma migrate deploy` then starts the API.
5. Health check: `https://<your-render-url>/api/v1/health`

### Web → Vercel

1. Go to Vercel → **Add New Project** → import the repo
2. Set **Root Directory** to `apps/web` — `vercel.json` handles the monorepo build commands
3. Add one environment variable: `NEXT_PUBLIC_API_URL = https://<your-render-url>/api/v1`
4. Deploy
5. Copy the Vercel URL back into Render's `FRONTEND_URL` env var and redeploy the API (so CORS picks it up)

### Local build

```sh
pnpm build
```

- `apps/api` → `dist/` (NestJS)
- `apps/web` → `.next/` (Next.js)
- `packages/types` → `dist/`

---

## Troubleshooting

### `EADDRINUSE: address already in use :::3001`

A stale process is holding the port. Run `pnpm dev:kill` or manually kill the PID.

### `Cannot find module '@scorra/types'`

The types package needs to be built:

```sh
cd packages/types && pnpm exec tsc
```

### Invalid scoring criteria error

The `dimension` field in a task's `scoringCriteria` must be a valid `ScoreDimension` enum value. Use `CUSTOM` for ad-hoc dimensions.

### `Access denied. Required roles: ORG_ADMIN, SUPER_ADMIN`

A role guard is blocking the request. Verify the user's org membership role and JWT (`organizationRole` claim).

### Docker daemon not running

Start Docker Desktop, wait for it to fully initialize, then run `pnpm docker:up`.

---

## License

Public project. All rights reserved.
