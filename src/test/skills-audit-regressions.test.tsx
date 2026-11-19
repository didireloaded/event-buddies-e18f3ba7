import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SheetContent } from "@/components/companion/SheetContent";
import { OrganiserSignIn } from "@/components/organiser/OrganiserSignIn";
import { getDemoData } from "@/lib/event/demo-data";
import { buildPlaces } from "@/lib/attendee/map";
import type { DemoData } from "@/lib/event/types";

const mockCtx = vi.hoisted(() => ({ current: {} as any }));
const mockOtp = vi.hoisted(() => vi.fn());

vi.mock("@/components/companion/context", () => ({
  useCompanion: () => mockCtx.current,
  initials: (name: string) => name.slice(0, 2),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className }: any) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithOtp: mockOtp,
    },
  },
}));

function buildConferenceData(): DemoData {
  const base = getDemoData();
  return {
    ...base,
    event: {
      ...base.event,
      id: "windhoek-tech-summit-2027",
      slug: "windhoek-tech-summit-2027",
      name: "Windhoek Tech Summit",
      description: "Annual developer and product conference in Windhoek.",
      category: "Conference",
      venueName: "Safari Court",
      city: "Windhoek",
      country: "Namibia",
      startAt: new Date("2027-06-15T09:00:00+02:00"),
      endAt: new Date("2027-06-15T17:00:00+02:00"),
      ticketUrl: null,
    },
    stages: [
      {
        id: "hall-a",
        eventId: "windhoek-tech-summit-2027",
        name: "Hall A",
        description: "Keynote auditorium",
        latitude: null,
        longitude: null,
        mapX: 50,
        mapY: 50,
        colorKey: "amber",
        status: "open",
        sortOrder: 0,
      },
    ],
    festival: {
      ...base.festival,
      organiser: "Namibia Tech Guild",
      officialUrl: "",
      ticketUrl: "",
      timingNotice: "Sessions run 09:00–17:00 CAT.",
      mapNotice: "Venue floor plan supplied by Namibia Tech Guild.",
      timetablePublished: true,
      rules: ["Bring your conference badge for entry."],
      artists: [
        {
          id: "dr-ndapewa",
          name: "Dr Ndapewa Shikongo",
          role: "Keynote Speaker",
          stageId: "hall-a",
          avatarUrl: null,
        },
      ],
      relatedEvent: {
        name: "",
        date: "",
        venue: "",
        url: "",
      },
    },
  };
}

describe("Skills-driven audit regressions", () => {
  afterEach(() => {
    cleanup();
    mockOtp.mockReset();
  });

  it("renders honest multi-event details for a conference without Howler, Namib Rage, 18+ or broken links", () => {
    const data = buildConferenceData();
    mockCtx.current = {
      data,
      places: buildPlaces(data),
      attendee: {
        ready: true,
        preferences: {
          savedArtists: [],
          saved: [],
          reminders: [],
          profile: { name: "Amina" },
        },
        toggleArtist: vi.fn(),
        toggleSaved: vi.fn(),
        notify: vi.fn(),
        update: vi.fn(() => true),
      },
      openSheet: vi.fn(),
      closeSheet: vi.fn(),
      openPlace: vi.fn(),
      navigate: vi.fn(),
      showOnMap: vi.fn(),
      spin: vi.fn(),
      focusLineupSearch: vi.fn(),
      map: {},
    };

    const { container } = render(<SheetContent sheet={{ kind: "event" }} onShare={vi.fn()} />);

    expect(container.textContent).not.toContain("Howler");
    expect(container.textContent).not.toContain("Namib Rage");
    expect(container.textContent).not.toContain("18+ with ID");
    expect(container.textContent).toContain("1 room · 1 announced speaker");
    expect(container.textContent).toContain("Organised by Namibia Tech Guild");
    expect(container.textContent).toContain("Ticket purchases happen directly with the organiser");
    expect(container.querySelectorAll("a[href='']")).toHaveLength(0);
    expect(screen.getByRole("button", { name: /Agenda/i })).toBeInTheDocument();
  });

  it("hides music streaming search links for conference speakers in the artist/speaker sheet", () => {
    const data = buildConferenceData();
    const speaker = data.festival.artists[0]!;
    mockCtx.current = {
      data,
      places: buildPlaces(data),
      attendee: {
        ready: true,
        preferences: {
          savedArtists: [],
          saved: [],
          reminders: [],
          profile: { name: "Amina" },
        },
        toggleArtist: vi.fn(),
        toggleSaved: vi.fn(),
        notify: vi.fn(),
        update: vi.fn(() => true),
      },
      openSheet: vi.fn(),
      closeSheet: vi.fn(),
      openPlace: vi.fn(),
      navigate: vi.fn(),
      showOnMap: vi.fn(),
      spin: vi.fn(),
      focusLineupSearch: vi.fn(),
      map: {},
    };

    const { container } = render(
      <SheetContent sheet={{ kind: "artist", artist: speaker }} onShare={vi.fn()} />,
    );

    expect(container.textContent).not.toContain("Spotify");
    expect(container.textContent).not.toContain("Apple Music");
    expect(container.textContent).not.toContain("Howler");
    expect(container.textContent).toContain("Listed by Namibia Tech Guild.");
    expect(screen.getByRole("button", { name: /Find the room/i })).toBeInTheDocument();
  });

  it("recovers cleanly from a rejected signInWithOtp network call and lets organiser change email", async () => {
    mockOtp.mockRejectedValueOnce(new Error("Network down"));
    render(<OrganiserSignIn />);

    fireEvent.change(screen.getByLabelText("Work email"), {
      target: { value: "ops@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Email me a link" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t send the link. Try again.");
    });

    mockOtp.mockResolvedValueOnce({ error: null });
    fireEvent.click(screen.getByRole("button", { name: "Email me a link" }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Check ops@example.com for your sign-in link.",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Use a different email" }));
    expect(screen.getByLabelText("Work email")).toBeInTheDocument();
  });
});
