# Phase 6 — Hosted Applicability and Series Policy Population

- **Date:** 2026-08-30
- **Repository:** `ActifDevs/lockdinapp`
- **Hosted project:** `hazvcdrcvsxmuwdfiucx`
- **Owner/QA final signoff of this Production pass:** **not claimed**

## Tooling merge

- Feature: `phase6-applicability-population-tooling` at `a4475fd90685811d938dd71afb1db47849498006`
- Pre-merge `origin/main`: `eb53500c5f5f9db2aa6b2f69b0603f2f5b644746`
- **TOOLING MERGE SHA:** `6a6da0d537116204237a313efc6146efb6403492`
- Parents: `eb53500` `a4475fd`
- Message: `merge: phase6 applicability population tooling`
- Normal `git push origin main`

## Production deployment

Automatic Git integration. No manual redeploy.

| Project | GitHub deployment id | Vercel inspect | Source | State |
| --- | --- | --- | --- | --- |
| lockdinapp-web | `6161699016` | `https://vercel.com/actif-devs/lockdinapp-web/E6qWGjgt6JuNhRQkKS5hofTzLjPa` | `6a6da0d` | READY |
| lockdinapp | `6161696389` | `https://vercel.com/actif-devs/lockdinapp/HGAF5LqBCTny9gyMAjkN4Lbm2zb8` | `6a6da0d` | READY |

GitHub environment_url (web): `https://lockdinapp-hmic50s38-actif-devs.vercel.app`. Canonical smoke: `https://lockdinapp-web.vercel.app`.

## Pre-population state

Journal **15** / head `0014_perpetual_nighthawk` (`1788044465654` / `21da923b…9428df52`). 0015 ABSENT. Versions 9; r001 and hashes 9/9; applicability 0/9; policy rows 0; drafts 0; second graph NONE. Memberships 12 / valid 12 / null 0. Pin fingerprint `d84e57ea65731e591f135f1661883e59`. Graph 136 / 520 / 3198 / 50 / 4817. Tasks 14; topic_progress 39; past_paper_attempts 6; exam_dates 0.

## Validate result

`pnpm --filter @workspace/scripts syllabus:applicability --mode=validate` against authorized hosted Session pooler.

VALIDATION PASS **9/9**. Hashes MATCH. Empty applicability and policy. No overlap or ambiguity.

## Apply mechanism

One command after 9/9 VALIDATE:

`pnpm --filter @workspace/scripts syllabus:applicability --mode=apply`

Manifest: committed `docs/reference-data/syllabus-applicability/population-manifest.json` at merge SHA `6a6da0d`. Operator from the same commit. No SQL editor. No per-subject manual writes.

## Transaction result

`APPLICABILITY APPLY: populated; populated=9 already-applied=0`. Transaction **COMMITTED**.

## Applicability mappings

| Key | From | To | Generated range present |
| --- | --- | --- | --- |
| 9231-r001 | 2023 May/June | 2030 Oct/Nov | YES |
| 9489-r001 | 2027 May/June | 2029 Oct/Nov | YES |
| 9609-r001 | 2023 May/June | 2028 Oct/Nov | YES |
| 9618-r001 | 2024 May/June | 2029 Oct/Nov | YES |
| 9700-r001 | 2025 May/June | 2030 Oct/Nov | YES |
| 9701-r001 | 2025 May/June | 2030 Oct/Nov | YES |
| 9702-r001 | 2025 May/June | 2030 Oct/Nov | YES |
| 9708-r001 | 2023 May/June | 2028 Oct/Nov | YES |
| 9709-r001 | 2023 May/June | 2030 Oct/Nov | YES |

APPLICABILITY: **9/9 POPULATED**. Inclusive generated ranges matched `lockdin_exam_session_ordinal` 9/9.

## Series policy

SERIES POLICY: **27 ROWS**. Per version 3. May/June TRUE **9**. Oct/Nov TRUE **9**. Feb/Mar FALSE **9**. Total TRUE 18 / FALSE 9.

## Resolver audit

Administrative `lockdin_resolve_applicable_syllabus_version` only (grants unchanged).

May/June in-window: **9/9 PASS**. Oct/Nov in-window: **9/9 PASS**. Feb/Mar in-window: **9/9 REJECT**.

History: 2026 MJ REJECT; 2027 MJ and 2029 ON → 9489-r001; 2030 MJ REJECT.

Physics: 2024 ON REJECT; 2025 MJ and 2030 ON → 9702-r001; 2031 MJ REJECT.

## Graph/identity safety

logical_revision_key / content_sha256 unchanged 9/9. Lifecycle published; `is_current` true 9/9. Graph counts unchanged. Versions still 9. SECOND GRAPH: **NONE**.

## Membership/pin safety

Memberships 12; valid pins 12; null 0. Pin fingerprint unchanged. Tasks / topic_progress / past_paper_attempts / exam_dates unchanged. No user identifiers.

## Production smoke

Pre- and post-write canonical Production: health 200, DB 200, anonymous tasks 401, catalogue/syllabus/components 200. Authenticated read: **NOT CHECKED**.

## Assignment boundary

`lockdin_complete_onboarding_apply` and `lockdin_replace_user_subjects_apply` still `is_current = true` and do not call the strict resolver.

STRICT ASSIGNMENT: **NOT ENABLED**

NEW MEMBERSHIP SELECTOR: **LEGACY DEFAULT**

C2B2: **NOT STARTED**

## Migration state

Journal still 15. Head still `0014_perpetual_nighthawk`. MIGRATION 0015: **NOT CREATED**.

Post-apply VALIDATE: 9/9 OK (desired state recognized). Second APPLY not run.

## C2B2 readiness

Production applicability and series policy now exist. Strict cutover still requires a separate owner-authorized C2B2 workstream. Do not start it from this report.

## Final verdict

Hosted population complete. Assignment remains DEFAULT. Phase 6 remains in progress.
