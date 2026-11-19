export const BINGO_ITEMS = [
  { id: "artist", label: "Save an artist" },
  { id: "stage", label: "Explore a stage" },
  { id: "photo", label: "Take a crew photo" },
  { id: "water", label: "Take a water break" },
  { id: "meet", label: "Agree on a meetup" },
  { id: "dance", label: "Try a new dance move" },
  { id: "layer", label: "Remember your warm layer" },
  { id: "song", label: "Find a new favourite song" },
  { id: "home", label: "Confirm your ride home" },
] as const;

export const PHOTO_PROMPTS = [
  "A crew photo with everyone in the frame.",
  "Your favourite stage lights, from a safe place to stop.",
  "One photo that captures your favourite moment.",
  "A before-and-after photo of your festival outfits.",
];

export const ICEBREAKERS = [
  "Which artist brought you here?",
  "What’s one song your friends should hear?",
  "Which stage are you trying next?",
  "What’s your favourite festival memory?",
];

export const SOUND_OF_SUMMER_TRIVIA = [
  {
    id: "venue",
    question: "Which coastal venue hosts Sound of Summer 2026?",
    options: [
      "Tidal Pools & Jetty Beach, Langstrand",
      "Dune 7 Amphitheatre",
      "Windhoek Showgrounds",
    ],
    answerIndex: 0,
    fact: "Sound of Summer takes place at Tidal Pools & Jetty Beach in Langstrand between Swakopmund and Walvis Bay.",
  },
  {
    id: "stages",
    question: "How many stages are mapped on the official 2026 venue plan?",
    options: ["2 stages", "3 stages", "5 stages"],
    answerIndex: 1,
    fact: "The venue plan maps the Main Stage, House & Techno Stage, and Amapiano & Afro Tech Stage.",
  },
  {
    id: "headliner",
    question: "Which announced international headliner is billed on the Main Stage?",
    options: ["Shimza", "Black Coffee", "Kabza De Small"],
    answerIndex: 0,
    fact: "Shimza is the announced international headliner for the Main Stage.",
  },
  {
    id: "hours",
    question: "What are the published festival hours on 28 December 2026?",
    options: ["12:00 to 23:00 CAT", "10:00 (28 Dec) to 04:00 CAT (29 Dec)", "16:00 to 02:00 CAT"],
    answerIndex: 1,
    fact: "Doors open at 10:00 CAT on 28 December and the festival runs until 04:00 CAT on 29 December.",
  },
] as const;

export function randomItem<T>(items: readonly T[]) {
  return items[crypto.getRandomValues(new Uint32Array(1))[0]! % Math.max(items.length, 1)];
}
