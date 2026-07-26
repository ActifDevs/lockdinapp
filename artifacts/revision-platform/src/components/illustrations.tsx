import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type IllustProps = {
  className?: string;
  /** Use light fills for dark brand panels (auth aside) */
  onBrand?: boolean;
};

function Frame({
  className,
  onBrand,
  children,
}: IllustProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 280 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "illust-float mx-auto h-auto w-full max-w-[14rem] select-none",
        onBrand && "illust-on-brand",
        className,
      )}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Soft desk blob + floating planner cards — study tasks empty */
export function IllustTasks({ className, onBrand }: IllustProps) {
  return (
    <Frame className={className} onBrand={onBrand}>
      <ellipse cx="140" cy="168" rx="98" ry="18" className="illust-blob" />
      <rect x="58" y="48" width="164" height="112" rx="16" className="illust-card" />
      <rect x="74" y="68" width="88" height="10" rx="5" className="illust-accent" />
      <rect x="74" y="90" width="132" height="8" rx="4" className="illust-line" />
      <rect x="74" y="108" width="118" height="8" rx="4" className="illust-line" />
      <rect x="74" y="126" width="96" height="8" rx="4" className="illust-line" />
      <circle cx="210" cy="72" r="14" className="illust-accent-soft" />
      <path
        d="M204 72h12M210 66v12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="illust-plus"
      />
      <rect x="168" y="36" width="52" height="36" rx="10" className="illust-float-card" />
      <rect x="178" y="46" width="28" height="6" rx="3" className="illust-accent" />
      <rect x="178" y="56" width="20" height="5" rx="2.5" className="illust-line" />
    </Frame>
  );
}

/** Stacked books + bookmark — subjects empty */
export function IllustBooks({ className, onBrand }: IllustProps) {
  return (
    <Frame className={className} onBrand={onBrand}>
      <ellipse cx="140" cy="170" rx="90" ry="16" className="illust-blob" />
      <rect x="72" y="78" width="28" height="82" rx="4" className="illust-book-a" transform="rotate(-8 86 119)" />
      <rect x="108" y="64" width="32" height="96" rx="4" className="illust-book-b" />
      <rect x="148" y="72" width="30" height="88" rx="4" className="illust-book-c" transform="rotate(6 163 116)" />
      <rect x="186" y="88" width="26" height="72" rx="4" className="illust-book-a" transform="rotate(12 199 124)" />
      <path
        d="M124 64v44c0 6 8 10 12 4l4-6"
        className="illust-bookmark"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="210" cy="52" r="18" className="illust-accent-soft" />
      <path
        d="M202 52h16M210 44v16"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="illust-plus"
      />
    </Frame>
  );
}

/** Exam paper with score badge — past papers empty */
export function IllustPapers({ className, onBrand }: IllustProps) {
  return (
    <Frame className={className} onBrand={onBrand}>
      <ellipse cx="140" cy="170" rx="92" ry="16" className="illust-blob" />
      <rect x="78" y="42" width="110" height="128" rx="10" className="illust-card" transform="rotate(-6 133 106)" />
      <rect x="98" y="50" width="110" height="128" rx="10" className="illust-card-front" />
      <rect x="114" y="70" width="64" height="8" rx="4" className="illust-accent" />
      <rect x="114" y="90" width="78" height="6" rx="3" className="illust-line" />
      <rect x="114" y="106" width="72" height="6" rx="3" className="illust-line" />
      <rect x="114" y="122" width="54" height="6" rx="3" className="illust-line" />
      <circle cx="198" cy="58" r="28" className="illust-badge" />
      <text
        x="198"
        y="64"
        textAnchor="middle"
        className="illust-badge-text"
        fontSize="16"
        fontWeight="700"
        fontFamily="var(--font-sans, Outfit, system-ui, sans-serif)"
      >
        A*
      </text>
    </Frame>
  );
}

/** Calendar leaf + pin — deadlines / calendar empty */
export function IllustCalendar({ className, onBrand }: IllustProps) {
  return (
    <Frame className={className} onBrand={onBrand}>
      <ellipse cx="140" cy="170" rx="88" ry="16" className="illust-blob" />
      <rect x="78" y="48" width="124" height="112" rx="14" className="illust-card" />
      <rect x="78" y="48" width="124" height="32" rx="14" className="illust-accent" />
      <rect x="78" y="68" width="124" height="12" className="illust-accent" />
      <circle cx="108" cy="56" r="5" fill="white" fillOpacity="0.9" />
      <circle cx="172" cy="56" r="5" fill="white" fillOpacity="0.9" />
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={96 + col * 24}
            y={92 + row * 20}
            width="14"
            height="12"
            rx="3"
            className={row === 1 && col === 2 ? "illust-accent" : "illust-line"}
          />
        )),
      )}
      <circle cx="210" cy="130" r="22" className="illust-float-card" />
      <path
        d="M210 120v12l8 5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="illust-plus"
      />
    </Frame>
  );
}

/** Rising chart bars — progress / trend empty */
export function IllustChart({ className, onBrand }: IllustProps) {
  return (
    <Frame className={className} onBrand={onBrand}>
      <ellipse cx="140" cy="170" rx="90" ry="16" className="illust-blob" />
      <rect x="64" y="50" width="152" height="110" rx="16" className="illust-card" />
      <rect x="88" y="118" width="22" height="24" rx="4" className="illust-bar-1" />
      <rect x="122" y="98" width="22" height="44" rx="4" className="illust-bar-2" />
      <rect x="156" y="78" width="22" height="64" rx="4" className="illust-accent" />
      <path
        d="M86 108c18-18 30-8 44-22s28-20 48-8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="illust-plus"
        fill="none"
      />
      <circle cx="214" cy="64" r="10" className="illust-accent-soft" />
    </Frame>
  );
}

/** Calm desk with plant — all on track / idle success */
export function IllustCalm({ className, onBrand }: IllustProps) {
  return (
    <Frame className={className} onBrand={onBrand}>
      <ellipse cx="140" cy="168" rx="96" ry="18" className="illust-blob" />
      <rect x="70" y="96" width="140" height="64" rx="12" className="illust-card" />
      <rect x="88" y="112" width="70" height="8" rx="4" className="illust-line" />
      <rect x="88" y="128" width="48" height="6" rx="3" className="illust-line" />
      <circle cx="188" cy="78" r="28" className="illust-accent-soft" />
      <path
        d="M188 92c-10-14-4-28 0-34 4 6 10 20 0 34Z"
        className="illust-leaf"
      />
      <path
        d="M176 80c8-12 16-10 22-4"
        stroke="currentColor"
        strokeWidth="2"
        className="illust-plus"
        fill="none"
      />
      <circle cx="104" cy="70" r="16" className="illust-float-card" />
      <path
        d="M98 70l4 4 8-8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="illust-plus"
        fill="none"
      />
    </Frame>
  );
}

/** Scholar desk scene for auth panels */
export function IllustAuthDesk({ className, onBrand = true }: IllustProps) {
  return (
    <Frame className={cn("max-w-[18rem]", className)} onBrand={onBrand}>
      <ellipse cx="140" cy="172" rx="100" ry="14" className="illust-blob" />
      <rect x="48" y="70" width="100" height="90" rx="12" className="illust-card" />
      <rect x="62" y="88" width="56" height="8" rx="4" className="illust-accent" />
      <rect x="62" y="106" width="72" height="6" rx="3" className="illust-line" />
      <rect x="62" y="120" width="64" height="6" rx="3" className="illust-line" />
      <rect x="62" y="134" width="48" height="6" rx="3" className="illust-line" />
      <rect x="160" y="58" width="72" height="96" rx="10" className="illust-book-b" transform="rotate(8 196 106)" />
      <rect x="168" y="78" width="40" height="6" rx="3" className="illust-line" />
      <circle cx="220" cy="48" r="22" className="illust-badge" />
      <path
        d="M212 48l5 5 10-10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="illust-plus"
        fill="none"
      />
      <rect x="40" y="48" width="36" height="28" rx="8" className="illust-float-card" />
      <rect x="48" y="56" width="20" height="5" rx="2.5" className="illust-accent" />
      <rect x="48" y="64" width="14" height="4" rx="2" className="illust-line" />
    </Frame>
  );
}

/** Wandering path / empty desk — 404 */
export function IllustLost({ className, onBrand }: IllustProps) {
  return (
    <Frame className={cn("max-w-[16rem]", className)} onBrand={onBrand}>
      <ellipse cx="140" cy="168" rx="94" ry="16" className="illust-blob" />
      <circle cx="140" cy="96" r="54" className="illust-card" />
      <circle cx="140" cy="96" r="38" className="illust-accent-soft" />
      <path
        d="M140 70v26l18 12"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="illust-plus"
        fill="none"
      />
      <text
        x="140"
        y="178"
        textAnchor="middle"
        className="illust-badge-text"
        fontSize="11"
        fontWeight="600"
        fontFamily="var(--font-sans, Outfit, system-ui, sans-serif)"
        opacity="0.55"
      >
        page not found
      </text>
      <circle cx="78" cy="60" r="8" className="illust-line" />
      <circle cx="208" cy="128" r="6" className="illust-accent" />
    </Frame>
  );
}

export type EmptyScene =
  | "tasks"
  | "books"
  | "papers"
  | "calendar"
  | "chart"
  | "calm";

export function EmptyIllustration({
  scene,
  className,
}: {
  scene: EmptyScene;
  className?: string;
}) {
  switch (scene) {
    case "tasks":
      return <IllustTasks className={className} />;
    case "books":
      return <IllustBooks className={className} />;
    case "papers":
      return <IllustPapers className={className} />;
    case "calendar":
      return <IllustCalendar className={className} />;
    case "chart":
      return <IllustChart className={className} />;
    case "calm":
      return <IllustCalm className={className} />;
  }
}
