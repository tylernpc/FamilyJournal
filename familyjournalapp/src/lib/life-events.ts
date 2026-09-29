// Every life event is shown the same way: its label and date in small caps, and a
// headline set over the photo. Types are grouped the way people think about them.

export const LIFE_EVENT_GROUPS = [
  {
    name: "Family",
    events: {
      birth: { label: "Birth", hint: "Their full name" },
      expecting: { label: "Expecting", hint: "e.g. Baby Okafor, due in March" },
      adoption: { label: "Adoption", hint: "Who joined the family" },
      engagement: { label: "Engagement", hint: "e.g. Ana & Marco" },
      marriage: { label: "Marriage", hint: "e.g. Ana & Marco" },
      anniversary: { label: "Anniversary", hint: "e.g. Carol & Luis — 35 years" },
      birthday: { label: "Milestone birthday", hint: "e.g. Grandma June turns 92" },
      reunion: { label: "Family reunion", hint: "Where everyone got together" },
    },
  },
  {
    name: "Growing up",
    events: {
      firstSteps: { label: "First steps", hint: "Who took them" },
      firstWords: { label: "First words", hint: "What they said" },
      firstDayOfSchool: { label: "First day of school", hint: "e.g. Iris starts second grade" },
      lostTooth: { label: "Lost a tooth", hint: "Whose, and which one" },
      learnedToRide: { label: "Learned to ride a bike", hint: "Who did it" },
      driversLicense: { label: "Driver's license", hint: "Who's on the road now" },
      prom: { label: "Prom", hint: "Who went, and with whom" },
      quinceanera: { label: "Quinceañera", hint: "Whose celebration" },
    },
  },
  {
    name: "School & work",
    events: {
      graduation: { label: "Graduation", hint: "e.g. M.S., Speech-Language Pathology" },
      newJob: { label: "New job", hint: "Where, and what role" },
      promotion: { label: "Promotion", hint: "The new title" },
      newBusiness: { label: "Started a business", hint: "What it's called" },
      award: { label: "Award", hint: "What they won" },
      retirement: { label: "Retirement", hint: "From where, after how long" },
    },
  },
  {
    name: "Home & life",
    events: {
      newHome: { label: "New home", hint: "Where it is" },
      moved: { label: "Moved", hint: "e.g. Moved to Boulder" },
      newPet: { label: "New pet", hint: "Their name" },
      trip: { label: "Big trip", hint: "Where to" },
      firstCar: { label: "First car", hint: "What they drive" },
      militaryService: { label: "Military service", hint: "Branch and role" },
      homecoming: { label: "Homecoming", hint: "Who came home" },
      citizenship: { label: "Citizenship", hint: "e.g. Luis becomes a U.S. citizen" },
    },
  },
  {
    name: "Faith & tradition",
    events: {
      baptism: { label: "Baptism", hint: "Whose" },
      firstCommunion: { label: "First communion", hint: "Whose" },
      confirmation: { label: "Confirmation", hint: "Whose" },
      barMitzvah: { label: "Bar mitzvah", hint: "Whose" },
      batMitzvah: { label: "Bat mitzvah", hint: "Whose" },
    },
  },
  {
    name: "Health & milestones",
    events: {
      recovery: { label: "Recovery", hint: "What they came through" },
      raceFinished: { label: "Race finished", hint: "e.g. Luis runs his first marathon" },
      sobriety: { label: "Sobriety milestone", hint: "How long" },
    },
  },
  {
    name: "Remembrance",
    events: {
      memorial: { label: "In memory", hint: "e.g. Remembering Walter Harlow" },
      passing: { label: "Passed away", hint: "Their full name" },
    },
  },
] as const;

type Group = (typeof LIFE_EVENT_GROUPS)[number];
// Distributes over each group, collecting every event key into one union.
type KeysOf<G> = G extends { events: infer E } ? keyof E & string : never;
export type PresetLifeEventType = KeysOf<Group>;

// "custom" lets people name their own event; its label travels with the post.
export type LifeEventType = PresetLifeEventType | "custom";

export const LIFE_EVENTS = Object.fromEntries(
  LIFE_EVENT_GROUPS.flatMap((g) => Object.entries(g.events)),
) as Record<PresetLifeEventType, { label: string; hint: string }>;

export function lifeEventLabel(event: { type: LifeEventType; label?: string }) {
  if (event.type === "custom") return event.label?.trim() || "Life event";
  return LIFE_EVENTS[event.type].label;
}

export function lifeEventHint(type: LifeEventType) {
  return type === "custom" ? "Give it a headline" : LIFE_EVENTS[type].hint;
}
