# LOCKDIN — PHASE 7 B5B PRODUCT INTEGRATION + CUTOVER SAFETY

**Report:** 132  
**Date:** 2026-09-04  
**Status:** B5B/B5BR CLOSED AND FROZEN  
**Prior B5B status:** PASS WITH REVIEW NOTES (superseded by B5BR closure in §13)  
**B5BR verdict:** PASS  

**Baseline (pre-freeze):** `9b7527c8c4b3bdfd019ccc08a9f4c82089bafa96` (B5A freeze)  
**Prior:** Report 131 hosted schema catch-up closed  

**Hosted Production after this freeze (unchanged):** migration head `0017_route_reference_immutability`; subjects 9; versions 9; memberships 15; route sets 0; routes 0.  
**Migration `0018`:** repository-frozen only — **NOT** applied hosted.  
**Not performed in freeze:** hosted 0018 apply, catalogue adoption, route publication, Vercel deploy, visibility enablement.

---

## 0. Purpose

Make Lockdin product-ready for the future 16-subject catalogue **before** any hosted catalogue cutover:

1. Explicit subject visibility for new memberships  
2. Assessment route + study-option API/UI  
3. Onboarding + Settings integration  
4. Past Papers route-aware defaults (no route mutation on attempt)  
5. Hosted catalogue cutover safety gate (future use only)  
6. Preserve existing memberships / pins / null routes  

**Not performed:** hosted catalogue import, real route publication, membership repin/backfill, commit/push.

---

## 1. Repository baseline

| Check | Result |
| --- | --- |
| Branch | `main` |
| HEAD | `9b7527c8c4b3bdfd019ccc08a9f4c82089bafa96` |
| `origin/main` | `9b7527c8c4b3bdfd019ccc08a9f4c82089bafa96` |
| Working tree | FROZEN on `main` after B5B/B5BR freeze commit |

---

## 2. Visibility design

**Mechanism (B5B initial):** `subjects.selectable_for_new_memberships boolean NOT NULL DEFAULT true`  
**Corrected in B5BR (§13):** `DEFAULT false` + current-nine backfill to `true`.

| Surface | Behavior |
| --- | --- |
| `GET /api/subjects` | Only `selectable_for_new_memberships = true` |
| `GET /api/subjects/assignment-sessions` | Same filter |
| `GET /api/subjects/:id` | Still resolves any subject (owned access) |
| `GET /api/user-subjects` | Returns owned memberships regardless of visibility |
| Onboarding / Settings catalogue | Uses filtered list |
| Owned hidden subjects | Settings “Subjects you already study” + membership APIs |

**Fail-safe:** new subjects should be inserted with `selectable_for_new_memberships = false` until owner opens visibility.

**Current nine:** migration default `true` — remain selectable.

---

## 3. Schema changes

**Migration:** `0018_subject_visibility_and_route_assignment.sql`  
**Does not edit:** `0016`, `0017`

Adds:

- visibility column  
- `lockdin_published_route_set_id`  
- `lockdin_resolve_route_assignment` (version-scoped; null route allowed when no published set)  
- `lockdin_assign_membership_route` (intentional mutation; never changes pin)  
- patched onboarding/replace apply with selectable checks + optional `p_route_assignments`  
- route-aware wrapper overloads for PostgREST  

**No automatic `assessment_route_id` backfill.**

---

## 4. API contracts

### Subject catalogue

- `Subject.selectableForNewMemberships`  
- List endpoints omit non-selectable subjects  

### Assignment sessions

- `AssignmentSessionChoice.syllabusVersionId` for unambiguous projections (enables route fetch without client guessing)

### Routes

`GET /subjects/{subjectId}/syllabus-versions/{syllabusVersionId}/assessment-routes`

Returns published route set only:

- `selectionMode`: `none_available` | `auto` | `explicit`  
- routes, components, study-option groups (`minSelections` / `maxSelections`)  
- empty catalogue when no published set (legacy-compatible for current nine)

### Membership

- `UserSubjectMembership.assessmentRouteId` (nullable)  
- `PUT /user-subjects/{subjectId}/assessment-route`  
- Onboarding / replace accept optional `routeAssignments[]`

Server revalidates route/options via SQL resolve helpers.

---

## 5. Product behavior

| Rule | Implementation |
| --- | --- |
| No global AS/A-Level onboarding question for routes | Route step uses published route labels |
| Auto-select when exactly one route | `selectionMode=auto` + SQL resolve |
| Multi-route explicit | UI + `assessment_route_required` |
| Zero published routes | `none_available`; **B5BR:** new membership FAIL CLOSED (`assessment_route_unavailable`); legacy null retained |
| Study options generic | `StudyOptionPicker` driven by min/max |
| Progress denominator | Unchanged — whole pinned syllabus |
| Past Papers | Route components first; off-route allowed with warning; attempt does not mutate route |
| Legacy null route | Subject usable; Settings remediation is intentional mutation only |
| Route change | Same `syllabus_version_id` only via assign RPC |

---

## 6. Hosted cutover safety gate

**Module:** `scripts/src/hosted-cutover/safety-gate.ts`  
**CLI wrappers:** `assertCatalogueMutationAuthorized` on syllabus import/adopt/publish, applicability apply, component catalogue; hosted route path via `assertHostedRoutePublicationAllowed`.

Requires all of:

- `LOCKDIN_ALLOW_HOSTED_CATALOGUE_CUTOVER=1`  
- expected project ref `hazvcdrcvsxmuwdfiucx`  
- non-loopback host fingerprint  
- expected repository freeze commit  
- expected migration head (**caller-supplied**; B5B initially documented `0017` — B5BR removes permanent freeze)  
- backup acknowledgement  
- pre-cutover fingerprint match  

**Local publication:** `LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION` + loopback **unchanged**.

**B5B execution:** gate tested only; **zero** hosted catalogue / route / membership writes.

---

## 7. Visibility cutover sequence (preferred)

1. Deploy schema/API/UI with current nine visible  
2. Verify existing user behavior (null routes OK)  
3. Hosted catalogue adoption of 16 with new seven `selectable=false` (B5C)  
4. Publish route/reference data under cutover gate  
5. Internal verification  
6. Owner toggles new seven `selectable=true`  
7. Controlled beta  

Data cutover stays separated from product exposure.

---

## 8. Tests

Focused coverage added/updated for:

- hosted gate negatives + positive mock  
- visibility defaults / route selection helpers / study-option 1/1, 2/2, 2/3  
- assignment sessions include `syllabusVersionId`  
- membership response includes `assessmentRouteId`  
- local CLI mutation loopback gate  

Fresh migration chain for `0018` should be verified on disposable DB before hosted apply (`pnpm check:migrations` journal integrity PASS; count=19 / head=`0018_subject_visibility_and_route_assignment`).

---

## 9. Hosted safety proof (B5B)

| Check | Result |
| --- | --- |
| Hosted catalogue mutations this slice | **0** |
| Hosted subjects remain | **9** (expected; not mutated) |
| Hosted route sets/routes | **0** |
| Hosted memberships | **15** |
| Gate without flag | DENIED |
| Wrong project/host/commit/migration/fingerprint/backup | DENIED |
| Correct mocked gate | ALLOWED |
| Local publication guard | UNCHANGED |

---

## 10. Remaining blockers / review notes (B5B — superseded by B5BR)

1. Apply `0018` to hosted Production is **not** part of B5B catalogue cutover; schedule as a schema-only migrate under owner authorization before B5C if product deploy needs the column/RPCs.  
2. ~~Full HTTP integration for route-assignment RPC requires local DB with `0018` applied.~~ → closed in B5BR.  
3. Study-option year-mapping relevance UI for History remains manifest-driven; no permanent LO-component invention.  
4. ~~Gate still freezes expected migration head at `0017` until B5C bumps it~~ → closed in B5BR (dynamic exact expectations).

---

## 11. B5C recommendation (B5B-era — see §14)

**NEXT:** OWNER REVIEW + FREEZE B5B/B5BR.

**THEN:** controlled hosted `0018` schema apply + hidden catalogue cutover under the dynamic hosted gate.

**NO** public visibility cutover until hosted catalogue + routes pass integrity.

---

## 12. Final verdict (B5B)

**PASS WITH REVIEW NOTES** — product integration + safety tooling landed; no hosted catalogue adoption; no commit/push.

---

## 13. B5BR closure (2026-09-04) — product-integration hardening

**Status:** B5BR COMPLETE — AWAITING OWNER FREEZE (NO COMMIT / NO PUSH)  
**Baseline HEAD unchanged:** `9b7527c8c4b3bdfd019ccc08a9f4c82089bafa96`  
**Hosted writes:** 0 (migration head remains `0017`; subjects 9 / versions 9 / routes 0 / memberships 15)

### 13.1 Visibility fail-safe

| Property | Result |
| --- | --- |
| Column default | `BOOLEAN NOT NULL DEFAULT false` |
| Current-nine backfill in `0018` | codes `9231,9489,9609,9618,9700,9701,9702,9708,9709` → `true` |
| Future insert omitting visibility | `false` (DB default) |
| Hardcoded only in frontend? | No — DB default is the fail-safe |
| Subject-specific runtime branches? | None |

Backfill is a one-time, bounded `UPDATE … WHERE code IN (…)`. Deterministic for the known pre-0018 catalogue; future subjects inherit `DEFAULT false` without importer memory.

### 13.2 New-membership route contract vs legacy null

| Case | Behavior |
| --- | --- |
| **A — Existing legacy** `assessment_route_id = null` | Remains usable; no automatic backfill; Settings remediation is intentional `PUT …/assessment-route` only; pin unchanged |
| **B — New membership** after route-aware contract | Fail closed when published route count = 0 (`assessment_route_unavailable`); membership/option writes = 0 |
| Single published route | Server auto-resolves |
| Multiple published routes | Explicit route required |
| Option cardinality | Server enforced; invalid → full transaction rollback |

Onboarding/replace always fail-closed for remaining null routes on **new** memberships (even when partial `routeAssignments` are supplied). Retained previously-owned null routes stay null.

### 13.3 Temporary deployment window (0018 + B5B UI, hosted routes still 0)

Would a new user selecting one of the current nine create a route-null membership?

**NO** — once the route-aware membership contract is active, new enrollment fails closed until published routes exist.

That temporarily makes new subject enrollment unavailable until route publication. Safer than creating new legacy debt.

### 13.4 Fresh 0000→0018 reproduction

| Check | Result |
| --- | --- |
| Disposable dedicated harness DB | PASS (`hosted-cutover:b5br-fresh`) |
| Full chain | 0000→0018 PASS |
| Migration count | 19 |
| Head | `0018_subject_visibility_and_route_assignment` |
| Manual repair | NONE |
| Physical default | FALSE |
| Current-nine backfill SQL proof | PASS |
| Future-seven omit-field hide | PASS |
| Zero-route fail-closed | PASS |
| Single auto / multi explicit / cardinality reject | PASS |

### 13.5 HTTP/RPC integration

Extended HTTP seed: selectable HTTP01–06 with published single routes; HTTPZR (zero-route selectable); HTTPHD (hidden); HTTPML (multi + 2/3 options).

Authoritative suite includes `assessment-routes.integration.test.ts` proving:

- hidden omitted from `GET /subjects`; owned hidden accessible  
- version-scoped route catalogue modes + cross-version 404  
- zero-route onboarding fail-closed (0 membership writes)  
- single-route auto onboarding  
- multi + cardinality rollback / success  
- legacy null fetch + no auto-mutation + intentional PUT; pin unchanged  
- cross-version assign rejected  

Full harness HTTP suite: **53 passed** (profile + B5BR + other integration files).

PostgREST: single `lockdin_complete_onboarding` / `lockdin_replace_user_subjects` wrappers with `p_route_assignments jsonb DEFAULT NULL` (drops prior overloads to avoid PGRST203). Option selection inserts include `syllabus_version_id`.

### 13.6 Hosted cutover gate (dynamic)

Callers must supply exact:

- `LOCKDIN_ALLOW_HOSTED_CATALOGUE_CUTOVER=1`  
- `LOCKDIN_EXPECTED_PROJECT_REF` / actual  
- `LOCKDIN_EXPECTED_REPOSITORY_COMMIT` / actual  
- `LOCKDIN_EXPECTED_MIGRATION_HEAD` / actual  
- `LOCKDIN_EXPECTED_PRECUTOVER_FINGERPRINT` / actual  
- `LOCKDIN_HOSTED_BACKUP_CONFIRMED=1`  

No permanent freeze to `0017` or a stale SHA. Stale expected `0017` when actual is `0018` → DENIED. Local publication path (`LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION` + loopback) unchanged and separate.

### 13.7 Final production sequencing (safest)

1. Freeze B5B/B5BR ← **done in this freeze**  
2. Verified hosted backup  
3. Apply **0018 schema-only** on hosted  
4. Adopt/publish hosted catalogue + routes while **new seven remain hidden** (`selectable=false`)  
5. Deploy route-aware API/UI in a tightly controlled window  
6. Verify existing (legacy null OK) + new enrollment (routes required)  
7. Explicitly enable seven new subjects (after B5C; not in B5C)  
8. Controlled beta  

**Invariant:** never create new route-null memberships during rollout.

**Operational requirement for B5C:** after hosted 0018 is applied, current-nine **NEW** enrollment fails closed while hosted route sets remain zero. Therefore 0018 must **NOT** be treated as a comfortable long-lived intermediate Production state.

Preferred B5C controlled window:

1. verified fresh backup  
2. refresh hosted fingerprint/membership snapshot  
3. apply 0018  
4. verify 0018 physical schema  
5. immediately adopt approved catalogue while new seven stay hidden  
6. publish approved 29 route sets / 95 routes  
7. verify resolver + route availability  
8. verify current-nine new enrollment is viable  
9. deploy route-aware API/UI  
10. full integrity + legacy-user verification  
11. keep new seven hidden  
12. owner review before visibility enablement  

No public new-seven visibility in B5C.

### 13.8 Remaining blockers after B5BR / freeze

1. ~~Owner freeze of B5B/B5BR working tree~~ → **CLOSED**  
2. Owner-authorized hosted `0018` schema apply (not done).  
3. B5C hosted catalogue + route publication under dynamic gate (not authorized here).  
4. Study-option year-mapping relevance UI remains manifest-driven (unchanged note).

---

## 14. Final verdict (B5BR)

**PASS** — visibility fail-safe, new-membership fail-closed, fresh 0000→0018 proof, HTTP/RPC integration, and dynamic cutover gate closed. Hosted Production untouched through freeze.

---

## 15. Freeze closeout

**Verdict:** B5B + B5BR CLOSED AND FROZEN.

**NEXT:** B5C — controlled hosted 0018 + hidden 16-subject catalogue + route publication cutover.

**NEW SEVEN MUST REMAIN NON-SELECTABLE.**

**NO PUBLIC VISIBILITY ENABLEMENT IN B5C.**
