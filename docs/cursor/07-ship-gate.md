# Phase 7 — Ship gate

**Precedes:** public launch. **Depends on:** Phase 6 complete — real
multi-tenant product, tested, CI-protected.

## This phase is mostly not Cursor's job — and that's the point

Every earlier phase document had a Cursor prompt because every earlier phase
was fundamentally an engineering task. This one is deliberately different:
most of what's left is product/go-to-market work, and the most useful thing
this document can do is name that clearly rather than dress it up as another
engineering checklist.

## The thing worth actually raising with the team

The deep-research report (Part 19, §10) was explicit that user interviews
and a landing-page demand test should happen *before* heavy build
investment — validate that gamified syllabus tracking + deadlines is the
thing that gets used, before spending months building it. Based on what's in
this repo, it looks like the team built the entire product first —
every screen, the full backend, the syllabus data pipeline — without that
validation step having obviously happened.

That's not a criticism of the code; the code is good, and shipped-but-
unvalidated is a completely recoverable position. But it's worth a real,
explicit conversation before sinking Phase 6-level polish time into
something the team hasn't confirmed people want in this exact shape. Two
honest paths from here:

1. **Validate now, in parallel with Phase 6/7 engineering work** — a
   handful of real A-Level student interviews, maybe a soft beta with 10-20
   people recruited directly rather than through a public launch. Cheap,
   fast, and this plan's engineering work isn't wasted regardless of what
   you learn, since a multi-tenant, RLS-protected product is table stakes
   either way.
2. **Skip validation and ship** — a legitimate choice if the team has
   confidence from other signals (e.g. the person building this is
   themselves the target user and has direct conviction) — just make it a
   conscious choice, not a default by omission.

This isn't a Cursor prompt because it's not a coding task — it's a
five-minute conversation the team should have before Phase 7's checklist
below.

## The actual engineering-adjacent checklist

- **Analytics wired from day one.** Nothing in the repo currently sends
  events anywhere (Mixpanel, PostHog, Supabase's own analytics, or even
  basic pageview tracking). Decide the tool, wire the SDK, and instrument
  the handful of events that actually matter for a study-tracking app:
  account created, first task created, first past-paper attempt logged,
  streak achieved, subject completed. Resist instrumenting everything —
  a handful of meaningful events beats fifty vanity ones nobody looks at.
- **Error monitoring** (Sentry or equivalent) on both the Express API and
  the frontend, so a Phase 4/5 auth edge case that slipped through testing
  surfaces as an alert, not a silent support ticket days later.
- **Confirm the PastPaperTracker-into-StudyPlanner decision is fully
  reflected, not just structurally present.** The report's strongest
  product recommendation (Part 19 §8) was folding past-paper tracking into
  the main app rather than shipping it standalone — the repo's schema and
  routes already reflect this (papers live inside the same product,
  same auth, same tables). Nothing to build here; just confirm the
  onboarding/marketing framing (if any exists) doesn't accidentally
  present it as a separate product, which would undercut the whole reason
  this architecture consolidated them.
- **Rate limiting on auth endpoints specifically** (signup, login, password
  reset) — not covered by anything in Phases 0-6, and the kind of gap that
  only matters once the app is public and reachable by anyone, not during
  internal testing.
- **Backup/restore verified for real**, not assumed because "Supabase
  handles it." Confirm point-in-time recovery is actually enabled on the
  plan being used, and that someone has actually tested a restore at least
  once — the first time you test a backup shouldn't be during an incident.

## Cursor prompt (for the engineering-adjacent items only)

```
Read docs/lockdin-architecture-plan.md section 10 and this entire file
(docs/cursor/07-ship-gate.md) before starting. Assume Phase 6 is complete.

Note: the user-validation question in this file's first section is a
product conversation, not a coding task — don't attempt to resolve it
yourself, just make sure I've seen it flagged.

1. Propose an analytics tool (given this is a small team's product, weigh
   setup cost and privacy posture, not just feature completeness) and the
   specific event list you'd instrument, limited to the handful that
   actually indicate product engagement for a study-tracking app. Wait for
   my approval on the tool and event list before wiring anything.
2. Once approved, wire the SDK and the approved events on both frontend and
   API.
3. Propose and, once approved, wire basic error monitoring on both the
   Express API and the frontend.
4. Add rate limiting to the auth endpoints (signup, login, password reset)
   specifically — check what's easiest given the current Express stack
   (a lightweight in-process limiter is fine for launch scale, don't
   over-engineer this with a separate service).
5. Do NOT attempt to verify Supabase backup/restore yourself — this needs a
   human with dashboard/billing access to confirm the plan's backup
   settings and actually run a test restore. Just remind me this is
   outstanding.

Stop and wait for my sign-off after step 1's proposal before wiring
anything into the live app.
```

## Definition of done

- [ ] Team has explicitly discussed the validation question (not silently
      skipped it) and made a conscious choice either way
- [ ] Analytics wired for an approved, deliberately small event list
- [ ] Error monitoring live on both API and frontend
- [ ] Auth endpoints rate-limited
- [ ] Backup/restore verified by an actual test restore, by a human with
      the access to do it, not assumed
- [ ] PastPaperTracker-into-StudyPlanner framing confirmed consistent in
      any user-facing copy, not just in the schema

## What comes after this

Nothing in this plan — deliberately. Section 11 of
`docs/lockdin-architecture-plan.md` lists what's intentionally still out of
scope (AI assistant, standalone focus-blocker, server-side gamification
tables). Those stay out of scope until real usage data from the beta/launch
actually calls for them, not before. Re-litigating that list is fair game
after this phase, but it shouldn't be decided inside a Cursor session — it's
another product conversation, same as the validation question above.
