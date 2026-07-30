# Scorra — Build Plan

> **Vision:** Scorra is the Quality Operating System for AI applications. It helps teams evaluate, test, monitor, and continuously improve LLM-powered products through human-in-the-loop evaluation, AI-assisted review, regression testing, and quality analytics.
>
> **Principles:** Human-in-the-loop by default · AI accelerates, humans validate · Quality is measurable · Every AI change should be testable · Every deployment should be backed by evidence.

---

## Phase 0 — Foundation (v0.1) ✅ DONE

**Goal:** Production-ready backend that boots, authenticates users, and runs background jobs.

### 0.1 — Make It Boot ✅ DONE

The app previously wouldn't compile — `app.module.ts` imported 7 modules that didn't exist, and `queue.module.ts` imported 2 workers and a service that didn't exist.

| # | File | Status |
|---|------|--------|
| 0.1.1 | `src/modules/health/health.module.ts` | ✅ Real — imports HealthController |
| 0.1.2 | `src/modules/health/health.controller.ts` | ✅ Real — `GET /api/v1/health`, DB ping, `@Public()` |
| 0.1.3 | `src/modules/organizations/organizations.module.ts` | ✅ Stub — empty shell |
| 0.1.4 | `src/modules/users/users.module.ts` | ✅ Stub — empty shell |
| 0.1.5 | `src/modules/comparisons/comparisons.module.ts` | ✅ Stub — empty shell |
| 0.1.6 | `src/modules/analytics/analytics.module.ts` | ✅ Stub — empty shell |
| 0.1.7 | `src/modules/exports/exports.module.ts` | ✅ Stub — empty shell |
| 0.1.8 | `src/modules/ai/ai.module.ts` | ✅ Real stub — provides + exports AiService |
| 0.1.9 | `src/modules/ai/ai.service.ts` | ✅ Stub — returns placeholder AIEvaluationResult |
| 0.1.10 | `src/modules/queue/workers/export-generation.worker.ts` | ✅ Stub — logs and returns |
| 0.1.11 | `src/modules/queue/workers/analytics-computation.worker.ts` | ✅ Stub — logs and returns |
| 0.1.12 | `src/modules/queue/queue.module.ts` | ✅ Fixed — imports AiModule instead of providing AiService directly |

**Acceptance:** `pnpm run build` succeeds. `pnpm run dev` boots. `GET /api/v1/health` → `200`.

### 0.2 — Database Foundation ✅ DONE

**Why:** No migrations exist (only `db push`). No seed data means manual setup every time.

- [x] Create `.env` file with DATABASE_URL, Redis, JWT, and app config
- [x] Add `prisma.seed` config to `package.json`
- [x] Write `apps/api/prisma/seed.ts` with full demo data
- [x] Run Docker: `docker-compose up -d`
- [x] Generate Prisma client: `pnpm exec prisma generate`
- [x] Run first Prisma migration: `pnpm exec prisma migrate dev --name init`
- [x] Run seed: `pnpm exec prisma db seed`

**Seed data included:** 1 org, 3 users (admin + 2 evaluators), 8-row dataset with realistic customer support prompts, 16 model responses (GPT-4o vs Claude 3 Haiku per prompt), 2 evaluation tasks (single + pairwise), 4 pre-submitted evaluations for demo analytics. Login: `admin@scorra.dev` / `password123`.

**Acceptance:** `pnpm exec prisma db seed` populates the DB. Login works. Swagger shows all endpoints.

### 0.3 — Infrastructure ✅ DONE

| Component | Status |
|-----------|--------|
| Authentication (JWT + refresh token rotation) | ✅ |
| Audit Logs (schema) | ✅ |
| API Versioning (`/api/v1/...`) | ✅ |
| BullMQ Workers (5 queues registered) | ✅ |
| Redis (docker-compose) | ✅ |
| Prisma (schema + service) | ✅ |
| Docker (compose: postgres, redis, redis-commander) | ✅ |
| Health Checks | ✅ (0.1.2) |
| Swagger (`/api/docs`) | ✅ |
| Rate Limiting (ThrottlerModule) | ✅ |
| Security (Helmet, CORS, validation pipes) | ✅ |

### 0.4 — Manual Verification ✅ DONE

All auth and core endpoints verified via Swagger:

- [x] `POST /api/v1/auth/login` → 200, JWT tokens returned
- [x] `GET /api/v1/auth/me` → 200, user profile returned
- [x] `POST /api/v1/auth/logout` → 204, tokens revoked
- [x] `GET /api/v1/health` → 200, DB connected
- [x] `GET /api/v1/datasets` → 200, seeded dataset with 8 rows
- [x] `GET /api/v1/evaluations/tasks` → 200, 2 tasks (single + pairwise)
- [x] `GET /api/v1/evaluations/tasks/:id/next` → 200, next eval item returned

> Unit tests (`*.spec.ts`) deferred — manual verification sufficient for v0.1.

### 0.5 — Frontend ✅ DONE

- [x] Scaffold `apps/web` with Next.js 16 + TypeScript + Tailwind
- [x] Add `@scorra/types` as workspace dependency
- [x] API client: `apps/web/src/lib/api.ts` — typed fetch wrapper with JWT, 401 redirect, login/register/logout/me/datasets
- [x] Pages: `/login`, `/register`, `/dashboard`
- [x] `.env.local` with `NEXT_PUBLIC_API_URL`

**Deliverable:** Production-ready API — boots, authenticates, serves datasets + evaluations, verified via Swagger.

---

## Phase 1 — Dataset Hub (v0.1)

**Goal:** Upload, version, search, and manage prompt datasets as reusable assets.

### 1.1 — Fix Dataset File Parsing ✅ DONE

**Why:** The upload pipeline had the skeleton (endpoint, queue, worker) but `parseFile()` returned `[]` for all formats.

- [x] Create `src/common/services/storage.service.ts`:
  - `upload(buffer, key)` / `download(key)` — local disk (default), S3-ready (needs `@aws-sdk/client-s3`)
  - Env vars: `STORAGE_DRIVER=local|s3`, `UPLOAD_DIR`, `AWS_S3_BUCKET`, `AWS_REGION`
- [x] Replace three `return []` stubs in `dataset-processor.service.ts`:
  - CSV via `csv-parse/sync`, JSON via `JSON.parse` (wrap if single object), JSONL via split + map
- [x] Wire storage into upload pipeline: service saves file, worker downloads & parses
- [x] Multer configured with `memoryStorage()` for direct buffer access

**Acceptance:** Upload pipeline: `PENDING → PROCESSING → READY`. Rows batch-inserted at 500/batch.

### 1.2 — Dataset Management Features ✅ DONE

- [x] Dataset metadata editing — `PUT /datasets/:id` (name, description, tags)
- [x] Dataset search — case-insensitive on name + description (already existed in `findAll`)
- [x] Dataset versioning — `createVersion()` / `getVersions()`, `DatasetVersion` model wired
- [x] Dataset cloning — `POST /datasets/:id/clone` (copies dataset + all rows in batches)
- [ ] Dataset sharing between orgs → **deferred** (cross-org invitation system; Phase 2+)

### 1.3 — Tests ✅ DONE (17 passing)

- [x] `datasets.service.spec.ts` — 11 tests: create, findAll, findOne, upload, archive, delete (ownership), clone, versions
- [x] `dataset-processor.service.spec.ts` — 6 tests: CSV, JSON array, JSON single, JSONL, empty, failure
- [x] Jest config created (`jest.config.js`)

### 1.4 — Frontend ✅ DONE

- [x] `/datasets` — list with search, pagination, status badges, create modal
- [x] `/datasets/[id]` — detail, row browser, file upload, inline edit, clone, archive, delete, processing polling
- [x] API client expanded with all dataset endpoints (`lib/api.ts`)

**Deliverable:** Dataset Management Platform — API + UI + tests ✅

---

## Phase 2 — Platform Modules (v0.1)

**Goal:** Organizations, users, comparisons, and exports. The scaffolding that makes the evaluation engine usable by real teams.

### 2.1 — Organizations Module ✅ DONE

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/organizations` | `GET` | JWT | List user's orgs |
| `/organizations/:id` | `GET` | JWT | Get org details |
| `/organizations` | `POST` | JWT | Create org |
| `/organizations/:id` | `PATCH` | ORG_ADMIN | Update org (name, logo, settings) |
| `/organizations/:id/members` | `GET` | JWT | List members |
| `/organizations/:id/members/:userId` | `PATCH` | ORG_ADMIN | Change member role |
| `/organizations/:id/members/:userId` | `DELETE` | ORG_ADMIN | Remove member |
| `/organizations/:id/invitations` | `POST` | ORG_ADMIN | Invite user by email |
| `/invitations/:token/accept` | `POST` | Public | Accept invitation (creates membership) |

### 2.2 — Users Module ✅ DONE

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/users/me` | `GET` | JWT | Current user profile |
| `/users/me` | `PATCH` | JWT | Update name, avatar |
| `/users` | `GET` | ORG_ADMIN | List users in org |
| `/users/:id` | `PATCH` | SUPER_ADMIN | Admin user management (suspend/activate) |

### 2.3 — Comparisons Module ✅ DONE

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/comparisons/:taskId/next` | `GET` | JWT | Next uncompared pair (responseA + responseB) |
| `/comparisons` | `POST` | JWT | Submit verdict (A_BETTER / B_BETTER / TIE / BOTH_BAD) |
| `/rankings/:taskId/next` | `GET` | JWT | Next unranked set of responses |
| `/rankings` | `POST` | JWT | Submit ranking (ordered response IDs + scores) |
| `/comparisons/:taskId/results` | `GET` | JWT | Aggregated comparison results |

### 2.4 — Exports Module ✅ DONE

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/exports` | `POST` | JWT | Request export (taskId, format, filters) |
| `/exports` | `GET` | JWT | List exports for org |
| `/exports/:id/download` | `GET` | JWT | Download ready export file |

### 2.5 — Tests ✅ DONE (partially verified)

- [x] `organizations.service.spec.ts`: CRUD, member management, invitations (8 tests)
- [x] `comparisons.service.spec.ts`: getNextPair, submit verdict, ranking (5 tests)
- [x] `exports.service.spec.ts`: request export, status transitions (4 tests)

### 2.6 — Frontend ✅ DONE

- [x] `/dashboard` — already exists with org overview
- [x] `/settings` — org info, members list, invite flow, role management, remove members
- [x] `/exports` — list exports, download ready exports

**Deliverable:** Multi-tenant platform — teams, roles, comparisons, exports. API + UI + tests. ✅

---

## Phase 3 — Evaluation Engine (v0.2)

**Goal:** Human + AI evaluation across single scoring, pairwise comparison, and ranking.

### 3.1 — Real AI Service

**Why:** `AIEvaluationWorker` calls `aiService.evaluateResponse()` — currently returns a hardcoded placeholder.

- [ ] Implement `ai.service.ts` `evaluateResponse()`:
  - Accepts: `{ prompt, response, context?, expectedOutput?, criteria: string[] }`
  - Builds structured prompt asking the LLM to score each criterion on 1-10
  - Uses `@anthropic-ai/sdk` or `openai` — provider configurable via `AI_PROVIDER` env var
  - Validates parsed JSON with Zod against `AIEvaluationResult` shape
  - Returns `confidence: 0` + default scores on parse failure (fail open)
  - Records `tokensUsed` and `latencyMs` from API response
  - Hallucination detection: cross-reference claims against `expectedOutput`/`context`

**Acceptance:** `POST /api/v1/evaluations/:id/ai-suggestions` → AI eval processes in queue → `aiSuggestions` JSON appears on evaluation record.

### 3.2 — Evaluation Workflow Polish

The `EvaluationsService` is already implemented. Verify and harden:
- [ ] `getNextItem` — confirm it skips already-evaluated rows, handles task completion correctly
- [ ] `submit` — confirm conflict detection on duplicate submissions, event emission
- [ ] `findByTask` / `findByEvaluator` — pagination edge cases, empty results

### 3.3 — Tests

- [ ] `evaluations.service.spec.ts`: getNextItem (none left = completed), submit (duplicate, success), findByTask pagination
- [ ] Integration test: register → login → upload dataset → create task → submit eval → AI suggestions → verify

### 3.4 — Frontend

- [ ] `/tasks` — list evaluation tasks
- [ ] `/tasks/[id]` — task detail, progress bar, evaluator assignments
- [ ] `/tasks/new` — create task (select dataset, choose type, scoring criteria, assign evaluators)
- [ ] `/evaluate/[taskId]` — evaluator screen: fetch next item, score sliders per dimension, comment, submit
- [ ] `/compare/[taskId]` — pairwise A/B comparison screen
- [ ] `/rank/[taskId]` — drag-to-rank interface

**Acceptance:** Full evaluation loop via UI: create org + invite → upload dataset → create task → evaluate + compare → export results.

**Deliverable:** Production Human + AI Evaluation — API + UI + tests.

---

## Phase 4 — AI Judge (v0.2)

**Goal:** AI-assisted evaluation pipeline with calibration and feedback intelligence.

- [ ] AI scoring with per-dimension explanations
- [ ] Confidence scores on AI evaluations
- [ ] Auto-labeling of evaluation comments
- [ ] Feedback summarization across evaluators
- [ ] Evaluator disagreement detection
- [ ] *Future:* Judge calibration (human vs AI agreement tracking)
- [ ] *Future:* Judge reliability scoring

**Already implemented:** `AiService` skeleton, `AIEvaluationWorker` (wired to queue), `AISuggestion` types, `HallucinationDetectionResult` types.

**Deliverable:** AI-assisted evaluation pipeline.

---

## Phase 5 — Quality Analytics (v0.3)

**Goal:** Dashboards and reports that turn evaluation data into actionable quality insights.

### 5.1 — Analytics Module

Build out the stub from Phase 0.1.

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/analytics/tasks/:taskId/agreement` | `GET` | JWT | Inter-rater agreement (agreement rate, Cohen's kappa) |
| `/analytics/tasks/:taskId/scores` | `GET` | JWT | Score distribution, dimension breakdown |
| `/analytics/evaluators` | `GET` | ORG_ADMIN | Evaluator throughput, avg scores, completion rates |
| `/analytics/dashboard` | `GET` | JWT | Org-level overview (tasks, evals, trends) |

- [ ] Pre-compute heavy metrics in `AnalyticsComputationWorker`, cache in Redis with TTL
- [ ] Dashboards: overall quality, accuracy, safety, hallucination rate, fluency, latency, cost
- [ ] Reports: score distributions, trends over time, regression detection, evaluator agreement

### 5.2 — Frontend

- [ ] `/analytics` — charts: agreement rates, score distributions, evaluator metrics, trends

**Deliverable:** AI Quality Dashboard — API + UI.

---

## Phase 6 — Quality Testing (v0.4)

**Goal:** Turn evaluations into reusable, automated regression test suites — "unit tests for AI."

- [ ] Test suites: saved collections of prompts + expected behaviors
- [ ] Saved benchmarks with named baselines
- [ ] Batch evaluation: run 300 prompts × 5 models = 1500 evaluations
- [ ] Evaluation replay: run exact same suite against old model vs new model → regression report
- [ ] Regression reports: pass/fail with dimension-level breakdown

**New Prisma models needed:** `TestSuite`, `TestSuiteItem`, `BenchmarkRun`, `RegressionReport`.

### 6.1 — Frontend

- [ ] `/testing` — test suite management (create, run, results)
- [ ] `/testing/replay` — side-by-side old vs new model comparison

**Deliverable:** AI Unit Testing Platform.

---

## Phase 7 — PromptOps (v0.5)

**Goal:** Git-like version control for prompts — history, diff, rollback.

- [ ] Prompt registry / library
- [ ] Version history for every prompt
- [ ] Prompt diff (visual side-by-side comparison)
- [ ] Rollback to any previous version
- [ ] Prompt metadata (author, intent, performance history)
- [ ] Prompt experiments (A/B with variant tracking)
- [ ] Benchmark history per prompt version

**New Prisma models needed:** `Prompt`, `PromptVersion`, `PromptExperiment`.

### 7.1 — Frontend

- [ ] `/prompts` — prompt library, version history, diff view

**Deliverable:** Prompt Management Platform.

---

## Phase 8 — Experimentation (v0.6)

**Goal:** Structured A/B testing for models and prompts with statistical rigor.

- [ ] Model comparison: run same prompt set against multiple models
- [ ] Champion vs Challenger: register baseline → compare challenger → promote winner
- [ ] Statistical confidence scoring
- [ ] Winner promotion workflow

### 8.1 — Frontend

- [ ] `/experiments` — A/B experiment dashboard, results, winner promotion

**Deliverable:** AI Experiment Platform.

---

## Phase 9 — Continuous Monitoring (v0.7)

**Goal:** Production quality surveillance — catch regressions before users do.

- [ ] Production sampling: auto-ingest outputs via SDK/webhook
- [ ] Scheduled evaluations (daily, weekly, monthly)
- [ ] Quality trend dashboards
- [ ] Regression alerts (hallucination spikes, safety drops)
- [ ] Notifications: Slack, Email, Webhooks

### 9.1 — Frontend

- [ ] `/monitoring` — live quality dashboards, alert configuration

**Deliverable:** Continuous AI Monitoring.

---

## Phase 10 — QualityOps / CI-CD (v0.8)

**Goal:** Quality gates in the deployment pipeline — "tests must pass before merge."

- [ ] GitHub Actions integration
- [ ] CLI: `scorra test run --suite regression --model gpt-5`
- [ ] SDK: `@scorra/sdk` npm package
- [ ] Quality Gates: pass/fail thresholds in CI
- [ ] Approval workflow: human sign-off on quality reports

**Flow:** `Deploy → Run Evaluation Suite → PASS → Ship` / `FAIL → Block Merge`

**Deliverable:** AI Quality CI/CD.

---

## Phase 11 — Enterprise (v1.0)

**Goal:** Sell to organizations with compliance, governance, and scale requirements.

- [ ] SSO / SAML
- [ ] Audit Center (compliance-ready audit trails)
- [ ] Compliance reporting (SOC 2, ISO 27001 readiness)
- [ ] Role-based governance (custom roles, fine-grained permissions)
- [ ] Billing and subscription management
- [ ] Workspace isolation (multi-org, data segregation)
- [ ] On-prem / VPC deployment option

**Deliverable:** Enterprise AI Quality Platform.

---

## Ops Polish (Ongoing)

- [ ] Dockerfile for `apps/api` (multi-stage: install → generate → build → slim runtime)
- [ ] Add `api` service to `docker-compose.yml` (full stack in one command)
- [ ] CI: GitHub Actions — lint, type-check, test, build on PR
- [ ] README: overview, quick start, architecture diagram, env vars, API docs link
- [ ] `.env.example` validation — document all required vars
- [ ] Remove hardcoded secrets from compose (use `.env` interpolation)

---

## Release Roadmap

| Version | Focus | Phases |
|---------|-------|--------|
| **v0.1** | Foundation + Platform | 0, 1, 2 |
| **v0.2** | Evaluation + AI Judge | 3, 4 |
| **v0.3** | Analytics | 5 |
| **v0.4** | Testing | 6 |
| **v0.5** | PromptOps | 7 |
| **v0.6** | Experimentation | 8 |
| **v0.7** | Monitoring | 9 |
| **v0.8** | QualityOps CI/CD | 10 |
| **v1.0** | Enterprise | 11 |

---

## Current Status

**Phase 2 — Platform Modules** → ✅ Complete.

| Phase | Status |
|-------|--------|
| 0 — Foundation | ✅ Migration + seed, JWT, Swagger, Docker |
| 1 — Dataset Hub | ✅ 17 tests, storage pipeline, CSV/JSON/JSONL, CRUD + clone, frontend |
| 2 — Platform Modules | ✅ 4 modules (orgs, users, comparisons, exports), 17 new tests, settings/exports pages |

**Next:** Phase 3 — Evaluation Engine (real AI service + evaluation workflow).
