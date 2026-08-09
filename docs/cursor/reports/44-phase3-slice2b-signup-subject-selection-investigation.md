# Phase 3 Slice 2B — Signup Subject-Selection Investigation

## Executive Summary

QA reported that subject selection during signup/onboarding was not
functioning and remained a blocker, while also noting Slice 2B itself did not
appear to be the cause. Independent investigation against the Slice 2B Preview
and the shared hosted database verified the real failure mode and cleared the
onboarding control path on the Slice 2B Preview.

**Verified cause of catalogue failure on Production (and any pre-Slice-2B
deploy against the current hosted DB):** hosted Migration `0007` has already
been applied. `syllabus_topics.status` and `syllabus_topics.notes` no longer
exist, but Production (`main`, `lockedin-study.vercel.app`) still
`SELECT`s those columns via Drizzle when serving `GET /api/subjects`, which
returns HTTP 500. Onboarding then renders an empty subject list (previously
with no error UI), so selection appears broken.

**Slice 2B Preview path:** `GET /api/subjects` returns 200 with nine
catalogue subjects; toggle, 1–5 enforcement, and complete-onboarding succeed
in Chromium, WebKit, and iPhone-class Playwright runs.

This session did not promote Production and did not re-apply hosted DDL.

## Environments

| Surface | Branch / commit | `GET /api/subjects` | Hosted schema |
| --- | --- | --- | --- |
| Slice 2B Preview | `phase3-s2b-legacy-topic-cleanup` @ `44760f3` (pre-fix) | **200**, 9 subjects | `status`/`notes` **absent** |
| Production | `main` @ `dpl_AoqvR84…` (2026-08-07) | **500** | same hosted DB |
| Hosted journal | — | — | exactly `0000`–`0007`; row 8 hash matches `0007_eager_squadron_supreme.sql` byte-for-byte |

Hosted `syllabus_topics` columns observed:
`id, unit_id, subject_id, title, order_index`.

Production Vercel log excerpt (cause string):

```text
Failed query: select "id", "unit_id", "subject_id", "title", "status", "notes", "order_index"
from "syllabus_topics"
params: : column "status" does not exist
```

Report 43 recorded that Slice 2B applied `0007` only to local loopback and
performed no hosted cutover. Hosted evidence now shows `0007` is present
(journal timestamp `2026-08-09T19:12:50.787Z`). Provenance of that hosted
apply is a separate process finding; it is not re-investigated here beyond
recording the mismatch.

## Active signup / onboarding subject-selection path

1. `/signup` creates Auth user (email confirm may be required).
2. Authenticated, not-onboarded users are routed to `/onboarding`.
3. Step 3 loads the shared catalogue via `useListSubjects` → `GET /api/subjects`.
4. Selection uses `toggleSubjectSelection` / `canProceedWithSubjects`
   (approved 1–5 rule) in `onboarding-logic.ts`.
5. Finish calls `POST /api/profile/complete-onboarding` with `subjectIds`
   (server also enforces 1–5).

There is no subject picker on the `/signup` form itself; selection is
onboarding step 3 after signup/login.

## Preview verification (Slice 2B)

Against
`https://lockedinapp-9jhvvacz0-gidiprogrammers-projects.vercel.app/`
at commit `44760f3409dfa7017fb108eb81f36de6d310865e`:

| Check | Result |
| --- | --- |
| Catalogue load | 9 subjects, HTTP 200 |
| Display | All nine rendered as `aria-pressed` buttons |
| Toggle | `Selected 0 / 5` → `3 / 5`; pressed count matches |
| Hit-test (Chromium + WebKit) | Top element at button center is the button; grain `::before` has `pointer-events: none` |
| Max-5 UI | Existing disable + “Maximum reached” copy present in source |
| Finish | `complete-onboarding` → `/dashboard` |

Unit coverage already asserts the complete 1–5 boundary in
`onboarding-logic.test.ts`. API profile route rejects `<1` / `>5` /
duplicates before the RPC.

## Focused corrections on this branch

1. **Onboarding catalogue failure UX** — surface `subjectsError` with Retry;
   show empty/search-empty status instead of a silent blank list.
2. **Catalogue topic-count queries** — `GET /api/subjects` and
   `GET /api/subjects/:id` project only the columns needed for
   `topicsTotal`, so list/detail no longer depend on a full topic-row select.

These do not change the 1–5 rule or onboarding RPC. They make load failures
visible and harden catalogue reads against legacy column assumptions.

## What remains out of scope / Owner decisions

1. **Production recovery** — Production must run code that does not select
   dropped `status`/`notes` (Slice 2B Preview already does). Promoting or
   hot-fixing Production is a separate authorized deploy.
2. **Hosted `0007` provenance** — journal/DDL already match committed
   `0007_eager_squadron_supreme.sql` despite Report 43’s “no hosted”
   statement; treat as a process gap for Owner review.
3. **No merge** into `phase3-multitenancy` from this investigation.

## QA retest guidance

Retest only the Slice 2B Preview built from the commit that includes this
report (not Production `lockedin-study.vercel.app`):

1. Open the new Preview URL from the post-push deployment.
2. Sign up or sign in as a not-onboarded user → `/onboarding`.
3. Step 3: confirm nine subjects load; select 1, then up to 5; confirm the
   sixth stays disabled / max copy appears; deselect and change selection.
4. Finish setup → land on dashboard with chosen subjects.

If Production signup is tested before a Production code deploy, expect
catalogue failure until Production no longer queries the dropped columns.
