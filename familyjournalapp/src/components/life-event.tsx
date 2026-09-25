import type { LifeEventType } from "@/lib/types";
import {
  BriefcaseIcon,
  CalendarIcon,
  CandleIcon,
  CapIcon,
  RingsIcon,
  SproutIcon,
} from "./icons";

export const LIFE_EVENTS: Record<
  LifeEventType,
  { label: string; icon: typeof SproutIcon; color: string; bg: string }
> = {
  birth: { label: "Birth", icon: SproutIcon, color: "var(--ev-birth)", bg: "var(--ev-birth-bg)" },
  marriage: { label: "Marriage", icon: RingsIcon, color: "var(--ev-marriage)", bg: "var(--ev-marriage-bg)" },
  graduation: { label: "Graduation", icon: CapIcon, color: "var(--ev-graduation)", bg: "var(--ev-graduation-bg)" },
  newJob: { label: "New job", icon: BriefcaseIcon, color: "var(--ev-job)", bg: "var(--ev-job-bg)" },
  memorial: { label: "In memory", icon: CandleIcon, color: "var(--ev-memorial)", bg: "var(--ev-memorial-bg)" },
  anniversary: { label: "Anniversary", icon: CalendarIcon, color: "var(--ev-anniversary)", bg: "var(--ev-anniversary-bg)" },
};

export function LifeEventGlyph({
  type,
  size = 32,
  inset = false,
}: {
  type: LifeEventType;
  size?: number;
  // Sits on a tinted surface already, so use a plain background.
  inset?: boolean;
}) {
  const meta = LIFE_EVENTS[type];
  const Glyph = meta.icon;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md"
      style={{ width: size, height: size, background: inset ? "var(--surface)" : meta.bg, color: meta.color }}
    >
      <Glyph size={Math.round(size * 0.56)} />
    </span>
  );
}
