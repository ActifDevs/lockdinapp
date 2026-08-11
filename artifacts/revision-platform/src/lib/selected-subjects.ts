import type { Subject, UserSubjectMembership } from "@workspace/api-client-react";

export function selectMembershipSubjects(
  subjects: Subject[] | undefined,
  memberships: UserSubjectMembership[] | undefined,
): Subject[] {
  if (!subjects || !memberships) {
    return [];
  }

  const selectedIds = new Set(memberships.map((membership) => membership.subject.id));
  return subjects.filter((subject) => selectedIds.has(subject.id));
}
