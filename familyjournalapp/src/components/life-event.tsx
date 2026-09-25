import type { LifeEventType } from "@/lib/types";

export const LIFE_EVENTS: Record<LifeEventType, { label: string }> = {
  birth: { label: "Birth" },
  marriage: { label: "Marriage" },
  graduation: { label: "Graduation" },
  newJob: { label: "New job" },
  memorial: { label: "In memory" },
  anniversary: { label: "Anniversary" },
};
