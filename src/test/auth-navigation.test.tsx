import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  authDestination,
  entryState,
  globalCategory,
  INTERESTS,
  parsePlatformPreferences,
} from "@/lib/account/platform-navigation";
import { authErrorMessage } from "@/lib/account/auth-errors";
import { captureCrewInviteFromUrl, readPendingCrewInvite } from "@/lib/crew/invite-link";
import { Login } from "@/routes/login";
const mocks = vi.hoisted(() => ({
  next: "/#events",
  mode: "up",
  navigate: vi.fn(),
  signup: vi.fn(),
  signIn: vi.fn(),
  resend: vi.fn(),
  reset: vi.fn(),
  auth: { user: null, loading: false, configured: true, error: "" },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => ({
    ...(config as object),
    useSearch: () => ({ next: mocks.next, mode: mocks.mode }),
  }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("@/lib/account/use-auth", () => ({ useAccountAuth: () => mocks.auth }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    supabaseUrl: "https://app.invalid",
    supabaseKey: "public",
    auth: {
      signUp: mocks.signup,
      signInWithPassword: mocks.signIn,
      resend: mocks.resend,
      resetPasswordForEmail: mocks.reset,
    },
  },
}));
vi.mock("@/integrations/lovable/index", () => ({ lovable: { auth: {} } }));
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
  mocks.mode = "up";
  mocks.signup.mockResolvedValue({ data: { session: null }, error: null });
  mocks.resend.mockResolvedValue({ error: null });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ external: {} }) }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("account entry", () => {
  it("defaults to signup and does not claim sign-in when email confirmation is pending", async () => {
    render(<Login />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.org" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "strong-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));
    await waitFor(() =>
      expect(mocks.signup).toHaveBeenCalledWith({
        email: "test@example.org",
        password: "strong-password",
        options: { emailRedirectTo: expect.stringContaining("/login?next=%2F%23events") },
      }),
    );
    expect(await screen.findByRole("button", { name: "Resend confirmation" })).toBeVisible();
    expect(mocks.navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation" }));
    await waitFor(() =>
      expect(mocks.resend).toHaveBeenCalledWith(
        expect.objectContaining({ type: "signup", email: "test@example.org" }),
      ),
    );
  });
  it("separates sign-in and forgot password from signup", async () => {
    mocks.mode = "in";
    render(<Login />);
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.org" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    await waitFor(() =>
      expect(mocks.reset).toHaveBeenCalledWith("test@example.org", {
        redirectTo: "http://localhost:3000/reset-password",
      }),
    );
    expect(mocks.signup).not.toHaveBeenCalled();
  });
  it("guest entry goes to Discover without an auth request", async () => {
    render(<Login />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Continue as Guest" }));
    });
    expect(mocks.navigate).toHaveBeenCalledWith({ href: "/#events", replace: true });
    expect(mocks.signup).not.toHaveBeenCalled();
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
});
describe("first-time navigation contract", () => {
  const fresh = {
    direct: false,
    view: "home",
    signedIn: false,
    completed: false,
    legacyCompleted: false,
    selected: false,
  };
  it("first-time users see global onboarding, not a mandatory demo event", () => {
    expect(entryState(fresh)).toEqual({ onboarding: true, discovering: false });
  });
  it("fresh signed-in users discover events without repeating signup", () => {
    expect(entryState({ ...fresh, signedIn: true })).toEqual({
      onboarding: false,
      discovering: true,
    });
  });
  it("guest choice hands off to Discover", () => {
    expect(entryState({ ...fresh, completed: true, view: "events" })).toEqual({
      onboarding: false,
      discovering: true,
    });
  });
  it("explicit event entry retains all four event tabs", () => {
    for (const view of ["home", "lineup", "map", "crew"])
      expect(entryState({ ...fresh, direct: true, view })).toEqual({
        onboarding: false,
        discovering: false,
      });
  });
  it("retains a direct invite and its return path", () => {
    const code = "10000000-0000-4000-8000-000000000001";
    window.history.replaceState({}, "", `/?crewInvite=${code}#crew`);
    expect(authDestination(`/?crewInvite=${code}#crew`)).toBe(`/?crewInvite=${code}#crew`);
    captureCrewInviteFromUrl();
    expect(readPendingCrewInvite()).toBe(code);
    expect(entryState({ ...fresh, view: "crew" }).onboarding).toBe(false);
  });
  it("allowlists same-origin paths and defaults ordinary account entry to Discover", () => {
    expect(authDestination(undefined)).toBe("/#events");
    expect(authDestination("https://evil.example")).toBe("/#events");
    expect(authDestination("//evil.example")).toBe("/#events");
    expect(authDestination("/events/conference#map")).toBe("/events/conference#map");
    expect(authDestination("/.lovable/oauth/consent?authorization_id=a")).toBe(
      "/.lovable/oauth/consent?authorization_id=a",
    );
  });
  it("stores exactly the six global multi-select interests separately from event mode", () => {
    expect(INTERESTS).toEqual([
      "Music",
      "Conferences",
      "Corporate",
      "Parties/Nightlife",
      "Sports",
      "Culture/Markets",
    ]);
    expect(
      parsePlatformPreferences({
        interests: ["Conferences", "Sports", "friends"],
        completed: true,
      }),
    ).toEqual({ interests: ["Conferences", "Sports"], completed: true });
    expect(globalCategory("Music festival")).toBe("Music");
    expect(globalCategory("Conference")).toBe("Conferences");
    expect(globalCategory("Food & market")).toBe("Culture/Markets");
  });
  it("explains confirmation errors without bypassing verification", () => {
    expect(authErrorMessage({ code: "email_not_confirmed" })).toContain("Confirm your email");
  });
});
