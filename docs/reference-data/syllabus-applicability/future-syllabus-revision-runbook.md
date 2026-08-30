# Future syllabus revision runbook

This is the operational path for onboarding a **real** future Cambridge
syllabus revision as a new immutable Lockdin graph (`{subject-code}-r002`, then
`r003`, …). It does not authorize hosted writes, Production env changes, or
repinning existing memberships.

The current published Production graph remains the `r001` family until an owner
explicitly authorizes a later hosted publication.

Synthetic disposable proofs may use fixture graphs. They are **not** Cambridge
curriculum content.

## 1. Obtain and verify source material

- Collect the official Cambridge PDF (or equivalent) for the new examination
  period.
- Keep the existing `r001` CSV and researched hashes unchanged.
- Produce a new validated CSV snapshot for the successor graph only.
- Record provenance (official title, URL, version, examination years).

## 2. Determine the logical revision identity

- Convention: `{subjectCode}-rNNN`.
- Existing hosted/legacy graphs are `r001`.
- Do not reuse an `r001` key. Do not infer identity from the filename.
- The key names the immutable Lockdin graph, not a Cambridge marketing edition.

## 3. Immutable import

- Use the syllabus CLI with an explicit `--revision=` and exactly one
  `--files=<subject-code>`.
- Optional `--csv=` overrides the default raw-file mapping when the successor
  snapshot is a different file.
- Import creates or rebuilds a **draft** only.
- Published/retired/archived graphs are immutable. A content change requires a
  new logical revision key.

## 4. Content integrity / hash validation

- Recompute `content_sha256` from the canonical graph.
- Store the expected hash in the applicability write-set for that revision.
- Refuse publication if the stored hash and the loaded graph disagree.

## 5. Applicability research

- Research the official examination window independently of DEFAULT and pin
  state.
- Do not guess missing years or series.
- Do not silently alter existing `r001` applicability.

## 6. Series-policy decision

- Applicability windows and series policy remain independent.
- Current product policy for the nine live families: Feb/Mar
  `product_auto_assign = false`; May/June and Oct/Nov `true`.
- A future revision may keep that policy unless the owner changes product
  assignment rules. Feb/Mar enablement is out of scope for this runbook.

## 7. Disposable validation

- Use `lockdin-db-harness` or another dedicated disposable database.
- Never point destructive proofs at hosted Production.
- A non-loopback `DATABASE_URL` must fail closed.
- Prove: empty → current migration head; import `r001` and `r002`; pin
  preservation; resolver behavior; cleanup.

## 8. Publication decision

- `PUBLISHED` is not `DEFAULT`.
- A second published graph is allowed only when every remaining published
  window is known and non-overlapping.
- Set the successor draft window before publication when another published
  graph already exists.
- Overlap fails closed (operator check + database exclusion).

## 9. Default decision

- `DEFAULT` (`is_current`) is an administrative catalogue selector.
- Making `r002` default must not rewrite existing membership pins.
- Leave `r001` published if students remain pinned to it.

## 10. Assignment / resolver validation

- New memberships require a structured intended session.
- Resolution requires exactly one published + applicable +
  `product_auto_assign` candidate.
- Zero candidates → fail closed. Multiple candidates → fail closed.
- Users cannot select a syllabus version.

## 11. Controlled Preview QA

- Owner authorization is required before Preview env or Preview database
  changes.
- Public/non-mutating smoke first.
- Authenticated QA only on a controlled account, then restore baseline.

## 12. Production authorization gate

Stop and wait for the owner before:

- hosted schema or data writes;
- publishing a real `r002`;
- Production/Preview env changes;
- deleting Vercel overrides;
- changing hosted applicability/policy;
- repinning real users;
- merging to `main` if that is the agreed release gate.

## 13. Post-deploy verification

- Journal head matches the committed Drizzle journal.
- Applicability/policy row counts match the authorized write-set.
- Public catalogue semantics are unchanged for un-enrolled reads.
- Existing membership pins and stored sessions are unchanged.

## 14. Preservation of previous pinned memberships

- Pin-aware reads continue to use `user_subjects.syllabus_version_id`.
- Settings retain-only replacement may omit a session.
- Adding a new subject requires a structured session and does not repin
  retained subjects.
- There is no user-facing version selector and no automatic repin.

## 15. Rollback / recovery

- Do not rewrite published graphs in place.
- Recover by retiring a mistaken publication and restoring DEFAULT to a still
  published historical graph, or by importing a new draft under a new key.
- Restoring DEFAULT is not a repin.
- If Preview/Production env was changed without authorization, stop and report.

## Applicability expiry ownership

Verified against
`docs/reference-data/syllabus-applicability/population-manifest.json`
(Report 102 windows). Do not treat this table as a data-change instruction.

| Family | Logical key | Applicable to | Earliest successor research |
| --- | --- | --- | --- |
| Business 9609 | `9609-r001` | Oct/Nov 2028 | Before the 2028 Oct/Nov sitting |
| Economics 9708 | `9708-r001` | Oct/Nov 2028 | Before the 2028 Oct/Nov sitting |
| History 9489 | `9489-r001` | Oct/Nov 2029 | Before the 2029 Oct/Nov sitting |
| Computer Science 9618 | `9618-r001` | Oct/Nov 2029 | Before the 2029 Oct/Nov sitting |
| Further Mathematics 9231 | `9231-r001` | Oct/Nov 2030 | Before the 2030 Oct/Nov sitting |
| Biology 9700 | `9700-r001` | Oct/Nov 2030 | Before the 2030 Oct/Nov sitting |
| Chemistry 9701 | `9701-r001` | Oct/Nov 2030 | Before the 2030 Oct/Nov sitting |
| Physics 9702 | `9702-r001` | Oct/Nov 2030 | Before the 2030 Oct/Nov sitting |
| Mathematics 9709 | `9709-r001` | Oct/Nov 2030 | Before the 2030 Oct/Nov sitting |

Owner: Lockdin syllabus operations (owner authorization for hosted apply).

New revision research and disposable pipeline work must start **before** a
current applicable window expires. Expiry of a window does not repin students
and does not invent a successor graph.
