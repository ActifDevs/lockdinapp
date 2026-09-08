# Lockdin Beta Operational Responsibilities

**Status:** SUPPORT-FORM INTAKE ASSIGNED; BROADER OWNER ASSIGNMENT REQUIRED
**Implementation Slice:** PB-OPS-01  
**Purpose:** Define operational ownership and channels for beta support, privacy, and monitoring functions before real participant invitations.

---

## Required Functions

| Function | Owner | Channel | Cadence | Escalation |
|----------|-------|---------|---------|------------|
| Beta coordinator | OWNER ASSIGNMENT REQUIRED | Lockdin Gmail / support-form workflow | OWNER DECISION REQUIRED | OWNER DECISION REQUIRED |
| Participant support intake | Project owner | Lockdin Beta Help & Support Google Form + linked Google Sheet | DAILY | OWNER DECISION REQUIRED |
| Privacy/deletion intake | Project owner | Lockdin Beta Help & Support Google Form + linked Google Sheet | DAILY | OWNER DECISION REQUIRED |
| Issue-triage owner | OWNER ASSIGNMENT REQUIRED | Lockdin Gmail / support-form workflow | OWNER DECISION REQUIRED | OWNER DECISION REQUIRED |
| Sentry/monitoring review owner | OWNER ASSIGNMENT REQUIRED | Lockdin Gmail / support-form workflow | OWNER DECISION REQUIRED | OWNER DECISION REQUIRED |
| Participant feedback intake | Project owner | Lockdin Beta Help & Support Google Form + linked Google Sheet | DAILY | OWNER DECISION REQUIRED |

---

## Support Route Configuration

**Owner-selected beta support model:**

- **Participant-facing entry:** Help & Support tab in authenticated Settings (implemented)
- **External form:** Lockdin Beta Help & Support Google Form (verified)
- **Response destination:** lockdinapp26@gmail.com
- **Response workflow:** Google Forms + linked Google Sheet
- **Form URL configuration:** VITE_SUPPORT_FORM_URL environment variable

**Current operational status:**

- Google Form exists: VERIFIED — owner manual evidence
- Four-path test (help, bugs, feedback, privacy/account deletion): PASS — owner manual evidence
- Responses stored in linked Google Sheet: VERIFIED — owner manual evidence
- Notification mailbox: lockdinapp26@gmail.com
- Form response notifications: VERIFIED ENABLED — owner manual evidence
- Support-form monitoring owner: Project owner
- Support-form review cadence: DAILY
- Monitored support route: VERIFIED

This assignment covers intake monitoring for all four Form categories. It does
not assign privacy/deletion fulfilment, broader issue triage, monitoring review,
beta coordination, or an escalation path.

---

## Important Notes

1. **One owner may hold multiple functions** - the same person can be responsible for several of the above roles.

2. **Real beta invitations remain unauthorized.** The support route is operationally verified, but broader ownership, escalation, compliance, age, guardian, and DPC gates are not closed by this update.

3. **"MONITORED" may only be claimed** after operational verification proves:
   - The Google Form exists
   - The form submits successfully
   - Responses are available to the intended Lockdin account
   - New-response notifications are enabled
   - An accountable owner/role actually checks the inbox

4. **Operational claim boundary:**
   - The Form route may be described as monitored daily by the Project owner
   - Must NOT promise response times, live support, continuous monitoring, or an SLA
   - Daily Form intake monitoring must not be described as ownership of unresolved broader functions

---

## Next Steps (Owner Action Required)

1. Assign the beta coordinator
2. Assign issue-triage ownership beyond Form intake
3. Assign privacy/deletion fulfilment ownership
4. Assign Sentry/monitoring review ownership and cadence
5. Define escalation paths for urgent participant-impacting issues
6. Update this document only when those assignments are explicitly confirmed

---

## References

- Report 159: Phase 7 Pre-Beta Scope Freeze
- Report 160: Phase 7 Pre-Beta Implementation Slice 1
- Report 161: Phase 7 Pre-Beta Support Route Finalization
- docs/beta/controlled-beta-materials.md
