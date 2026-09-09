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

- **Next.js 16** — React framework (App Router)
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

| Variable                 | Description                 | Default                   |
| ------------------------ | --------------------------- | ------------------------- |
| `DATABASE_URL`           | Postgres connection string  | —                         |
| `PORT`                   | API port                    | `3001`                    |
| `API_PREFIX`             | API prefix                  | `api/v1`                  |
| `FRONTEND_URL`           | Frontend URL (CORS)         | `http://localhost:3000`   |
| `JWT_SECRET`             | Access token signing secret | `change-me-in-production` |
| `JWT_EXPIRES_IN`         | Access token lifetime       | `15m`                     |
| `JWT_REFRESH_SECRET`     | Refresh token secret        | —                         |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime      | `7d`                      |
| `REDIS_HOST`             | Redis host                  | `localhost`               |
| `REDIS_PORT`             | Redis port                  | `6379`                    |
| `REDIS_PASSWORD`         | Redis password              | —                         |
| `OPENAI_API_KEY`         | OpenAI API key              | —                         |
| `ANTHROPIC_API_KEY`      | Anthropic API key           | —                         |
| `AI_PROVIDER`            | Default AI provider         | `openai`                  |
| `DEFAULT_AI_MODEL`       | Default model               | `gpt-4o`                  |

### `apps/web/.env`

| Variable              | Description  | Default                        |
| --------------------- | ------------ | ------------------------------ |
| `NEXT_PUBLIC_API_URL` | API base URL | `http://localhost:3001/api/v1` |

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

The project is a Turborepo monorepo. To build for production:

```sh
pnpm build
```

- `apps/api` builds to `dist/` (NestJS)
- `apps/web` builds to `.next/` (Next.js)
- `packages/types` builds to `dist/`

Set production environment variables before starting:

- `apps/api`: `pnpm --filter @scorra/api start`
- `apps/web`: `pnpm --filter web start`

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
