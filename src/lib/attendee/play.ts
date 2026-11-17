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

export function randomItem<T>(items: readonly T[]) {
  return items[crypto.getRandomValues(new Uint32Array(1))[0]! % Math.max(items.length, 1)];
}
