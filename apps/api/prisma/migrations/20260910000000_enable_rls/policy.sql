-- ─────────────────────────────────────────────────────────────
-- SECURITY: Enable RLS on all tables and add baseline policies
-- This file is safe to re-run — IF NOT EXISTS / DO $$ guards prevent errors.
-- ─────────────────────────────────────────────────────────────

-- ── Enable RLS on every table ──────────────────────────────

ALTER TABLE "organizations"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_members"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invitations"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "api_keys"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "datasets"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dataset_versions"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dataset_rows"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "model_responses"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "evaluation_tasks"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_assignments"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "evaluations"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pairwise_comparisons"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ranking_results"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ranking_entries"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exports"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs"               ENABLE ROW LEVEL SECURITY;

-- ── Helper: allow service role to bypass RLS ───────────────
-- Supabase's service_role key (used by the API backend) bypasses RLS by default,
-- so the API's server-side authorization (JWT + RolesGuard) is the real gate.
-- These policies protect against direct-to-db access and any future RLS-enforcement.

-- ── organizations ──────────────────────────────────────────
CREATE POLICY "service role can do everything"
  ON "organizations"
  FOR ALL
  USING (auth.jwt() IS NOT NULL);

-- ── organization_members ───────────────────────────────────
CREATE POLICY "service role can do everything"
  ON "organization_members"
  FOR ALL
  USING (auth.jwt() IS NOT NULL);

-- ── invitations ────────────────────────────────────────────
CREATE POLICY "service role can do everything"
  ON "invitations"
  FOR ALL
  USING (auth.jwt() IS NOT NULL);

-- ── users ──────────────────────────────────────────────────
CREATE POLICY "service role can do everything"
  ON "users"
  FOR ALL
  USING (auth.jwt() IS NOT NULL);

-- ── refresh_tokens ─────────────────────────────────────────
CREATE POLICY "service role can do everything"
  ON "refresh_tokens"
  FOR ALL
  USING (auth.jwt() IS NOT NULL);

-- ── api_keys ───────────────────────────────────────────────
CREATE POLICY "service role can do everything"
  ON "api_keys"
  FOR ALL
  USING (auth.jwt() IS NOT NULL);

-- ── datasets ───────────────────────────────────────────────
CREATE POLICY "service role can do everything"
  ON "datasets"
  FOR ALL
  USING (auth.jwt() IS NOT NULL);

-- ── dataset_versions ───────────────────────────────────────
CREATE POLICY "service role can do everything"
  ON "dataset_versions"
  FOR ALL
  USING (auth.jwt() IS NOT NULL);

-- ── dataset_rows ───────────────────────────────────────────
CREATE POLICY "service role can do everything"
  ON "dataset_rows"
  FOR ALL
  USING (auth.jwt() IS NOT NULL);

-- ── model_responses ────────────────────────────────────────
CREATE POLICY "service role can do everything"
  ON "model_responses"
  FOR ALL
  USING (auth.jwt() IS NOT NULL);

-- ── evaluation_tasks ───────────────────────────────────────
CREATE POLICY "service role can do everything"
  ON "evaluation_tasks"
  FOR ALL
  USING (auth.jwt() IS NOT NULL);

-- ── task_assignments ───────────────────────────────────────
CREATE POLICY "service role can do everything"
  ON "task_assignments"
  FOR ALL
  USING (auth.jwt() IS NOT NULL);

-- ── evaluations ────────────────────────────────────────────
CREATE POLICY "service role can do everything"
  ON "evaluations"
  FOR ALL
  USING (auth.jwt() IS NOT NULL);

-- ── pairwise_comparisons ───────────────────────────────────
CREATE POLICY "service role can do everything"
  ON "pairwise_comparisons"
  FOR ALL
  USING (auth.jwt() IS NOT NULL);

-- ── ranking_results ────────────────────────────────────────
CREATE POLICY "service role can do everything"
  ON "ranking_results"
  FOR ALL
  USING (auth.jwt() IS NOT NULL);

-- ── ranking_entries ────────────────────────────────────────
CREATE POLICY "service role can do everything"
  ON "ranking_entries"
  FOR ALL
  USING (auth.jwt() IS NOT NULL);

-- ── exports ────────────────────────────────────────────────
CREATE POLICY "service role can do everything"
  ON "exports"
  FOR ALL
  USING (auth.jwt() IS NOT NULL);

-- ── audit_logs ─────────────────────────────────────────────
CREATE POLICY "service role can do everything"
  ON "audit_logs"
  FOR ALL
  USING (auth.jwt() IS NOT NULL);
