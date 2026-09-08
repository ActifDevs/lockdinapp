# Lockdin Beta Operational Responsibilities

**Status:** OWNER ASSIGNMENT REQUIRED  
**Implementation Slice:** PB-OPS-01  
**Purpose:** Define operational ownership and channels for beta support, privacy, and monitoring functions before real participant invitations.

---

## Required Functions

| Function | Owner | Channel | Cadence | Escalation |
|----------|-------|---------|---------|------------|
| Beta coordinator | OWNER ASSIGNMENT REQUIRED | Lockdin Gmail / support-form workflow | OWNER DECISION REQUIRED | OWNER DECISION REQUIRED |
| Participant support owner | OWNER ASSIGNMENT REQUIRED | Lockdin Gmail / support-form workflow | OWNER DECISION REQUIRED | OWNER DECISION REQUIRED |
| Privacy/deletion owner | OWNER ASSIGNMENT REQUIRED | Lockdin Gmail / support-form workflow | OWNER DECISION REQUIRED | OWNER DECISION REQUIRED |
| Issue-triage owner | OWNER ASSIGNMENT REQUIRED | Lockdin Gmail / support-form workflow | OWNER DECISION REQUIRED | OWNER DECISION REQUIRED |
| Sentry/monitoring review owner | OWNER ASSIGNMENT REQUIRED | Lockdin Gmail / support-form workflow | OWNER DECISION REQUIRED | OWNER DECISION REQUIRED |
| Participant feedback owner | OWNER ASSIGNMENT REQUIRED | Lockdin Gmail / support-form workflow | OWNER DECISION REQUIRED | OWNER DECISION REQUIRED |

---

## Support Route Configuration

**Owner-selected beta support model:**

- **Participant-facing entry:** Help & Support tab in authenticated Settings (implemented)
- **External form:** Google Form (owner to configure)
- **Response destination:** lockdinapp26@gmail.com
- **Form URL configuration:** VITE_SUPPORT_FORM_URL environment variable

**Current operational status:**

- Google Form exists: NOT VERIFIED
- Form response notifications: NOT VERIFIED
- Gmail access by intended owner: NOT VERIFIED
- Inbox review cadence: OWNER DECISION REQUIRED

---

## Important Notes

1. **One owner may hold multiple functions** - the same person can be responsible for several of the above roles.

2. **Real beta invitations remain blocked** until all ownership assignments are confirmed and the support route is operationally verified.

3. **"MONITORED" may only be claimed** after operational verification proves:
   - The Google Form exists
   - The form submits successfully
   - Responses are available to the intended Lockdin account
   - New-response notifications are enabled
   - An accountable owner/role actually checks the inbox

4. **Until operational verification is complete:**
   - Implementation may describe the route truthfully as the beta support/contact route
   - Must NOT promise response times, live support, or continuous monitoring
   - Must NOT claim the route is "monitored" without evidence

---

## Next Steps (Owner Action Required)

1. Assign named owners to each function in the table above
2. Configure the Google Form with required categories (help, bug, feedback, privacy/deletion)
3. Enable Google Form response notifications to lockdinapp26@gmail.com
4. Verify Gmail access and notification delivery
5. Define review cadence for each function
6. Define escalation paths for urgent participant-impacting issues
7. Update this document with confirmed assignments and cadences

---

## References

- Report 159: Phase 7 Pre-Beta Scope Freeze
- Report 160: Phase 7 Pre-Beta Implementation Slice 1
- docs/beta/controlled-beta-materials.md
