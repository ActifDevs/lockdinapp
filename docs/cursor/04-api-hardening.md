# Phase 4 — API hardening

**Precedes:** Phase 5. **Depends on:** Phase 3 fully complete — every
user-owned table has `user_id` + RLS + per-table middleware already proven.

**Current status (2026-08-24): COMPLETE.** The final reconciliation is
recorded in
`docs/cursor/reports/68-phase4-final-reconciliation-and-closeout.md`.
Phase 4 Slice 1 established the reviewed global auth policy; Slice 2 added
server-authoritative request IDs and verified response/log correlation in
Production. Existing ownership, RLS, request-validation, structured-error,
and logging behavior was re-audited and required no additional Phase 4
implementation.

The global policy is now the sole default route-classification gate. The
remaining router-level `requireAuth` / `optionalAuth` calls are intentional
defense for isolated router mounts and tests; after global authentication
they short-circuit without repeating token verification. They therefore do
not reintroduce opt-in policy dependence or duplicate authentication work.

## What this phase actually is

Phases 2-3 wired auth middleware onto specific routers one at a time,
deliberately scoped narrow so a mistake on one table couldn't take down
another. Phase 4 is where that stops being per-table and becomes a
consistent, repo-wide policy — plus cleanup of anything left over from
testing during the earlier phases that shouldn't ship.

This is also the phase to fix the class of bug that's easy to introduce
without noticing across four separate table-by-table PRs: a route that
*looks* like it checks `req.userId` but actually still has a code path that
reads `user_id` from somewhere else, left over from before the middleware
existed.

## Step-by-step

### 1. Decide what's actually public

`routes/subjects.ts` and `routes/syllabus.ts` serve shared reference data —
there's a real argument that these don't need per-request auth at all, since
the Cambridge syllabus structure isn't a secret and isn't user-specific.
But "publicly cacheable, no auth" and "must be logged in, but sees the same
data as everyone else" are different product decisions with different
security postures (the second at least rate-limits by identity and gives you
audit trails). This is not purely a technical call — list every route,
mark each as public / authenticated-shared / authenticated-owned, and get
explicit sign-off before writing the middleware wiring, rather than
defaulting to "just require auth on everything" or "just leave it all open"
without anyone having actually decided.

`/api/healthz` on port 3001 stays public, full stop — infra/monitoring needs
to hit it without a token.

### 2. Make auth middleware the default, not opt-in per router

Currently (post Phase 2-3) each user-owned router individually imports and
applies `requireAuth`. Move it to apply globally in `express-app.ts` (or
`routes/index.ts`) ahead of the router mount, with an explicit allowlist for
the routes decided in step 1:

```ts
const PUBLIC_PATHS = new Set(["/healthz"]);

app.use("/api", (req, res, next) => {
  if (PUBLIC_PATHS.has(req.path)) return next();
  return requireAuth(req, res, next);
});
app.use("/api", router);
```

The point of moving to global-by-default is that it changes the failure
mode: **forgetting** to add auth to a new route (easy to do, happens
silently) becomes **forgetting** to explicitly exempt a route that should be
public (a deliberate, visible action, harder to do by accident). That
inversion is the actual security win here, not just tidiness.

### 3. Grep for trust-the-client leftovers

Across all four Phase 3 PRs plus the original Phase 2 `tasks` work, search
for every place a route still reads `user_id`/`userId` from `req.body` or
`req.query` rather than `req.userId`:

```bash
grep -rn "req.body.userId\|req.query.userId\|body.data.userId" artifacts/api-server/src/routes/
```

Anything that turns up here is either dead code (safe to delete) or an
actual live bypass of the RLS boundary (fix immediately, this is the exact
"app layer trusts the client, RLS is decorative" failure mode the rules file
warns about). Don't assume it's dead code without checking whether the
frontend actually still sends that field and the route actually still uses
it.

### 4. Validate every request body against the Zod schemas that already exist

`lib/api-zod` has schemas generated from the OpenAPI spec (`CreateTaskBody`,
`UpdateTaskBody`, etc., already used correctly in `routes/tasks.ts` via
`.safeParse`). Confirm every route across the whole API follows this same
pattern — list any route that instead just trusts `req.body` shape and
lets Drizzle be the only thing that catches a malformed request (which will
surface as an ugly 500 with a DB error leaking into the response, not a
clean 400).

### 5. Confirm request correlation IDs are actually useful

`pino-http` is already wired in `express-app.ts` with an `id` field in the
request serializer. Confirm that ID is actually generated per-request (not
`undefined` because nothing sets it) and, ideally, echoed back in an
`X-Request-Id` response header so a frontend error report can be tied back
to a specific server-side log line during a real incident.

## Cursor prompt

```
Read docs/lockdin-architecture-plan.md section 7 and this entire file
(docs/cursor/04-api-hardening.md) before starting. Assume Phases 2-3 are
fully complete for all user-owned tables.

1. List every route currently mounted under routes/index.ts, and classify
   each as: public (no auth needed), authenticated-shared (needs login but
   data isn't per-user, e.g. subjects/syllabus), or authenticated-owned
   (needs login and per-user scoping). Show me this list and wait for my
   sign-off before implementing anything — this is a product decision as
   much as a technical one.
2. Once I confirm the classification, move auth middleware to apply
   globally in express-app.ts (or routes/index.ts) ahead of the router
   mount, with an explicit allowlist for whatever we classified as public.
   Remove the now-redundant per-router middleware wiring from the Phase
   2/3 work if it becomes duplicate.
3. Grep the whole routes directory for any place still reading userId from
   req.body or req.query instead of req.userId. Show me every match before
   changing anything — for each one, tell me whether you think it's dead
   code or a live bypass, and why, before I decide what to do with it.
4. Audit every route for Zod validation via lib/api-zod schemas (following
   the existing tasks.ts pattern). List any route that doesn't validate
   request bodies this way.
5. Confirm pino-http's request ID is actually populated per-request (not
   undefined) and propose adding it as an X-Request-Id response header if
   it isn't already surfaced there.

Do not silently "fix" anything found in step 3 without discussing it with
me first — some of those matches might be intentional and I want to know
before you change behavior on a live-ish system.
```

## Definition of done

- [x] Route classification (public / shared / owned) reviewed and signed
      off before implementation
- [x] Auth middleware applied globally with an explicit, reviewed allowlist
      — no per-router opt-in duplication left over
- [x] Zero routes reading `user_id`/`userId` from client-supplied
      body/query — grep confirms this, not just spot-checking
- [x] Every route validates input via `lib/api-zod` schemas
- [x] Request IDs confirmed populated and surfaced to the client
      for support/debugging

## Rollback

Flipping auth from per-router to global is the riskiest single change here
— if the allowlist is wrong, you either lock out a route that should be
public or leave one open that shouldn't be. Deploy this behind a quick smoke
test hitting every route in the classification list (public routes 200
without a token, owned/shared routes 401 without one) before considering it
done, not after.
