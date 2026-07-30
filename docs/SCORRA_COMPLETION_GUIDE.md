# Scorra — Codebase Review & Completion Guide

## TL;DR

You have a well-architected **backend skeleton** for an LLM evaluation platform (upload a dataset → generate/collect model responses → humans score/compare/rank them → analytics & export). The data model and auth are genuinely production-quality. But **the app does not currently compile or run**, because `app.module.ts` and `queue.module.ts` import seven modules and three services that were never written. There is also no frontend at all. Realistically this is **~35–40% done**.

Below: what's real, what's missing, and a build order with enough detail to finish each piece.

---

## 1. What's actually solid

| Piece | Assessment |
|---|---|
| `apps/api/prisma/schema.prisma` | Excellent. Organizations, membership/roles, invitations, API keys, datasets + versioning, dataset rows, model responses, evaluation tasks, single/pairwise/ranking evaluation models, exports, audit log. Well-indexed, sensible cascades. Don't touch this much — extend it. |
| `packages/types/src/*` | Complete shared type contracts (auth, org, dataset, evaluation, comparison, analytics, queue, ai, api). This is your source of truth for DTOs — reuse it, don't duplicate types in the frontend. |
| `modules/auth/*` | Fully implemented: register (with org creation), login, refresh-token rotation, logout, change-password, JWT + local Passport strategies, guards, `@CurrentUser`/`@Public`/`@Roles` decorators. This is ready to use as-is. |
| `common/` (guards, interceptors, filters, decorators, pagination DTO) | Present and wired into `main.ts`. |
| `config/*.config.ts` | app/database/redis/jwt/ai config all present. |
| `docker-compose.yml` | Postgres 16, Redis 7 (with auth), Redis Commander UI, healthchecks. Solid for local dev. |
| `modules/datasets`, `modules/evaluations` | Controllers + services exist and mostly compile logically, but depend on the missing `AiModule`/`AiService` and have one critical stub (see below). |

---

## 2. Why it won't currently build

`apps/api/src/app.module.ts` imports these and **none of the files exist** under `src/modules/`:

- `OrganizationsModule`
- `UsersModule`
- `ComparisonsModule`
- `AnalyticsModule`
- `ExportsModule`
- `AiModule`
- `HealthModule`

`apps/api/src/modules/queue/queue.module.ts` additionally imports:

- `AiService` (from `../ai/ai.service` — doesn't exist)
- `ExportGenerationWorker` (`./workers/export-generation.worker` — doesn't exist)
- `AnalyticsComputationWorker` (`./workers/analytics-computation.worker` — doesn't exist)

Until these exist (even as minimal stubs), `nest build` / `nest start` fails immediately. **This is step zero.**

There's also a stub disguised as a real implementation: `datasets/dataset-processor.service.ts` has a `parseFile()` method whose CSV/JSON/JSONL branches all just `return []` — dataset upload processing doesn't actually parse anything yet, and there's no S3 (or any storage) download logic despite `AWS_*` env vars being defined in `.env.example`.

Other things referenced but absent:
- `apps/api/prisma/seed.ts` (the `db:seed` script points at it)
- `prisma/migrations/` (schema has never been migrated — you're still on `db push` territory)
- Any `*.spec.ts` — zero test coverage, though `jest`/`ts-jest` are configured
- A `Dockerfile` for the API itself (compose only runs postgres/redis/redis-commander, not the app)
- `apps/web` — no frontend workspace exists at all, despite CORS/`FRONTEND_URL` being configured for one
- `README.md`

---

## 3. Recommended build order

Do these roughly in order — each unblocks the next.

### Step 1 — Make it boot (stub the missing modules)
Create minimal `*.module.ts` files for `Organizations`, `Users`, `Comparisons`, `Analytics`, `Exports`, `Ai`, `Health` so `AppModule` resolves. `HealthModule` should be real immediately (it's cheap and useful — a `/api/v1/health` endpoint hitting Prisma + Redis). The rest can be empty `@Module({})` shells initially, filled in later steps.

```ts
// src/modules/health/health.module.ts
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({ imports: [PrismaModule], controllers: [HealthController] })
export class HealthModule {}
```

```ts
// src/modules/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

Also add stub workers so `QueueModule` resolves:
```ts
// src/modules/queue/workers/export-generation.worker.ts
// src/modules/queue/workers/analytics-computation.worker.ts
```
each with a `@Processor(QueueName.X)` class with one `@Process()` method that just logs and returns — fill in real logic in Step 5.

Once these exist, `npm run build` (turbo → nest build) and `npm run dev` should get you a booting API with Swagger at `/api/docs`.

### Step 2 — Database: migrations + seed
- Run `docker-compose up -d` for postgres/redis.
- `cd apps/api && npx prisma migrate dev --name init` to generate your first real migration (stop using `db push` once this exists).
- Write `apps/api/prisma/seed.ts`: create one organization, one `SUPER_ADMIN`/`ORG_ADMIN` user (hash password with bcrypt, 12 rounds, matching `auth.service.ts`), maybe a sample dataset + a few rows, so you have something to log into immediately.

### Step 3 — AiService (this is the product's core differentiator)
Referenced by `ai-evaluation.worker.ts` already: `aiService.evaluateResponse({ prompt, response, context, expectedOutput, criteria })` must return an `AIEvaluationResult` (already typed in `packages/types/src/ai.types.ts`):

```ts
export interface AIEvaluationResult {
  scores: Record<string, number>;
  overallScore: number;
  reasoning: string;
  hallucinationDetection: HallucinationDetectionResult;
  qualityLabel: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  confidence: number;
  tokensUsed: number;
  latencyMs: number;
}
```

Build `modules/ai/ai.service.ts` using the `@anthropic-ai/sdk` (or `openai`) dependency already in `package.json`. Practical approach: one structured-output prompt that asks the model to score against `scoringCriteria`, judge factual grounding against `expectedOutput`/`context`, and return JSON matching the shape above — parse and validate it (Zod, already a dependency) before persisting. Wrap in try/catch with sane fallbacks (partial credit / `confidence: 0` on parse failure), and record `latencyMs`/`tokensUsed` from the response.

While you're in this module, also implement the other `ai.types.ts` capabilities if you want them live: `detectHallucination`, `summarizeFeedback`, `suggestAutoLabel`, `analyzeEvaluatorDisagreement` — these are typed but have no implementation anywhere.

### Step 4 — Fix dataset ingestion
`dataset-processor.service.ts` needs two things it currently lacks:
1. **File storage.** Decide: S3 (env vars already scaffolded) or local disk for dev. Add a small `StorageService` with `upload(buffer, key)` / `download(key)` — swap S3 SDK in later if you start local.
2. **Real parsing** in `parseFile()`: the `csv-parse` dependency is already installed but unused — wire up `parse(fileContent, { columns: true, skip_empty_lines: true })` for CSV, `JSON.parse` for JSON, line-split + `JSON.parse` per line for JSONL. Map into the row shape the batch-insert already expects (`prompt`, `promptType`, `context`, `expectedOutput`, `metadata`, `tags`).

Also wire the actual upload endpoint: `datasets.controller.ts` should accept a `multipart/form-data` upload (Multer is already a dependency), push the file to storage, create the `Dataset` row as `PENDING`, then enqueue a `dataset-processing` job — check whether this exists already in `datasets.service.ts`/`datasets.controller.ts` before rebuilding it; it may be partially there.

### Step 5 — Build out the missing feature modules
Each follows the same pattern as `auth`/`datasets`/`evaluations` (controller + service + DTOs, guarded by `JwtAuthGuard` + `@Roles`):

- **`OrganizationsModule`** — CRUD on `Organization`, member invite/accept flow (schema already has `Invitation`), member role management.
- **`UsersModule`** — profile CRUD, admin user management within an org.
- **`ComparisonsModule`** — pairwise comparison workflow, mirroring `evaluations.service.ts`'s "get next item" pattern but against `PairwiseComparison`/`ModelResponse` A/B, plus `RankingResult`/`RankingEntry` for the ranking evaluation type.
- **`AnalyticsModule`** — inter-rater agreement (Cohen's kappa or simple percent-agreement across `Evaluation.overallScore`), score trends over time, evaluator throughput/quality metrics. This is what `AnalyticsComputationWorker` should actually compute and probably cache (Redis or a materialized table) rather than compute on every request.
- **`ExportsModule`** — given a `taskId` + filters, pull `Evaluation`/`PairwiseComparison`/`RankingResult` rows, serialize to JSONL/CSV/JSON, upload to storage, mark the `Export` row `READY` with `fileUrl`. This is what `ExportGenerationWorker` should do.

### Step 6 — Tests
Nothing exists yet. Prioritize: `auth.service.spec.ts` (register/login/refresh edge cases — you have real logic to test), then service-level tests for evaluations/comparisons using Nest's testing module + a mocked `PrismaService` or a real test database via `docker-compose`.

### Step 7 — Frontend
There is no `apps/web`. Given the workspace is already `turbo`-based with `apps/*` in the workspace glob, the natural move is a Next.js app in `apps/web` consuming `@scorra/types` directly for full type safety against the API. Rough page list based on the schema: auth (login/register), dataset upload + list, evaluation task creation, the evaluator's "next item" screen (single score / pairwise A-B / ranking, matching `EvaluationType`), an analytics dashboard, and export management. This is a substantial separate effort — happy to help scaffold it once the API is solid.

### Step 8 — Ops polish
- `Dockerfile` for `apps/api` (multi-stage: install → `prisma generate` → `nest build` → slim runtime image).
- Add the api service itself to `docker-compose.yml` so `docker-compose up` gives you the whole stack.
- CI (GitHub Actions): lint + type-check + test on PR, at minimum.
- `README.md` covering setup (this doc can seed it).

---

## 4. Quick-start once Step 1 is done

```bash
docker-compose up -d          # postgres + redis
cp apps/api/.env.example apps/api/.env
npm install
npm run db:generate
npx prisma migrate dev --name init --schema apps/api/prisma/schema.prisma
npm run dev                   # turbo runs `nest start --watch` for apps/api
# Swagger: http://localhost:3001/api/docs
```

---

## 5. Priority checklist

- [ ] Stub `Organizations`, `Users`, `Comparisons`, `Analytics`, `Exports`, `Ai` modules + `Health` (real) so the app boots
- [ ] Stub `ExportGenerationWorker`, `AnalyticsComputationWorker`
- [ ] First Prisma migration + `seed.ts`
- [ ] Real `AiService.evaluateResponse()` implementation
- [ ] Real `dataset-processor.service.ts` file parsing + storage integration
- [ ] Dataset upload endpoint end-to-end (upload → storage → queue → parsed rows)
- [ ] Comparisons module (pairwise + ranking workflows)
- [ ] Analytics module (agreement metrics, trends)
- [ ] Exports module (generate + download)
- [ ] Tests for auth, evaluations, comparisons
- [ ] API Dockerfile + add to compose
- [ ] `apps/web` frontend
- [ ] README

This should be enough to hand to yourself (or a collaborator) and pick up work section by section without re-deriving the architecture each time.
