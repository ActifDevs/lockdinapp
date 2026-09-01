# Controlled beta materials (invite-only)

**Status:** materials drafted for an 8–12 participant invite-only Production beta.  
**Beta started:** NO  
**Real invites sent:** NO

This file is operational copy for the owner/coordinator. It is **not** legal advice. Items marked **OWNER INPUT REQUIRED** or **OWNER / LEGAL REVIEW REQUIRED** must be resolved before invitations.

---

## A. Invitation-only signup page

Live product copy on `/signup` (implemented):

> This is a controlled beta. Registration is currently by invitation only.

Public self-registration remains disabled in Supabase Auth. The signup page does not present a working self-signup form. Invited participants use the invitation email → password setup flow. Existing login and password reset are unchanged.

---

## B. Welcome / onboarding (send with invitation)

**Subject (draft):** You’re invited to try Lockdin (private beta)

Hi {name},

You’re invited to a small private beta of **Lockdin**, a Cambridge A-Level revision workspace (syllabus coverage, tasks, past papers, and today’s plan in one place).

**How to start**

1. Open the invitation link in your email and set a password.
2. Sign in at the Lockdin login page.
3. Complete onboarding: pick the subjects you’re actually revising (and exam session where asked).
4. Try the core loop once: create a task → mark a syllabus topic → log one past-paper attempt → open the dashboard.

**Desktop first:** Chrome or Firefox preferred; Safari is fine if that’s what you use. Phone browsers are best-effort.

**Privacy:** Please read the in-app Privacy page. Product analytics (PostHog EU, allow-listed events only) and error monitoring (Sentry) may be on when configured. They are not advertising tools. Do not put exam-board login secrets into Lockdin.

More detail: this note, plus Support / Feedback / Deletion below.

---

## C. Support / contact path

| Need                         | Path                                                                  |
| ---------------------------- | --------------------------------------------------------------------- |
| Access / invitation problems | Email the beta coordinator (**OWNER INPUT REQUIRED**)                 |
| Product bugs during beta     | Email the beta coordinator or triage owner (**OWNER INPUT REQUIRED**) |
| Privacy / policy questions   | `privacy@lockdin.app` (published on `/privacy`)                       |

Until the coordinator is named, do **not** send invitations.

Provisional fallback published in the product: `privacy@lockdin.app`. Confirm whether beta support should use that address or a different one (**OWNER INPUT REQUIRED**).

---

## D. Feedback instructions

**Method proposed in Report 114 (not yet owned):** short structured form after day 3 and at close (8–10 questions); optional 20-minute call for 3–5 volunteers. Issues filed by the coordinator — do not ask students for stack traces.

**Draft questions**

1. What did you open Lockdin to do?
2. Did you know what to do next after onboarding?
3. Did syllabus % feel trustworthy?
4. Was logging a past paper obvious inside Lockdin?
5. Did the daily plan match how you revise?
6. What blocked you?
7. Would you use this for a real exam season?
8. What felt like a different product than Lockdin?

**OWNER INPUT REQUIRED:** final feedback channel (form URL, email inbox, or other) and who sends the day-3 / close prompts.

---

## E. Participant expectations

- Lockdin is a **beta product**. Features may change; you may hit bugs.
- Report problems to the beta coordinator (or the feedback channel once named). Include: what you were trying to do, what you saw, and roughly when — not passwords or other people’s data.
- Core journey to try: sign in → onboarding/subjects → syllabus progress → task → past-paper log → dashboard/progress → sign out.
- Past papers are part of Lockdin, not a separate app.
- Do not share invitation links publicly.

---

## F. Account / deletion request path

There is **no** in-app “delete my account” control today.

Participants may request account and study-data removal by emailing **`privacy@lockdin.app`** (same contact as the Privacy page). State that you are a beta participant and the email used for the account.

**OWNER / LEGAL REVIEW REQUIRED:** retention, processor wipe steps (PostHog alias / Sentry if any), and confirmation wording before promising timelines.

---

## G. Privacy / analytics / monitoring (product configuration)

Already disclosed on `/privacy`:

- Account and revision data needed for the workspace; data is not sold.
- **PostHog (EU cloud)** server-side custom product events when configured; no browser PostHog SDK; no autocapture / Session Replay / heatmaps / advertising integrations; events exclude email, name, username, task notes, syllabus text, and paper scores.
- **Sentry** for application errors when configured; reliability monitoring only; sanitized stacks; not Session Replay; not intended to include email, name, study content, auth headers, or credentials.
- Contact: `privacy@lockdin.app`.

Formal questions (under-18 participants, lawful basis, DPAs, cookie/consent UI) remain **OWNER / LEGAL REVIEW REQUIRED** — see owner-gate table in Report 119.

---

## Unresolved owner / legal gates (do not invent answers)

| Gate                                               | Status                                                       |
| -------------------------------------------------- | ------------------------------------------------------------ |
| Intended participant age range                     | **OWNER INPUT REQUIRED**                                     |
| Anyone under 18 may participate?                   | **OWNER INPUT REQUIRED** / **OWNER / LEGAL REVIEW REQUIRED** |
| Participant countries / jurisdictions              | **OWNER INPUT REQUIRED**                                     |
| Guardian / consent process where applicable        | **OWNER / LEGAL REVIEW REQUIRED**                            |
| Person responsible for participant support         | **OWNER INPUT REQUIRED**                                     |
| Person responsible for deletion / privacy requests | Confirm `privacy@lockdin.app` owner **OWNER INPUT REQUIRED** |
| Feedback mechanism (final channel)                 | **OWNER INPUT REQUIRED**                                     |
| Beta coordinator                                   | **OWNER INPUT REQUIRED**                                     |
| Issue triage owner                                 | **OWNER INPUT REQUIRED**                                     |

**Do not invite real participants until these gates are resolved or explicitly accepted in writing with residual risk.**
