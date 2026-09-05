import { cn } from "@/lib/utils";
import {
  optionGroupValid,
  toggleStudyOptionSelection,
  type StudyOptionGroupLike,
} from "@/lib/route-selection";

type StudyOptionPickerProps = {
  groups: StudyOptionGroupLike[];
  selectedIds: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
  className?: string;
};

function rangeCopy(min: number, max: number): string {
  if (min === max) return `Select ${min}`;
  return `Select ${min}–${max}`;
}

/**
 * Generic study-option control driven by minSelections / maxSelections.
 * No subject-specific branches.
 */
export function StudyOptionPicker({
  groups,
  selectedIds,
  onChange,
  disabled = false,
  className,
}: StudyOptionPickerProps) {
  if (groups.length === 0) return null;

  return (
    <div className={cn("space-y-5", className)}>
      {groups.map((group) => {
        const groupSelected = selectedIds.filter((id) =>
          group.options.some((option) => option.id === id),
        );
        const valid = optionGroupValid(group, selectedIds);
        return (
          <fieldset key={group.id} className="space-y-2" disabled={disabled}>
            <legend className="text-sm font-medium text-foreground">
              {group.displayLabel}
            </legend>
            <p className="text-xs text-muted-foreground">
              {rangeCopy(group.minSelections, group.maxSelections)}
              {groupSelected.length > 0
                ? ` · ${groupSelected.length} selected`
                : ""}
            </p>
            <div
              className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
              role="group"
              aria-label={group.displayLabel}
            >
              {group.options.map((option) => {
                const checked = selectedIds.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                      checked
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:bg-muted/40",
                      disabled && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={checked}
                      disabled={disabled}
                      onChange={() =>
                        onChange(
                          toggleStudyOptionSelection(
                            selectedIds,
                            option.id,
                            group,
                          ),
                        )
                      }
                    />
                    <span>{option.displayLabel}</span>
                  </label>
                );
              })}
            </div>
            {!valid ? (
              <p className="text-xs text-destructive" role="alert">
                {rangeCopy(group.minSelections, group.maxSelections)} to
                continue.
              </p>
            ) : null}
          </fieldset>
        );
      })}
    </div>
  );
}
