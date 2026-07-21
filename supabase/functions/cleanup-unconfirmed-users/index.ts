import { createClient } from "npm:@supabase/supabase-js@2";

type CleanupUserLog = {
  user_id: string;
  email: string | null;
  created_at: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  action_taken: "dry_run" | "skipped" | "error";
  reason: string;
};

type CleanupSummary = {
  run_id: string;
  started_at: string;
  finished_at: string;
  dry_run: true;
  candidate_count: number;
  deleted_count: 0;
  skipped_count: number;
  errors_count: number;
  users: CleanupUserLog[];
};

const DEFAULT_MIN_AGE_HOURS = 48;
const DEFAULT_MAX_DELETE_PER_RUN = 25;
const DEFAULT_PER_PAGE = 1000;
const DEFAULT_MAX_SCAN_PAGES = 50;

function getBooleanEnv(name: string, defaultValue: boolean): boolean {
  const value = Deno.env.get(name);

  if (!value) return defaultValue;

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function getPositiveIntegerEnv(name: string, defaultValue: number): number {
  const value = Number(Deno.env.get(name));

  if (!Number.isInteger(value) || value <= 0) return defaultValue;

  return value;
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function getJsonBody(req: Request): Promise<Record<string, unknown>> {
  if (req.method !== "POST") return {};

  const contentType = req.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) return {};

  try {
    return await req.json();
  } catch {
    return {};
  }
}

function isOlderThan(dateValue: string | null | undefined, minAgeHours: number): boolean {
  if (!dateValue) return false;

  const createdAt = new Date(dateValue).getTime();

  if (Number.isNaN(createdAt)) return false;

  const minAgeMs = minAgeHours * 60 * 60 * 1000;

  return Date.now() - createdAt > minAgeMs;
}

Deno.serve(async (req) => {
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const users: CleanupUserLog[] = [];
  let candidateCount = 0;
  let skippedCount = 0;
  let errorsCount = 0;

  try {
    if (req.method !== "POST") {
      return Response.json(
        {
          run_id: runId,
          error: "method_not_allowed",
          message: "Use POST to run cleanup-unconfirmed-users in dry-run mode.",
        },
        { status: 405 },
      );
    }

    const body = await getJsonBody(req);
    const configuredDryRun = getBooleanEnv("DRY_RUN", true);
    const dryRun = true;
    const requestedDryRun = body.dry_run ?? body.dryRun;
    const minAgeHours = getPositiveIntegerEnv("CLEANUP_MIN_AGE_HOURS", DEFAULT_MIN_AGE_HOURS);
    const maxDeletePerRun = getPositiveIntegerEnv("MAX_DELETE_PER_RUN", DEFAULT_MAX_DELETE_PER_RUN);
    const perPage = getPositiveIntegerEnv("CLEANUP_LIST_PER_PAGE", DEFAULT_PER_PAGE);
    const maxScanPages = getPositiveIntegerEnv("CLEANUP_MAX_SCAN_PAGES", DEFAULT_MAX_SCAN_PAGES);
    const requireNoLastSignIn = getBooleanEnv("REQUIRE_NO_LAST_SIGN_IN", true);
    const requireRunSecret = getBooleanEnv("REQUIRE_CLEANUP_RUN_SECRET", true);
    const runSecret = Deno.env.get("CLEANUP_RUN_SECRET");

    if (requireRunSecret && !runSecret) {
      return Response.json(
        {
          run_id: runId,
          error: "missing_cleanup_run_secret",
          message: "CLEANUP_RUN_SECRET is required for cleanup-unconfirmed-users.",
        },
        { status: 500 },
      );
    }

    if (runSecret && req.headers.get("x-cleanup-secret") !== runSecret) {
      return Response.json(
        {
          run_id: runId,
          error: "unauthorized",
          message: "Invalid cleanup run secret.",
        },
        { status: 401 },
      );
    }

    if (configuredDryRun !== true || requestedDryRun === false) {
      console.warn(JSON.stringify({
        run_id: runId,
        event: "forced_dry_run",
        configured_dry_run: configuredDryRun,
        requested_dry_run: requestedDryRun,
      }));
    }

    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    for (let page = 1; page <= maxScanPages && candidateCount < maxDeletePerRun; page += 1) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        errorsCount += 1;
        console.error(JSON.stringify({
          run_id: runId,
          event: "list_users_error",
          page,
          reason: error.message,
        }));
        break;
      }

      const pageUsers = data?.users || [];

      if (pageUsers.length === 0) break;

      for (const listedUser of pageUsers) {
        if (candidateCount >= maxDeletePerRun) break;

        const listedEmailConfirmedAt = listedUser.email_confirmed_at ?? null;
        const listedCreatedAt = listedUser.created_at ?? null;
        const listedLastSignInAt = listedUser.last_sign_in_at ?? null;

        if (listedEmailConfirmedAt !== null) continue;
        if (!isOlderThan(listedCreatedAt, minAgeHours)) continue;
        if (requireNoLastSignIn && listedLastSignInAt !== null) continue;

        candidateCount += 1;

        const { data: revalidatedData, error: revalidateError } =
          await supabaseAdmin.auth.admin.getUserById(listedUser.id);

        if (revalidateError || !revalidatedData?.user) {
          errorsCount += 1;
          users.push({
            user_id: listedUser.id,
            email: listedUser.email ?? null,
            created_at: listedCreatedAt,
            email_confirmed_at: listedEmailConfirmedAt,
            last_sign_in_at: listedLastSignInAt,
            action_taken: "error",
            reason: revalidateError?.message || "revalidation_failed",
          });
          continue;
        }

        const user = revalidatedData.user;
        const emailConfirmedAt = user.email_confirmed_at ?? null;
        const createdAt = user.created_at ?? null;
        const lastSignInAt = user.last_sign_in_at ?? null;

        if (emailConfirmedAt !== null) {
          skippedCount += 1;
          users.push({
            user_id: user.id,
            email: user.email ?? null,
            created_at: createdAt,
            email_confirmed_at: emailConfirmedAt,
            last_sign_in_at: lastSignInAt,
            action_taken: "skipped",
            reason: "email_confirmed_after_listing",
          });
          continue;
        }

        if (!isOlderThan(createdAt, minAgeHours)) {
          skippedCount += 1;
          users.push({
            user_id: user.id,
            email: user.email ?? null,
            created_at: createdAt,
            email_confirmed_at: emailConfirmedAt,
            last_sign_in_at: lastSignInAt,
            action_taken: "skipped",
            reason: "created_at_no_longer_eligible",
          });
          continue;
        }

        if (requireNoLastSignIn && lastSignInAt !== null) {
          skippedCount += 1;
          users.push({
            user_id: user.id,
            email: user.email ?? null,
            created_at: createdAt,
            email_confirmed_at: emailConfirmedAt,
            last_sign_in_at: lastSignInAt,
            action_taken: "skipped",
            reason: "has_last_sign_in_at",
          });
          continue;
        }

        users.push({
          user_id: user.id,
          email: user.email ?? null,
          created_at: createdAt,
          email_confirmed_at: emailConfirmedAt,
          last_sign_in_at: lastSignInAt,
          action_taken: "dry_run",
          reason: "candidate_would_be_deleted_by_admin_delete_user",
        });
      }

      if (pageUsers.length < perPage) break;
    }

    const finishedAt = new Date().toISOString();
    const summary: CleanupSummary = {
      run_id: runId,
      started_at: startedAt,
      finished_at: finishedAt,
      dry_run: true,
      candidate_count: candidateCount,
      deleted_count: 0,
      skipped_count: skippedCount,
      errors_count: errorsCount,
      users,
    };

    return Response.json(summary);
  } catch (error) {
    errorsCount += 1;
    const finishedAt = new Date().toISOString();
    const message = error instanceof Error ? error.message : "Unknown error";

    console.error(JSON.stringify({
      run_id: runId,
      event: "cleanup_failed",
      started_at: startedAt,
      finished_at: finishedAt,
      dry_run: true,
      candidate_count: candidateCount,
      deleted_count: 0,
      skipped_count: skippedCount,
      errors_count: errorsCount,
      reason: message,
    }));

    return Response.json(
      {
        run_id: runId,
        started_at: startedAt,
        finished_at: finishedAt,
        dry_run: true,
        candidate_count: candidateCount,
        deleted_count: 0,
        skipped_count: skippedCount,
        errors_count: errorsCount,
        error: message,
        users,
      },
      { status: 500 },
    );
  }
});
