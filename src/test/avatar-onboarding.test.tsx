import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateAvatarFile } from "@/lib/attendee/avatar";
import { Onboarding } from "@/components/companion/Onboarding";
import { ProfileForm } from "@/components/companion/forms";
import { getDemoData } from "@/lib/event/demo-data";
import { defaultPreferences } from "@/lib/attendee/use-attendee";

import type { Preferences } from "@/lib/attendee/use-attendee";

type MockCtx = {
  data: ReturnType<typeof getDemoData>;
  navigate: ReturnType<typeof vi.fn>;
  attendee: {
    preferences: Preferences;
    ready: boolean;
    update: ReturnType<typeof vi.fn>;
  };
  avatar: {
    url: string | null;
    busy: boolean;
    error: string;
    save: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
};

const mocks = vi.hoisted(() => ({ ctx: {} as MockCtx }));
vi.mock("@/components/companion/context", () => ({
  useCompanion: () => mocks.ctx,
  initials: (name: string) =>
    name
      .split(" ")
      .map((part) => part[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase(),
}));

afterEach(cleanup);

beforeEach(() => {
  const data = getDemoData();
  const preferences = defaultPreferences(data);
  mocks.ctx = {
    data,
    navigate: vi.fn(),
    attendee: {
      preferences,
      ready: true,
      update: vi.fn((patch) => {
        Object.assign(preferences, patch);
        return true;
      }),
    },
    avatar: {
      url: null,
      busy: false,
      error: "",
      save: vi.fn(async () => true),
      remove: vi.fn(async () => true),
    },
  };
});

describe("avatar file validation", () => {
  it("accepts JPG, PNG, and WebP under 5 MB and rejects invalid files", () => {
    expect(validateAvatarFile({ type: "image/jpeg", size: 1024 })).toBeNull();
    expect(validateAvatarFile({ type: "image/png", size: 2048 })).toBeNull();
    expect(validateAvatarFile({ type: "image/webp", size: 5 * 1024 * 1024 })).toBeNull();
    expect(validateAvatarFile({ type: "image/gif", size: 1024 })).toMatch(/JPG, PNG or WebP/);
    expect(validateAvatarFile({ type: "application/pdf", size: 1024 })).toMatch(/JPG, PNG or WebP/);
    expect(validateAvatarFile({ type: "image/png", size: 0 })).toMatch(/under 5 MB/);
    expect(validateAvatarFile({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).toMatch(
      /under 5 MB/,
    );
  });
});

describe("onboarding optional self-photo picker", () => {
  it("lets the user skip to name, continue without a photo, or attach and remove one", async () => {
    const view = render(<Onboarding />);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    const fileInput = view.container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    expect(fileInput.getAttribute("accept")).toContain("image/png");
    expect(fileInput.hasAttribute("capture")).toBe(false);

    const photo = new File([new Uint8Array([1, 2, 3])], "me.png", { type: "image/png" });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [photo] } });
    });
    expect(mocks.ctx.avatar.save).toHaveBeenCalledWith(photo);

    mocks.ctx.avatar.url = "blob:avatar-preview";
    view.rerender(<Onboarding />);
    expect(screen.getByRole("img", { name: /profile photo/i })).toHaveAttribute(
      "src",
      "blob:avatar-preview",
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));
    expect(mocks.ctx.avatar.remove).toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Maya" } });
    fireEvent.click(screen.getByRole("button", { name: "Go to my event" }));
    expect(mocks.ctx.attendee.update).toHaveBeenCalledWith(
      expect.objectContaining({ hasName: true, onboardingDone: true }),
    );
  });

  it("exposes photo replace and remove inside ProfileForm too", () => {
    mocks.ctx.avatar.url = "blob:profile-avatar";
    render(
      <ProfileForm
        initial={{ name: "Maya", handle: "maya" }}
        disabled={false}
        savedCount={2}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByRole("img", { name: /Maya’s profile photo/i })).toHaveAttribute(
      "src",
      "blob:profile-avatar",
    );
    expect(screen.getByRole("button", { name: "Remove photo" })).toBeVisible();
  });
});
