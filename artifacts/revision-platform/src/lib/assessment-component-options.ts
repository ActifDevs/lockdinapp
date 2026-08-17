import type { AssessmentComponent } from "@workspace/api-client-react";

export type AssessmentComponentOption = {
  id: number;
  value: string;
  label: string;
};

export function buildAssessmentComponentOptions(
  components: AssessmentComponent[],
): AssessmentComponentOption[] {
  return components.map((component) => ({
    id: component.id,
    value: component.id.toString(),
    label: `${component.paperCode} — ${component.componentName} — ${component.level}`,
  }));
}
