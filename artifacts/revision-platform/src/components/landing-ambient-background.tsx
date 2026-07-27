import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type LandingAmbientVariant = "intro" | "feature-1" | "feature-2" | "feature-3";

type LandingAmbientBackgroundProps = {
  variant: LandingAmbientVariant;
};

const GRADE_MARKS = ["a", "b", "c"] as const;

const AMBIENT_NOTES: Record<LandingAmbientVariant, readonly { id: "a" | "b"; text: string }[]> = {
  intro: [
    { id: "a", text: "revise little & often" },
    { id: "b", text: "12 weeks to exams ✓" },
  ],
  "feature-1": [
    { id: "a", text: "check spec §3.2" },
    { id: "b", text: "past paper q4 — redo" },
  ],
  "feature-2": [
    { id: "a", text: "weak on integration" },
    { id: "b", text: "flashcards tonight" },
  ],
  "feature-3": [
    { id: "a", text: "on track this week!" },
    { id: "b", text: "remember: show working" },
  ],
};

function AmbientGrade({
  mark,
  animate,
}: {
  mark: (typeof GRADE_MARKS)[number];
  animate: boolean;
}) {
  return (
    <span
      className={cn(
        "landing-ambient-grade",
        `landing-ambient-grade-${mark}`,
        animate && "landing-ambient-animate-grade",
      )}
      style={animate ? { animationDelay: mark === "b" ? "-11s" : mark === "c" ? "-22s" : "0s" } : undefined}
    >
      A<span className="landing-ambient-star">*</span>
    </span>
  );
}

function AmbientNote({
  noteId,
  text,
  animate,
}: {
  noteId: "a" | "b";
  text: string;
  animate: boolean;
}) {
  return (
    <span
      className={cn(
        "landing-ambient-note",
        `landing-ambient-note-${noteId}`,
        animate && "landing-ambient-animate-note",
      )}
      style={animate ? { animationDelay: noteId === "b" ? "-14s" : "-5s" } : undefined}
    >
      {text}
    </span>
  );
}

export function LandingAmbientBackground({ variant }: LandingAmbientBackgroundProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn("landing-ambient", `landing-ambient-${variant}`)} aria-hidden>
      <div className="landing-ambient-lines" />
      {GRADE_MARKS.map((mark) => (
        <AmbientGrade key={mark} mark={mark} animate={!reduceMotion} />
      ))}
      {AMBIENT_NOTES[variant].map((note) => (
        <AmbientNote key={note.id} noteId={note.id} text={note.text} animate={!reduceMotion} />
      ))}
    </div>
  );
}
