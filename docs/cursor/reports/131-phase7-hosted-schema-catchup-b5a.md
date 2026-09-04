# LOCKDIN — PHASE 7 B5A HOSTED SCHEMA CATCH-UP (0016 → 0017)

**Report:** 131  
**Date:** 2026-09-04  
**Status:** B5A CLOSED AND FROZEN — NO CATALOGUE CUTOVER  

**Baseline:** `188e9f6f84fd918902e4bd9ba186313955425b3c` (`docs: freeze hosted catalogue cutover preflight`)  
**Prior:** Report 130 B4 NO-GO (hosted behind at `0015`)  

---

## 0. Purpose

Prove a usable logical recovery artifact, rehearse tracked `0016` + `0017` on a restored disposable copy, then apply **exactly** those two migrations to Production hosted Lockdin.

**Authorized hosted writes:** Drizzle migrate `0015 → 0017` only.

**Not authorized / not performed:** catalogue adoption, route publication, membership changes, Vercel, commit/push.

---

## 1. Repository preflight

| Check | Result |
| --- | --- |
| Branch | `main` |
| HEAD | `188e9f6f84fd918902e4bd9ba186313955425b3c` |
| `origin/main` | `188e9f6f84fd918902e4bd9ba186313955425b3c` |
| Working tree at start | CLEAN |

---

## 2. Hosted identity

| Item | Value |
| --- | --- |
| Project | Lockdin-app |
| Project ref | `hazvcdrcvsxmuwdfiucx` |
| Region | `eu-west-1` |
| Environment | Production hosted |
| Connection class | Session pooler (`aws-0-eu-west-1.pooler.supabase.com`) |
| Identity proof | PASS (ref in pooler username; non-loopback) |
| Secrets in report | NONE |

---

## 3. Pre-migration hosted fingerprint

| Metric | Value |
| --- | --- |
| Migration count | **16** |
| Head | `0015_silent_sentinel` |
| 0000–0015 journal hashes | **exact match** tracked SQL SHA-256 |
| Subjects | 9 |
| Syllabus versions | 9 |
| Published | 9 |
| Retired | 0 |
| Memberships | 15 |
| New-seven subject rows | 0 |
| Route/reference tables | ABSENT |
| Feb/Mar `product_auto_assign=true` | 0 |
| Current-nine r001 content hashes | exact-match B3 / Report 130 |
| Baseline drift vs B4 | **NONE** |

### Membership snapshot (aggregates only)

| Subject | Pins |
| --- | --- |
| 9489 | 1 |
| 9700 | 2 |
| 9701 | 4 |
| 9702 | 4 |
| 9708 | 1 |
| 9709 | 3 |
| 9231 / 9609 / 9618 | 0 |

Deterministic membership snapshot SHA-256 (over sorted `user_id|subject_id|syllabus_version_id` lines):

`649a60a12ce103b9177272f47c9dbc5ba21d4ba3a72084b156bcbcfeb189b5b8`

Raw user UUIDs are **not** published in this report.

---

## 4. Recovery artifact

| Item | Value |
| --- | --- |
| Backup created | YES |
| Type | `pg_dump` custom format (`--schema=public --schema=drizzle --no-owner --no-acl`) |
| Created (UTC) | `20260904T200804Z` |
| Size | 253419 bytes |
| SHA-256 | `14398bc9258cc8f47359af8fc3588be1acdd345f8037909c182b683711c110a3` |
| Stored outside repo | YES — `~/lockdin-recovery/b5a/` (mode 700) |
| In Git | NO |
| Secrets exposed | NO |
| TOC validation | PASS (subjects, syllabus graph, exam series, user_subjects, profiles, drizzle journal, resolver functions present) |
| Hosted mutation during dump | NONE (read-only dump) |

Physical PITR remained unavailable (`pitr_enabled=false`, empty physical backup list). Logical dump is the verified recovery path for this slice.

---

## 5. Disposable restore proof

| Item | Value |
| --- | --- |
| Environment | Docker `postgres:17` container `lockdin-b5a-restore` |
| Host | `127.0.0.1:55432` (loopback only) |
| Restore approach | Filtered `pg_restore --no-owner --no-acl`; local stubs for `auth.users`, `auth.uid()`, roles `anon`/`authenticated`/`service_role`, extensions `btree_gist` (+ later `pgcrypto` for focused tests) |
| Restore result | **PASS** |

### Restored pre-migration semantic match

| Check | Result |
| --- | --- |
| Subjects / versions / published / retired | 9 / 9 / 9 / 0 |
| Memberships | 15 |
| Migration head | 0015 (16 rows) |
| Route schema | absent |
| Membership snapshot SHA | exact match |
| Content hashes | exact match |
| New-seven | absent |
| Feb/Mar enabled | 0 |

---

## 6. Migration rehearsal (restored copy)

Mechanism: `pnpm --filter @workspace/db migrate` with explicit `DATABASE_URL`/`DIRECT_DATABASE_URL` = loopback restore URL (`env -i` one-command boundary).

| Step | Result |
| --- | --- |
| 0016_assessment_routes_and_study_options | PASS |
| 0017_route_reference_immutability | PASS |
| Manual repair | NONE |
| Post-rehearsal migration count | **18** |
| Post-rehearsal head | `0017_route_reference_immutability` |

### Disposable post-migration schema

Route/option tables PRESENT; `user_subjects.assessment_route_id` PRESENT; `min_selections`/`max_selections` NOT NULL + approved CHECKs; selection PK `(user_id, subject_id, option_group_id, option_id)`; 0017 immutability functions/triggers PRESENT.

### Disposable data invariance

| Metric | Value |
| --- | --- |
| Subjects / versions / published / retired | 9 / 9 / 9 / 0 |
| Memberships | 15 |
| Membership snapshot SHA | unchanged |
| `assessment_route_id` non-null | 0 |
| All route/option row counts | 0 |
| Content hashes | unchanged |
| New-seven | absent |

---

## 7. Hosted apply gate

All required answers PASS before Production migrate:

| Gate | Value |
| --- | --- |
| Expected project ref | `hazvcdrcvsxmuwdfiucx` |
| Expected hosted head | `0015_silent_sentinel` |
| Backup created | YES |
| Restore successful | YES |
| Rehearsal 0016 | PASS |
| Rehearsal 0017 | PASS |
| Membership snapshot | 15 / unchanged |
| Repository commit | `188e9f6f84fd918902e4bd9ba186313955425b3c` |

---

## 8. Hosted migration apply

| Item | Value |
| --- | --- |
| Method | Tracked `pnpm --filter @workspace/db migrate` (drizzle-kit migrate) |
| Target | Hosted Session pooler for `hazvcdrcvsxmuwdfiucx` |
| Env boundary | One-shot `env -i` with `DATABASE_URL` + `DIRECT_DATABASE_URL` only |
| Forbidden tools | Not used (`drizzle-kit push`, Dashboard DDL, `supabase db push`, ad-hoc ALTER) |
| 0016 | **APPLIED** |
| 0017 | **APPLIED** |
| Hosted migration count | **18** |
| Hosted head | `0017_route_reference_immutability` |
| 0000–0017 hashes | exact match repository |

---

## 9. Hosted physical schema (post-apply)

| Object | Result |
| --- | --- |
| assessment_route_sets | PRESENT |
| assessment_routes | PRESENT |
| assessment_route_components | PRESENT |
| assessment_study_option_groups | PRESENT |
| assessment_study_options | PRESENT |
| assessment_study_option_units | PRESENT |
| assessment_study_option_year_mappings | PRESENT |
| user_subject_option_selections | PRESENT |
| user_subjects.assessment_route_id | PRESENT |
| min_selections / max_selections | PRESENT / NOT NULL |
| Approved option-group CHECKs | PRESENT |
| Multi-option selection PK | MATCH TRACKED 0016 |
| 0017 immutability functions/triggers | PRESENT |

---

## 10. Hosted data invariance (post-apply)

| Metric | Value |
| --- | --- |
| Subjects | 9 |
| Syllabus versions | 9 |
| Published | 9 |
| Retired | 0 |
| Memberships | 15 |
| Membership version-pin changes | **0** (snapshot SHA identical) |
| `assessment_route_id` populated | **0** (all NULL) |
| New-seven | ABSENT |
| Route sets / routes / components | 0 / 0 / 0 |
| Option groups / options / units / year maps / selections | 0 / 0 / 0 / 0 / 0 |
| Current-nine content hashes | UNCHANGED |

No catalogue adoption occurred.

---

## 11. Resolver / series proof (hosted, read-only)

`lockdin_resolve_applicable_syllabus_version` still matches Phase 6 contract:

| Check | Result |
| --- | --- |
| published + DB applicability + series policy | PASS |
| Manifest `sources[].validity` | NOT used |
| 9709 2025 May/June → version 9 | PASS |
| 9709 2025 Oct/Nov → version 9 | PASS |
| 9709 2025 Feb/Mar | FAIL CLOSED (`no_applicable_syllabus_version`) |
| 9489 2025 May/June (out of window) | FAIL CLOSED |
| 9489 2027 May/June → version 2 | PASS |

---

## 12. Tests

| Suite | Result |
| --- | --- |
| `pnpm check:migrations` | PASS (18 / 0017) |
| `test:route-manifest` | PASS (46) |
| `test:harness` | PASS (21) |
| `test:unit` | PASS (41) |
| `pnpm typecheck` | PASS |
| Structural 0016/0017 proof (rehearsal + hosted) | PASS |
| Route publication/immutability A2B on restored DB | PASS (after local `pgcrypto` + auth column stubs) |
| Route schema-foundation on restored DB | **NON-BLOCKING TEST-ISOLATION NOTE** — fixture collided with username uniqueness in restored real profile data. Not a migration/schema/data-corruption failure. Structural route-schema proof PASS; A2B immutability/publication proof PASS. |

---

## 13. Recovery artifact status

| Item | Status |
| --- | --- |
| Verified dump retained | YES (`~/lockdin-recovery/b5a/`) |
| SHA-256 | `14398bc9258cc8f47359af8fc3588be1acdd345f8037909c182b683711c110a3` |
| Size | 253419 bytes |
| Retention | Keep until B5A owner review complete |
| Recovery readiness | **PASS** (logical dump restored + rehearsed successfully) |

Disposable Docker restore DB may be stopped after owner review; dump remains authoritative.

---

## 14. Hosted safety accounting (this slice)

| Action | Count |
| --- | --- |
| Catalogue writes | 0 |
| Membership writes | 0 |
| Route publication rows | 0 |
| Migrations applied | **2** (`0016`, `0017`) |
| Vercel | NONE |
| Commit / push | NONE |

---

## 15. Remaining blockers for B5B / catalogue cutover

Unchanged from Report 130 product/process gates (schema catch-up is now closed):

1. **Product visibility / route-selection integration** — new subjects would appear immediately in onboarding via `GET /api/subjects`.
2. **Hosted catalogue cutover safety gate** — generic syllabus/applicability CLIs still need an explicit hosted authorization gate.
3. Owner freeze of B5A before any catalogue/reference adoption.

---

## 16. Verdict

**PASS**

### Review note classification (owner-approved)

Restored-DB route-schema-foundation username collision:

**NON-BLOCKING TEST-ISOLATION NOTE**

Reason: the fixture collided with username uniqueness in restored real profile data.

Not classified as: migration failure, schema failure, or hosted data corruption.

Structural route-schema proof: **PASS**  
A2B immutability/publication proof: **PASS**

**B5A HOSTED SCHEMA CATCH-UP COMPLETE AND FROZEN.**

Hosted is schema-ready at `0017` with historical nine-subject catalogue unchanged.

**NEXT:** B5B — product visibility / route-selection integration + hosted cutover safety design.  
**NO HOSTED CATALOGUE CUTOVER YET.**
