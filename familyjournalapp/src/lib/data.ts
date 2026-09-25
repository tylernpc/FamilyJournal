import type {
  AppNotification,
  Person,
  Post,
  Reaction,
  Relationship,
} from "./types";

// Mock data for the MVP UI. Timestamps are fixed relative to NOW so the
// server and client render the same relative times.
export const NOW = new Date("2026-09-24T10:00:00-06:00");

export const CURRENT_USER_ID = "emma";

export const family = {
  id: "harlow",
  name: "Harlow Family",
  createdAt: "2025-11-02",
};

export const people: Person[] = [
  {
    id: "walter",
    photo: "photo-1728932976150-7e81ef17e734",
    firstName: "Walter",
    lastName: "Harlow",
    sex: "m",
    birthDate: "1931-03-09",
    deathDate: "2019-08-12",
    lifeStatus: "deceased",
    bio: "Navy radioman aboard the USS Midway, 1951–54. Ran Harlow Hardware on Main Street for 31 years. Could fix anything except a sourdough starter.",
    location: "Fort Collins, CO",
    isPlaceholder: true,
    addedBy: "emma",
  },
  {
    id: "june",
    photo: "photo-1525599428495-0441bd5c67de",
    firstName: "June",
    lastName: "Harlow",
    maidenName: "Bishop",
    sex: "f",
    birthDate: "1934-07-19",
    lifeStatus: "living",
    bio: "Pie crust from scratch, always. Still does the Sunday crossword in pen.",
    location: "Fort Collins, CO",
    isPlaceholder: true,
    addedBy: "emma",
    inviteSentAt: "2026-09-02",
  },
  {
    id: "robert",
    photo: "photo-1533101585792-27f81a845550",
    firstName: "Robert",
    lastName: "Harlow",
    sex: "m",
    birthDate: "1958-02-11",
    lifeStatus: "living",
    bio: "Retired civil engineer. Restoring a '72 Bronco, slowly.",
    location: "Loveland, CO",
    isPlaceholder: false,
    role: "member",
    joinedAt: "2025-11-04",
  },
  {
    id: "diane",
    photo: "photo-1758686254563-5c5ab338c8b9",
    firstName: "Diane",
    lastName: "Harlow",
    maidenName: "Keller",
    sex: "f",
    birthDate: "1960-10-02",
    lifeStatus: "living",
    bio: "Garden, library board, grandkids. In that order most weeks.",
    location: "Loveland, CO",
    isPlaceholder: false,
    role: "member",
    joinedAt: "2025-11-04",
  },
  {
    id: "carol",
    photo: "photo-1566616213894-2d4e1baee5d8",
    firstName: "Carol",
    lastName: "Mendez",
    maidenName: "Harlow",
    sex: "f",
    birthDate: "1962-05-27",
    lifeStatus: "living",
    bio: "Taught second grade at Lincoln Elementary for 30 years. Keeper of the family recipe binder.",
    location: "Greeley, CO",
    isPlaceholder: false,
    role: "member",
    joinedAt: "2025-11-06",
  },
  {
    id: "luis",
    photo: "photo-1630472921302-f0303988157a",
    firstName: "Luis",
    lastName: "Mendez",
    sex: "m",
    birthDate: "1961-12-03",
    lifeStatus: "living",
    bio: "Coaches under-10 soccer. Best carne asada in three counties, per Luis.",
    location: "Greeley, CO",
    isPlaceholder: false,
    role: "member",
    joinedAt: "2026-09-05",
  },
  {
    id: "emma",
    photo: "photo-1526080652727-5b77f74eacd2",
    firstName: "Emma",
    lastName: "Okafor",
    maidenName: "Harlow",
    sex: "f",
    birthDate: "1987-04-15",
    lifeStatus: "living",
    bio: "Family historian by accident. Nurse at St. Vincent's.",
    location: "Denver, CO",
    isPlaceholder: false,
    role: "admin",
    joinedAt: "2025-11-02",
  },
  {
    id: "sam",
    photo: "photo-1614023342667-6f060e9d1e04",
    firstName: "Sam",
    lastName: "Okafor",
    sex: "m",
    birthDate: "1986-01-22",
    lifeStatus: "living",
    bio: "Architect. Dad of two. Mostly asleep.",
    location: "Denver, CO",
    isPlaceholder: false,
    role: "member",
    joinedAt: "2025-11-02",
  },
  {
    id: "nate",
    photo: "photo-1695737679868-de7eb09df3d0",
    firstName: "Nate",
    lastName: "Harlow",
    sex: "m",
    birthDate: "1991-08-08",
    lifeStatus: "living",
    bio: "Software, climbing, bad puns.",
    location: "Boulder, CO",
    isPlaceholder: false,
    role: "member",
    joinedAt: "2025-11-09",
  },
  {
    id: "ana",
    photo: "photo-1523761415282-2106778cfb5a",
    firstName: "Ana",
    lastName: "Mendez",
    sex: "f",
    birthDate: "1990-11-30",
    lifeStatus: "living",
    bio: "Speech-language pathologist. Aunt Ana to Iris and Theo, technically cousin Ana.",
    location: "Fort Collins, CO",
    isPlaceholder: false,
    role: "member",
    joinedAt: "2025-11-06",
  },
  {
    id: "diego",
    photo: "photo-1655874819398-c6dfbec68ac7",
    firstName: "Diego",
    lastName: "Mendez",
    sex: "m",
    birthDate: "1995-03-17",
    lifeStatus: "living",
    bio: "Lawyer, finally. Pacheco & Reyes.",
    location: "Denver, CO",
    isPlaceholder: false,
    role: "member",
    joinedAt: "2025-12-20",
  },
  {
    id: "iris",
    photo: "photo-1726303827945-9c6e9c3a1a63",
    firstName: "Iris",
    lastName: "Okafor",
    sex: "f",
    birthDate: "2019-06-03",
    lifeStatus: "living",
    bio: "Dinosaurs, pie, and asking why.",
    location: "Denver, CO",
    isPlaceholder: true,
    addedBy: "emma",
  },
  {
    id: "theo",
    photo: "photo-1480985041486-c65b20c01d1f",
    firstName: "Theo",
    lastName: "Okafor",
    sex: "m",
    birthDate: "2026-08-30",
    lifeStatus: "living",
    isPlaceholder: true,
    addedBy: "sam",
  },
];

export const relationships: Relationship[] = [
  { from: "walter", to: "june", type: "spouseOf", since: "1955-06-18" },
  { from: "walter", to: "robert", type: "parentOf" },
  { from: "june", to: "robert", type: "parentOf" },
  { from: "walter", to: "carol", type: "parentOf" },
  { from: "june", to: "carol", type: "parentOf" },

  { from: "robert", to: "diane", type: "spouseOf", since: "1984-05-12" },
  { from: "robert", to: "emma", type: "parentOf" },
  { from: "diane", to: "emma", type: "parentOf" },
  { from: "robert", to: "nate", type: "parentOf" },
  { from: "diane", to: "nate", type: "parentOf" },

  { from: "carol", to: "luis", type: "spouseOf", since: "1991-09-14" },
  { from: "carol", to: "ana", type: "parentOf" },
  { from: "luis", to: "ana", type: "parentOf" },
  { from: "carol", to: "diego", type: "parentOf" },
  { from: "luis", to: "diego", type: "parentOf" },

  { from: "emma", to: "sam", type: "spouseOf", since: "2016-10-01" },
  { from: "emma", to: "iris", type: "parentOf" },
  { from: "sam", to: "iris", type: "parentOf" },
  { from: "emma", to: "theo", type: "parentOf" },
  { from: "sam", to: "theo", type: "parentOf" },
];

function reactions(spec: string): Reaction[] {
  // "carol:❤️ nate:😂" -> Reaction[]
  return spec
    .split(" ")
    .filter(Boolean)
    .map((pair) => {
      const [personId, type] = pair.split(":");
      return { personId, emoji: type };
    });
}

// Unsplash stand-ins for uploaded photos, cropped to the ratio the post was shot in.
const photo = (id: string, alt: string, width = 1200, height = 1500) => ({
  src: `https://images.unsplash.com/${id}?w=${width}&h=${height}&fit=crop&q=75`,
  alt,
  width,
  height,
});

export const initialPosts: Post[] = [
  {
    id: "p-diego-job",
    authorId: "diego",
    createdAt: "2026-09-23T20:14:00-06:00",
    lifeEvent: {
      type: "newJob",
      title: "Started as an associate at Pacheco & Reyes",
      date: "2026-09-21",
    },
    text: "First week done. They gave me an office with an actual window, which I'm told is unheard of for a first-year. Thank you all for putting up with two years of me talking about the bar exam.",
    photos: [
      photo("photo-1534062310633-a22d6b04c01c", "The office building downtown", 1200, 900),
    ],
    tagged: ["diego"],
    reactions: reactions(
      "carol:🥹 luis:❤️ ana:🎉 emma:🎉 nate:😮 robert:👏 diane:❤️ sam:👏",
    ),
    comments: [
      {
        id: "c1",
        authorId: "carol",
        text: "So proud of you, mijo. @Luis Mendez cried. He will deny it.",
        createdAt: "2026-09-23T20:31:00-06:00",
      },
      {
        id: "c2",
        authorId: "luis",
        text: "Something was in my eye.",
        createdAt: "2026-09-23T20:40:00-06:00",
      },
      {
        id: "c3",
        authorId: "nate",
        text: "A window on week one is a power move. Congrats man.",
        createdAt: "2026-09-23T22:02:00-06:00",
      },
    ],
  },
  {
    id: "p-pie",
    authorId: "emma",
    createdAt: "2026-09-21T16:40:00-06:00",
    text: "Pie lesson #1 at Grandma June's. Iris was in charge of the fork marks and took the job very seriously. Grandma says the secret is cold butter and not overthinking it. I have been overthinking it for twenty years.",
    photos: [
      photo("photo-1577048982761-cfe6df488c27", "Iris and Grandma June rolling out dough"),
      photo("photo-1603779702200-95b2785f2083", "Crimping the edge of the crust"),
    ],
    tagged: ["june", "iris"],
    reactions: reactions(
      "carol:🥧 diane:❤️ robert:❤️ ana:🥹 sam:❤️ nate:😂 luis:🥧",
    ),
    comments: [
      {
        id: "c4",
        authorId: "carol",
        text: "She taught me the exact same thing in 1974. I still overthink it.",
        createdAt: "2026-09-21T17:05:00-06:00",
      },
      {
        id: "c5",
        authorId: "diane",
        text: "Save me a slice of whatever survived!",
        createdAt: "2026-09-21T18:22:00-06:00",
      },
    ],
  },
  {
    id: "p-logbook",
    authorId: "robert",
    createdAt: "2026-09-18T11:02:00-06:00",
    text: "Cleaning out the garage and found Dad's logbook from the Midway, 1952. His handwriting hasn't changed a bit from the notes he used to leave on the fridge. Scanning every page this weekend so everyone can have a copy.",
    photos: [
      photo("photo-1595014361663-4c3e702f9c44", "Dad's logbook from the Midway, 1952"),
      photo("photo-1654124803041-79f3cc14a9db", "A page from the logbook"),
    ],
    tagged: ["walter"],
    reactions: reactions(
      "carol:❤️ emma:❤️ nate:😮 diego:👍 ana:❤️",
    ),
    comments: [
      {
        id: "c6",
        authorId: "carol",
        text: "I remember that book. He kept it in the desk drawer with the good stamps.",
        createdAt: "2026-09-18T12:40:00-06:00",
      },
      {
        id: "c7",
        authorId: "emma",
        text: "Yes please. I'll add the scans to Grandpa's profile once you have them.",
        createdAt: "2026-09-18T19:15:00-06:00",
      },
    ],
  },
  {
    id: "p-iris-tooth",
    authorId: "sam",
    createdAt: "2026-09-16T18:20:00-06:00",
    lifeEvent: {
      type: "lostTooth",
      title: "Iris lost her first tooth",
      date: "2026-09-16",
    },
    text: "Bottom front, mid-dinner, straight into the mashed potatoes. The tooth fairy has been notified and says she is \"very busy this week.\"",
    tagged: ["iris"],
    reactions: reactions(
      "emma:🦷 diane:😂 robert:😂 carol:🥹 ana:🧚",
    ),
    comments: [
      {
        id: "c14",
        authorId: "robert",
        text: "Going rate is a dollar now? In my day it was a quarter and a firm handshake.",
        createdAt: "2026-09-16T19:02:00-06:00",
      },
    ],
  },
  {
    id: "p-anniversary",
    authorId: "ana",
    createdAt: "2026-09-14T08:30:00-06:00",
    lifeEvent: {
      type: "anniversary",
      title: "Carol & Luis — 35 years",
      date: "2026-09-14",
    },
    text: "Thirty-five years ago today Mom and Dad got married in the backyard on Alder Street with a borrowed tent and a rainstorm nobody forecast. Happy anniversary to the two people who taught us what showing up looks like.",
    photos: [
      photo("photo-1668688442138-d4906c663d93", "String lights over the backyard on Alder Street", 1200, 900),
    ],
    tagged: ["carol", "luis"],
    reactions: reactions(
      "carol:❤️ luis:❤️ diego:❤️ emma:❤️ robert:❤️ diane:❤️ nate:👍 sam:👍",
    ),
    comments: [
      {
        id: "c8",
        authorId: "robert",
        text: "I held one corner of that tent for three hours. Worth it.",
        createdAt: "2026-09-14T09:12:00-06:00",
      },
    ],
  },
  {
    id: "p-nate-move",
    authorId: "nate",
    createdAt: "2026-09-10T19:48:00-06:00",
    lifeEvent: {
      type: "moved",
      title: "Nate moved to Boulder",
      date: "2026-09-08",
    },
    text: "Officially moved. The apartment has zero furniture and one very good view of the Flatirons. Guest air mattress is available for anyone who wants to visit (please visit).",
    photos: [photo("photo-1705215873044-308705fb4653", "The Flatirons from Nate's balcony", 1200, 900)],
    tagged: [],
    reactions: reactions(
      "diane:❤️ robert:👍 emma:😂 ana:👍",
    ),
    comments: [
      {
        id: "c9",
        authorId: "robert",
        text: "Your mother already has dates picked out.",
        createdAt: "2026-09-10T20:03:00-06:00",
      },
      {
        id: "c10",
        authorId: "diane",
        text: "I do not. (I do.)",
        createdAt: "2026-09-10T20:05:00-06:00",
      },
    ],
  },
  {
    id: "p-theo",
    authorId: "sam",
    createdAt: "2026-09-02T07:15:00-06:00",
    lifeEvent: {
      type: "birth",
      title: "Theo James Okafor",
      date: "2026-08-30",
    },
    text: "Theo arrived Saturday morning, 7 lb 4 oz, with a full head of hair from absolutely nobody's side of the family. Emma and Theo are both doing great. Iris has asked twice if we can return him.",
    photos: [
      photo("photo-1470116945706-e6bf5d5a53ca", "Theo holding onto a finger"),
    ],
    tagged: ["theo", "emma", "iris"],
    reactions: reactions(
      "emma:❤️ robert:🥹 diane:❤️ carol:👶 luis:❤️ ana:🥹 diego:🎉 nate:👶",
    ),
    comments: [
      {
        id: "c11",
        authorId: "diane",
        text: "He has Walter's ears. I'm sorry, but he does.",
        createdAt: "2026-09-02T07:40:00-06:00",
      },
      {
        id: "c12",
        authorId: "ana",
        text: "Welcome, little man. @Iris Okafor, you are going to be the best big sister.",
        createdAt: "2026-09-02T09:02:00-06:00",
      },
    ],
  },
  {
    id: "p-iris-school",
    authorId: "emma",
    createdAt: "2026-08-19T08:05:00-06:00",
    lifeEvent: {
      type: "firstDayOfSchool",
      title: "Iris starts second grade",
      date: "2026-08-19",
    },
    text: "New backpack, same firm refusal to let me take a picture from the front. She informed me second graders \"don't need walking to the door.\" I walked her to the door.",
    photos: [
      photo("photo-1504424715129-fa3bcb0b8903", "Iris walking into school with her backpack"),
    ],
    tagged: ["iris"],
    reactions: reactions(
      "sam:❤️ diane:🥹 robert:🎒 carol:🍎 ana:❤️",
    ),
    comments: [
      {
        id: "c15",
        authorId: "carol",
        text: "Thirty years of first days and it still gets me. Tell her Aunt Carol says good luck.",
        createdAt: "2026-08-19T09:40:00-06:00",
      },
    ],
  },
  {
    id: "p-walter-memorial",
    authorId: "carol",
    createdAt: "2026-08-12T09:00:00-06:00",
    lifeEvent: {
      type: "memorial",
      title: "Remembering Walter Harlow",
      date: "2019-08-12",
    },
    text: "Seven years today. Dad would have spent this morning at the hardware store even though he sold it in '92, telling the new owners how to organize the fasteners. We miss you.",
    tagged: ["walter", "june", "robert"],
    reactions: reactions(
      "robert:🕯️ emma:❤️ diane:🕯️ nate:❤️ ana:🙏 diego:🙏",
    ),
    comments: [
      {
        id: "c13",
        authorId: "robert",
        text: "The fasteners were, in fairness, badly organized.",
        createdAt: "2026-08-12T10:30:00-06:00",
      },
    ],
  },
  {
    id: "p-robert-retire",
    authorId: "diane",
    createdAt: "2026-07-01T20:10:00-06:00",
    lifeEvent: {
      type: "retirement",
      title: "Robert retires after 38 years with the city",
      date: "2026-06-30",
    },
    text: "Thirty-eight years of bridges, culverts and one very famous argument about a roundabout. The department threw him a party with far too many cupcakes. He has already reorganized the garage twice.",
    photos: [
      photo("photo-1768851142407-c663a54d70b8", "Cupcakes from Robert's retirement party", 1200, 900),
    ],
    tagged: ["robert"],
    reactions: reactions(
      "emma:🎉 nate:🎉 carol:👏 luis:🍻 ana:🎉 diego:👏 sam:🙌",
    ),
    comments: [
      {
        id: "c16",
        authorId: "nate",
        text: "Dad, the garage was fine the first time.",
        createdAt: "2026-07-01T20:45:00-06:00",
      },
    ],
  },
  {
    id: "p-juniper",
    authorId: "sam",
    createdAt: "2026-06-21T12:30:00-06:00",
    lifeEvent: {
      type: "newPet",
      title: "Meet Juniper",
      date: "2026-06-20",
    },
    text: "Iris named her after Grandma June, which Grandma June has decided is the highest honor of her life. Nine weeks old, already eaten one shoe.",
    photos: [photo("photo-1591160690555-5debfba289f0", "Juniper, a golden retriever puppy")],
    tagged: ["emma", "iris", "june"],
    reactions: reactions(
      "diane:🐶 robert:❤️ carol:😍 ana:🐶 nate:😂 diego:🐾",
    ),
    comments: [],
  },
  {
    id: "p-ana-grad",
    authorId: "luis",
    createdAt: "2026-05-17T13:20:00-06:00",
    lifeEvent: {
      type: "graduation",
      title: "M.S., Speech-Language Pathology",
      date: "2026-05-16",
    },
    text: "Two years of clinicals, one thesis and a lot of late-night coffee. Our Ana is a master. Congratulations, mija.",
    photos: [
      photo("photo-1523580846011-d3a5bc25702b", "Ana at commencement"),
    ],
    tagged: ["ana", "carol"],
    reactions: reactions(
      "carol:❤️ diego:❤️ emma:❤️ diane:👍 robert:👍",
    ),
    comments: [],
  },
];

export const initialNotifications: AppNotification[] = [
  {
    id: "n1",
    type: "postCreated",
    actorId: "diego",
    postId: "p-diego-job",
    createdAt: "2026-09-23T20:14:00-06:00",
    read: false,
    preview: "Started as an associate at Pacheco & Reyes",
  },
  {
    id: "n2",
    type: "commentAdded",
    actorId: "diane",
    postId: "p-pie",
    createdAt: "2026-09-21T18:22:00-06:00",
    read: false,
    preview: "Save me a slice of whatever survived!",
  },
  {
    id: "n3",
    type: "commentAdded",
    actorId: "carol",
    postId: "p-pie",
    createdAt: "2026-09-21T17:05:00-06:00",
    read: false,
    preview: "She taught me the exact same thing in 1974.",
  },
  {
    id: "n4",
    type: "reactionAdded",
    emoji: "❤️",
    actorId: "robert",
    postId: "p-pie",
    createdAt: "2026-09-21T16:58:00-06:00",
    read: true,
  },
  {
    id: "n5",
    type: "postCreated",
    actorId: "robert",
    postId: "p-logbook",
    createdAt: "2026-09-18T11:02:00-06:00",
    read: true,
    preview: "Found Dad's logbook from the Midway, 1952.",
  },
  {
    id: "n6",
    type: "memberJoined",
    actorId: "luis",
    createdAt: "2026-09-05T14:10:00-06:00",
    read: true,
  },
  {
    id: "n7",
    type: "memberTagged",
    actorId: "sam",
    postId: "p-theo",
    createdAt: "2026-09-02T07:15:00-06:00",
    read: true,
    preview: "Theo James Okafor",
  },
];
