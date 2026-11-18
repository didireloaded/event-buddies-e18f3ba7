import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { oauthReturnPath, redirectHost } from "@/lib/oauth-return-path";
import { Consent } from "@/routes/[.]lovable.oauth.consent";

afterEach(cleanup);

describe("oauthReturnPath and redirectHost", () => {
  it("allows safe internal paths and rejects open redirects or control characters", () => {
    expect(oauthReturnPath("/#crew")).toBe("/#crew");
    expect(oauthReturnPath("/.lovable/oauth/consent?authorization_id=abc")).toBe(
      "/.lovable/oauth/consent?authorization_id=abc",
    );
    expect(oauthReturnPath("https://evil.example")).toBe("/");
    expect(oauthReturnPath("//evil.example")).toBe("/");
    expect(oauthReturnPath("/\\evil.example")).toBe("/");
    expect(oauthReturnPath("/bad\npath")).toBe("/");
  });

  it("extracts redirect host safely even when redirect_uri is invalid", () => {
    expect(redirectHost("https://claude.ai/api/mcp/auth_callback")).toBe("claude.ai");
    expect(redirectHost("not a url")).toBeNull();
    expect(redirectHost(undefined)).toBeNull();
  });
});

describe("OAuth consent screen", () => {
  it("states public fact scope accurately without false phone-only sync claims", () => {
    render(
      <Consent
        authorizationId="auth-123"
        details={{
          client: { name: "Festival Helper" },
          redirect_uri: "https://assistant.example/callback",
        }}
        email="maya@example.com"
        onDecide={vi.fn()}
        onRedirect={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/read public Sound of Summer event info, the lineup and venue places/i),
    ).toBeVisible();
    expect(
      screen.getByText(/your synced saved artists, meeting plan and private crew/i),
    ).toBeVisible();
    expect(
      screen.getByText(/Your local ticket copy and photo diary stay on your phone/i),
    ).toBeVisible();
    expect(screen.getByText("Returns to assistant.example")).toBeVisible();
  });

  it("redirects on approval and reports missing redirect errors without leaving busy stuck", async () => {
    const onRedirect = vi.fn();
    const onDecide = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: "Request expired." } })
      .mockResolvedValueOnce({
        data: { redirect_url: "https://assistant.example/done" },
        error: null,
      });

    render(
      <Consent
        authorizationId="auth-123"
        details={{ client: { name: "Festival Helper" } }}
        email="maya@example.com"
        onDecide={onDecide}
        onRedirect={onRedirect}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Request expired.");
    expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    });
    expect(onDecide).toHaveBeenNthCalledWith(1, true);
    expect(onDecide).toHaveBeenNthCalledWith(2, true);
    expect(onRedirect).toHaveBeenCalledWith("https://assistant.example/done");
  });
});
