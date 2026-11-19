import { useEffect, useRef, useState } from "react";
import { Camera, Plus, Radio } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { photoStore } from "@/lib/attendee/ride-photo";
import { useCompanion, initials } from "./context";
import { QrCameraScanner } from "./QrCameraScanner";
import { Sheet } from "./Sheet";
import { MeetingForm } from "./forms";
import { eventTime } from "@/lib/attendee/schedule";
import {
  buildCrewInviteUrl,
  captureCrewInviteFromUrl,
  clearPendingCrewInvite,
  extractCrewInviteCode,
  readPendingCrewInvite,
  readPendingCrewInviteMeta,
  type CrewInviteMeta,
} from "@/lib/crew/invite-link";
import {
  broadcastCrewLostAlert,
  dropCrewPin,
  removeCrewPin,
  requestOneTimeGeolocation,
} from "@/lib/crew/pins";
import {
  classifyPositionFreshness,
  computeLiveShareExpiry,
  formatAccuracyBadge,
  startActiveLiveGps,
  type LiveGpsPosition,
  type LiveLocationDuration,
  type LiveLocationStatus,
} from "@/lib/crew/live-gps";
import { PrimaryButton, SecondaryButton, Avatar } from "./ui";

export function ConnectedCrew() {
  const { crew: sync, attendee, avatar, data, places, openPlace, now } = useCompanion();
  const [mode, setMode] = useState<
    "create" | "join" | "invite" | "meeting" | "leave" | "pin" | "live-gps" | null
  >(null);
  const [name, setName] = useState("Our crew");
  const [code, setCode] = useState("");
  const [pendingInvite, setPendingInvite] = useState<string | null>(null);
  const [inviteMeta, setInviteMeta] = useState<CrewInviteMeta | null>(null);
  const [pointId, setPointId] = useState(places[0]?.id ?? "");
  const [localError, setLocalError] = useState("");
  const [scanningQr, setScanningQr] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [liveDuration, setLiveDuration] = useState<LiveLocationDuration>("60m");
  const [liveStatus, setLiveStatus] = useState<LiveLocationStatus>("off");
  const [livePos, setLivePos] = useState<LiveGpsPosition | null>(null);
  const [liveError, setLiveError] = useState("");
  const [crewPhotoUrl, setCrewPhotoUrl] = useState("");
  const stopLiveGpsRef = useRef<(() => void) | null>(null);
  const crew = sync.crew;
  const self = crew?.members.find((m) => m.id === attendee.auth.user?.id);

  useEffect(() => {
    if (!crew?.id) {
      setCrewPhotoUrl("");
      return;
    }
    let active = true;
    let url = "";
    void photoStore(`crew-photo:${crew.id}`, "read")
      .then((blob) => {
        if (!active || !blob) return;
        url = URL.createObjectURL(blob);
        setCrewPhotoUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [crew?.id]);
  const waiting = Boolean(sync.pending);
  const meetingPlace = places.find((p) => p.id === crew?.meeting?.pointId);
  const activePin =
    self?.pointId && self.expiresAt && Date.parse(self.expiresAt) > (now ?? Date.now());
  const isLiveSharing =
    liveStatus === "starting" ||
    liveStatus === "live" ||
    liveStatus === "paused_background" ||
    liveStatus === "outdated";

  useEffect(() => {
    return () => {
      stopLiveGpsRef.current?.();
      stopLiveGpsRef.current = null;
    };
  }, []);

  function stopLiveGpsSession() {
    stopLiveGpsRef.current?.();
    stopLiveGpsRef.current = null;
    setLiveStatus("off");
    setLivePos(null);
    setLiveError("");
  }

  function startLiveGpsSession() {
    if (!crew || !self) return;
    stopLiveGpsSession();
    const expiresAt = computeLiveShareExpiry(liveDuration, data.event.endAt);
    const sessionId = crypto.randomUUID();
    setLiveError("");
    stopLiveGpsRef.current = startActiveLiveGps({
      expiresAt,
      sessionId,
      onStatusChange: (nextStatus, err) => {
        setLiveStatus(nextStatus);
        if (err) setLiveError(err);
      },
      onPosition: (pos) => {
        setLivePos(pos);
        const fallbackPlace = places.find((p) => p.id === (self.pointId ?? pointId)) ?? places[0];
        void dropCrewPin({
          eventId: data.event.id,
          crewId: crew.id,
          userId: self.id,
          displayName: self.name,
          pointId: self.pointId ?? fallbackPlace?.id ?? null,
          x: fallbackPlace?.x ?? null,
          y: fallbackPlace?.y ?? null,
          lat: pos.lat,
          lng: pos.lng,
        });
      },
      onExpired: () => {
        setLivePos(null);
        void removeCrewPin({
          crewId: crew.id,
          userId: self.id,
          pointId: self.pointId,
        });
        attendee.notify("Live location sharing expired");
      },
    });
    setMode(null);
  }

  useEffect(() => {
    const captured = captureCrewInviteFromUrl() ?? readPendingCrewInvite();
    if (captured) {
      setPendingInvite(captured);
      setInviteMeta(readPendingCrewInviteMeta());
      setCode(captured);
    }
  }, []);

  useEffect(() => {
    if (attendee.auth.user && !crew && !sync.loading && pendingInvite) {
      setCode(pendingInvite);
      setMode("join");
      setPendingInvite(null);
      clearPendingCrewInvite();
    }
  }, [attendee.auth.user, crew, sync.loading, pendingInvite]);

  function open(next: typeof mode) {
    setLocalError("");
    setScanningQr(false);
    setMode(next);
  }
  async function shareInvite() {
    if (!sync.invite) return;
    const link = buildCrewInviteUrl(window.location.origin, sync.invite.code, {
      crewName: crew?.name,
      inviterName: self?.name ?? attendee.preferences.profile.name,
    });
    const text = `Join ${crew?.name ?? "our crew"} on Event Buddies: ${link}\nCrew code: ${sync.invite.code}`;
    try {
      if (navigator.share) await navigator.share({ title: "Event Buddies crew", text, url: link });
      else {
        await navigator.clipboard.writeText(text);
        attendee.notify("Crew invite copied");
      }
    } catch {
      setLocalError("Couldn’t share the invite. Copy the code below.");
    }
  }
  return (
    <section
      className="mx-4 mt-4 border-y border-border py-4"
      aria-labelledby="connected-crew-heading"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {crew && crewPhotoUrl && (
            <img
              src={crewPhotoUrl}
              alt={`${crew.name} photo`}
              className="size-11 flex-none rounded-xl object-cover ring-1 ring-border"
            />
          )}
          <h2 id="connected-crew-heading" className="truncate text-[22px] font-semibold">
            {crew?.name ?? "Your connected crew"}
          </h2>
        </div>
        {crew && self?.owner && (
          <label className="ios-press inline-flex min-h-10 flex-none cursor-pointer items-center gap-1.5 rounded-full bg-secondary px-3 text-[13px] font-semibold text-foreground">
            <Camera size={14} aria-hidden />
            {crewPhotoUrl ? "Change photo" : "Crew photo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={async (e) => {
                const chosen = e.currentTarget.files?.[0];
                e.currentTarget.value = "";
                if (!chosen) return;
                if (
                  !["image/jpeg", "image/png", "image/webp"].includes(chosen.type) ||
                  chosen.size > 4 * 1024 * 1024
                ) {
                  setLocalError("Choose a JPG, PNG or WebP crew photo under 4 MB.");
                  return;
                }
                try {
                  await photoStore(`crew-photo:${crew.id}`, "save", chosen);
                  setCrewPhotoUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return URL.createObjectURL(chosen);
                  });
                  attendee.notify("Crew photo updated on this device");
                } catch {
                  setLocalError("Couldn’t save crew photo.");
                }
              }}
            />
          </label>
        )}
      </div>
      {!attendee.auth.user ? (
        <>
          {pendingInvite && (
            <div
              role="status"
              data-testid="crew-invite-preview"
              className="mt-3 space-y-3 rounded-2xl bg-secondary p-4"
            >
              <div className="flex items-center gap-3">
                <Avatar label={initials(inviteMeta?.inviterName ?? "Friend")} index={1} />
                <div>
                  <p className="text-[17px] font-bold">
                    {inviteMeta?.inviterName
                      ? `${inviteMeta.inviterName} invited you`
                      : "You’re invited to a crew"}
                  </p>
                  <p className="text-[14px] text-muted-foreground">
                    {inviteMeta?.crewName ?? `Private ${data.event.name} crew`}
                  </p>
                </div>
              </div>
              <p className="text-[15px] font-medium">
                Crew invite ready — sign in to review and join this private crew.
              </p>
              <a
                href="/login?next=%2F%23crew"
                className="flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-[16px] font-semibold text-primary-foreground"
              >
                Join {inviteMeta?.crewName ?? "crew"}
              </a>
            </div>
          )}
          <p className="mt-2 text-[15px] text-muted-foreground">
            Sign in to share a crew and meeting across your phones.
          </p>
          <a
            href="/login?next=%2F%23crew"
            className="flex min-h-11 items-center font-semibold text-primary"
          >
            Sign in for shared crews
          </a>
        </>
      ) : (
        <>
          {sync.loading && (
            <p role="status" className="text-[15px] text-muted-foreground">
              Checking your crew…
            </p>
          )}
          {sync.checkedAt && (
            <p className="mt-1 text-[14px] text-muted-foreground">
              Last checked{" "}
              {new Date(sync.checkedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              . Refreshes while this app is open.
            </p>
          )}
          {waiting && (
            <p role="status" className="mt-2 text-[15px]">
              {sync.pending?.command.op === "stop"
                ? "Sharing is hidden here. Remote removal is waiting for confirmation."
                : "Crew action waiting for confirmation. It will retry when connected."}
            </p>
          )}
          {sync.error && (
            <div role="alert" className="mt-2 text-[15px]">
              <p>{sync.error}</p>
              <button
                type="button"
                className="min-h-11 font-semibold text-primary"
                onClick={sync.refresh}
              >
                Retry crew sync
              </button>
            </div>
          )}
          {!crew ? (
            <div className="mt-3 space-y-3 rounded-2xl bg-popover p-4">
              <div className="flex items-center gap-3">
                <Avatar
                  label={initials(attendee.preferences.profile.name)}
                  src={avatar?.url}
                  alt="Your profile photo"
                />
                <p className="text-[15px] text-muted-foreground">
                  No active crew yet. Start a private crew to drop live 60-minute landmark pins and
                  coordinate a meeting point across your phones.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <PrimaryButton disabled={waiting || sync.loading} onClick={() => open("create")}>
                  Start a crew
                </PrimaryButton>
                <SecondaryButton disabled={waiting || sync.loading} onClick={() => open("join")}>
                  Join with a code
                </SecondaryButton>
              </div>
            </div>
          ) : (
            <>
              {sync.lostAlert && (
                <div
                  role="alert"
                  className="mt-3 rounded-2xl border border-destructive bg-destructive/10 p-3 text-[15px]"
                >
                  <p className="font-semibold text-destructive">
                    {sync.lostAlert.authorName} is looking for you
                  </p>
                  <p className="mt-0.5">{sync.lostAlert.message}</p>
                  <div className="mt-2 flex gap-4">
                    {sync.lostAlert.pointId && (
                      <button
                        type="button"
                        className="min-h-10 font-semibold text-primary"
                        onClick={() => openPlace(sync.lostAlert!.pointId!)}
                      >
                        Show on map ↗
                      </button>
                    )}
                    <button
                      type="button"
                      className="min-h-10 text-muted-foreground"
                      onClick={() => sync.dismissLostAlert?.()}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
              {/* Visual circular member avatar strip with Add button */}
              <div className="scrollbar-none mt-3 flex items-center gap-3 overflow-x-auto rounded-2xl bg-popover px-3.5 py-3">
                {crew.members.map((member) => (
                  <div
                    key={`strip-${member.id}`}
                    className="flex w-16 flex-none flex-col items-center gap-1"
                  >
                    <Avatar
                      label={initials(member.name)}
                      src={member.id === attendee.auth.user?.id ? avatar?.url : null}
                      alt={member.id === attendee.auth.user?.id ? "Your profile photo" : ""}
                    />
                    <span className="w-full truncate text-center text-[12px] font-medium">
                      {member.id === attendee.auth.user?.id ? "You" : member.name}
                    </span>
                  </div>
                ))}
                {self?.owner && (
                  <button
                    type="button"
                    disabled={waiting}
                    onClick={() => open("invite")}
                    className="flex w-16 flex-none flex-col items-center gap-1 text-primary"
                    aria-label="Add friend to crew"
                  >
                    <span className="grid size-11 place-items-center rounded-full bg-favorite-soft text-primary">
                      <Plus size={20} aria-hidden />
                    </span>
                    <span className="text-[12px] font-semibold">Add</span>
                  </button>
                )}
              </div>

              {/* Active-session Live GPS status banner */}
              {(isLiveSharing || liveError) && (
                <div
                  role="status"
                  className="mt-3 rounded-2xl bg-secondary px-3.5 py-2.5 text-[14px]"
                >
                  {(() => {
                    const fresh = classifyPositionFreshness(
                      livePos?.capturedAt ?? null,
                      liveStatus,
                      now ?? Date.now(),
                    );
                    const acc = formatAccuracyBadge(livePos?.accuracyMeters);
                    return (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-foreground">
                            <Radio size={14} className="mr-1.5 inline text-primary" aria-hidden />
                            Live location · {fresh.label}
                            {acc ? ` (${acc})` : ""}
                          </p>
                          <p className="text-[12px] text-muted-foreground">
                            {liveError ||
                              "Active while Event Buddies stays open. Pauses when backgrounded."}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="mt-4 divide-y divide-border">
                {crew.members.map((member) => {
                  const place =
                    member.pointId &&
                    member.expiresAt &&
                    Date.parse(member.expiresAt) > (now ?? Date.now())
                      ? places.find((p) => p.id === member.pointId)
                      : null;
                  return (
                    <button
                      key={member.id}
                      type="button"
                      disabled={!place}
                      className="flex min-h-16 w-full items-center gap-3 py-3 text-left disabled:opacity-100"
                      onClick={() => place && openPlace(place.id)}
                    >
                      <Avatar
                        label={initials(member.name)}
                        src={member.id === attendee.auth.user?.id ? avatar?.url : null}
                        alt={member.id === attendee.auth.user?.id ? "Your profile photo" : ""}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold break-words">
                          {member.name}
                          {member.id === attendee.auth.user?.id ? " · You" : ""}
                          {member.owner ? " · Owner" : ""}
                        </span>
                        <span className="block text-[15px] text-muted-foreground">
                          {place
                            ? `${place.name} · until ${new Date(member.expiresAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                            : "Location private"}
                        </span>
                      </span>
                      {place && <span className="text-[15px] font-medium text-primary">Map</span>}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={waiting}
                className="mt-2 min-h-11 w-full text-left text-primary font-semibold"
                onClick={() => open("meeting")}
              >
                {crew.meeting && meetingPlace
                  ? `Meet at ${meetingPlace.name} · ${eventTime(crew.meeting.at)} CAT`
                  : "Choose the crew meeting"}
              </button>
              <div className="flex flex-wrap gap-x-5">
                <button
                  type="button"
                  disabled={waiting}
                  className="min-h-11 text-primary font-medium"
                  onClick={() => open("pin")}
                >
                  {activePin ? "Update my landmark" : "Share my landmark"}
                </button>
                <button
                  type="button"
                  disabled={waiting}
                  className="min-h-11 text-primary font-medium"
                  onClick={() => open("live-gps")}
                >
                  {isLiveSharing ? "Live GPS active" : "Share live location"}
                </button>
                {(activePin || isLiveSharing || sync.pending?.command.op === "share") && (
                  <button
                    type="button"
                    className="min-h-11 font-semibold text-primary"
                    onClick={() => {
                      stopLiveGpsSession();
                      if (self) {
                        void removeCrewPin({
                          crewId: crew.id,
                          userId: self.id,
                          pointId: self.pointId,
                        });
                      }
                      sync.command({ op: "stop", crewId: crew.id });
                    }}
                  >
                    Stop sharing · Ghost Mode
                  </button>
                )}
                <button
                  type="button"
                  disabled={waiting}
                  className="min-h-11 font-semibold text-destructive"
                  onClick={async () => {
                    if (
                      typeof Notification !== "undefined" &&
                      Notification.permission === "default"
                    ) {
                      void Notification.requestPermission();
                    }
                    const targetPointId =
                      self?.pointId ?? crew.meeting?.pointId ?? places[0]?.id ?? null;
                    const targetPlace = targetPointId
                      ? places.find((p) => p.id === targetPointId)
                      : null;
                    const authorName = self?.name ?? attendee.preferences.profile.name ?? "Friend";
                    const placeName = targetPlace?.name ?? "our meeting point";
                    await broadcastCrewLostAlert({
                      id: crypto.randomUUID(),
                      crewId: crew.id,
                      eventId: data.event.id,
                      userId: self?.id ?? attendee.auth.user?.id ?? "self",
                      authorName,
                      pointId: targetPointId,
                      placeName,
                      message: `${authorName} is looking for you near ${placeName}.`,
                      createdAt: new Date().toISOString(),
                    });
                    attendee.notify(`Alerted ${crew.name}: looking for you near ${placeName}`);
                  }}
                >
                  Lost someone · Alert crew
                </button>
                {self?.owner && (
                  <button
                    type="button"
                    disabled={waiting}
                    className="min-h-11 text-primary font-medium"
                    onClick={() => open("invite")}
                  >
                    Invite a friend
                  </button>
                )}
                <button
                  type="button"
                  disabled={waiting}
                  className="min-h-11 text-muted-foreground"
                  onClick={() => open("leave")}
                >
                  Leave crew
                </button>
              </div>
              <p className="mt-2 text-[14px] text-muted-foreground">
                Private to members. Landmark pins are chosen by each person and expire within an
                hour. The map shows their shared landmark.
              </p>
            </>
          )}
        </>
      )}
      {mode && (
        <Sheet
          title={
            mode === "create"
              ? "Start a private crew"
              : mode === "join"
                ? "Join a crew"
                : mode === "invite"
                  ? "Invite a friend"
                  : mode === "meeting"
                    ? "Crew meeting"
                    : mode === "pin"
                      ? "Share a landmark"
                      : mode === "live-gps"
                        ? "Share live location"
                        : "Leave this crew?"
          }
          onClose={() => {
            setScanningQr(false);
            setMode(null);
          }}
        >
          {(mode === "create" || mode === "join") && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (mode === "create") {
                  if (
                    sync.command({
                      op: "create",
                      name: name.trim(),
                      displayName: attendee.preferences.profile.name,
                    })
                  )
                    setMode(null);
                  return;
                }
                const parsedCode = extractCrewInviteCode(code);
                if (!parsedCode) {
                  setLocalError("Enter a valid 36-character crew code or invite link.");
                  return;
                }
                clearPendingCrewInvite();
                setPendingInvite(null);
                if (
                  sync.command({
                    op: "join",
                    code: parsedCode,
                    displayName: attendee.preferences.profile.name,
                  })
                )
                  setMode(null);
              }}
            >
              <p className="text-[15px] text-muted-foreground">
                One active private crew per event. Your profile name will be visible to its members.
              </p>
              {mode === "join" && (
                <div>
                  <SecondaryButton
                    onClick={() => {
                      setLocalError("");
                      setScanningQr((prev) => !prev);
                    }}
                  >
                    {scanningQr ? "Close camera" : "Scan crew QR"}
                  </SecondaryButton>
                  {scanningQr && (
                    <QrCameraScanner
                      ariaLabel="Point your camera at a friend’s crew invite QR code"
                      onCode={(scanned) => {
                        setScanningQr(false);
                        const parsed = extractCrewInviteCode(scanned);
                        if (!parsed) {
                          setLocalError("That QR code doesn’t contain a crew invite code.");
                          return;
                        }
                        setCode(parsed);
                        setLocalError("");
                      }}
                      onError={(message) => {
                        setScanningQr(false);
                        setLocalError(message);
                      }}
                    />
                  )}
                </div>
              )}
              <label className="block font-medium">
                {mode === "create" ? "Crew name" : "Crew code or invite link"}
                <input
                  className="ios-field mt-2"
                  required
                  minLength={mode === "create" ? 2 : 36}
                  maxLength={mode === "create" ? 60 : 240}
                  autoCapitalize="off"
                  value={mode === "create" ? name : code}
                  onChange={(e) =>
                    mode === "create" ? setName(e.target.value) : setCode(e.target.value)
                  }
                />
              </label>
              <PrimaryButton type="submit" disabled={waiting}>
                {mode === "create" ? "Create private crew" : "Join crew"}
              </PrimaryButton>
            </form>
          )}
          {mode === "invite" && crew && (
            <div className="space-y-4">
              <p className="text-[15px]">
                Anyone with this code or link can join. Replacing the code revokes the previous
                invite.
              </p>
              {sync.invite && Date.parse(sync.invite.expiresAt) > Date.now() && (
                <>
                  <SecondaryButton onClick={() => void shareInvite()}>Share invite</SecondaryButton>
                  <div className="mx-auto w-fit bg-white p-4">
                    <QRCodeSVG
                      value={buildCrewInviteUrl(window.location.origin, sync.invite.code)}
                      size={220}
                      fgColor="#000000"
                      bgColor="#ffffff"
                      level="M"
                    />
                  </div>
                  <p className="select-text break-all text-[17px] font-mono">{sync.invite.code}</p>
                  <p className="text-[15px]">
                    Expires {new Date(sync.invite.expiresAt).toLocaleString()}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <SecondaryButton
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(sync.invite!.code);
                          attendee.notify("Crew code copied");
                        } catch {
                          setLocalError("Select and copy the code above.");
                        }
                      }}
                    >
                      Copy code
                    </SecondaryButton>
                    <SecondaryButton
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            buildCrewInviteUrl(window.location.origin, sync.invite!.code),
                          );
                          attendee.notify("Crew invite link copied");
                        } catch {
                          setLocalError("Select and copy the code above.");
                        }
                      }}
                    >
                      Copy invite link
                    </SecondaryButton>
                  </div>
                </>
              )}
              <PrimaryButton
                disabled={waiting}
                onClick={() => sync.command({ op: "invite", crewId: crew.id })}
              >
                {sync.invite ? "Replace invite code" : "Generate invite code"}
              </PrimaryButton>
              {sync.loading && <p role="status">Preparing invite…</p>}
              {sync.error && <p role="alert">{sync.error}</p>}
            </div>
          )}
          {mode === "meeting" && crew && (
            <MeetingForm
              shared
              eventStart={data.event.startAt}
              eventEnd={data.event.endAt}
              timezone={data.event.timezone}
              places={places}
              initial={crew.meeting}
              selectedId={null}
              disabled={waiting}
              onSave={(meeting) => {
                if (
                  sync.command({ op: "meeting", crewId: crew.id, revision: crew.revision, meeting })
                )
                  setMode(null);
              }}
            />
          )}
          {mode === "pin" && crew && self && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const chosenPlace = places.find((p) => p.id === pointId);
                void dropCrewPin({
                  eventId: data.event.id,
                  crewId: crew.id,
                  userId: self.id,
                  displayName: self.name,
                  pointId,
                  x: chosenPlace?.x ?? null,
                  y: chosenPlace?.y ?? null,
                  lat: gpsCoords?.lat ?? null,
                  lng: gpsCoords?.lng ?? null,
                });
                if (
                  sync.command({
                    op: "share",
                    crewId: crew.id,
                    generation: self.generation,
                    pointId,
                    sentAt: new Date().toISOString(),
                  })
                )
                  setMode(null);
              }}
            >
              <p className="text-[15px]">
                Choose where you are. Members can see this landmark for up to an hour. Stop sharing
                at any time.
              </p>
              <label className="block font-medium">
                I’m at
                <select
                  className="ios-field mt-2"
                  value={pointId}
                  onChange={(e) => setPointId(e.target.value)}
                >
                  {places.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <SecondaryButton
                  disabled={gpsBusy}
                  onClick={async () => {
                    if (gpsCoords) {
                      setGpsCoords(null);
                      return;
                    }
                    setGpsBusy(true);
                    const coords = await requestOneTimeGeolocation();
                    setGpsBusy(false);
                    if (coords) setGpsCoords(coords);
                    else setLocalError("GPS unavailable. Your landmark pin will still share.");
                  }}
                >
                  {gpsBusy
                    ? "Reading GPS…"
                    : gpsCoords
                      ? `GPS attached (${gpsCoords.lat}, ${gpsCoords.lng}) · Remove`
                      : "Attach one-time GPS reading (optional)"}
                </SecondaryButton>
              </div>
              <PrimaryButton type="submit" disabled={waiting}>
                Share with my crew
              </PrimaryButton>
            </form>
          )}
          {mode === "live-gps" && crew && self && (
            <div className="space-y-4">
              <p className="text-[15px] text-muted-foreground">
                Opt-in active-session GPS shared only with <strong>{crew.name}</strong>. Sharing
                starts off by default, updates while Event Buddies is open, pauses when the browser
                is backgrounded, and stops automatically when the timer expires or you tap Ghost
                Mode.
              </p>
              <div
                role="group"
                aria-label="Live location duration"
                className="grid grid-cols-3 gap-2"
              >
                {(
                  [
                    { value: "15m", label: "15 min" },
                    { value: "60m", label: "1 hour" },
                    { value: "until_end", label: "Until event ends" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={liveDuration === opt.value}
                    onClick={() => setLiveDuration(opt.value)}
                    className={`min-h-12 rounded-xl border px-2 text-[14px] font-semibold ${
                      liveDuration === opt.value
                        ? "border-primary bg-favorite-soft text-primary"
                        : "border-border bg-popover text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <PrimaryButton onClick={startLiveGpsSession}>
                Start sharing live location
              </PrimaryButton>
              {isLiveSharing && (
                <SecondaryButton
                  onClick={() => {
                    stopLiveGpsSession();
                    void removeCrewPin({
                      crewId: crew.id,
                      userId: self.id,
                      pointId: self.pointId,
                    });
                    sync.command({ op: "stop", crewId: crew.id });
                    setMode(null);
                  }}
                >
                  Stop sharing · Ghost Mode
                </SecondaryButton>
              )}
            </div>
          )}
          {mode === "leave" && crew && (
            <div className="space-y-4">
              <p>
                {self?.owner && crew.members.length > 1
                  ? "Ownership transfers to the longest-standing remaining member, and the old invite is revoked."
                  : "Your shared landmark will be removed. Your personal favourites and meeting stay in your account."}
              </p>
              <PrimaryButton
                disabled={waiting}
                onClick={() => {
                  if (sync.command({ op: "leave", crewId: crew.id })) setMode(null);
                }}
              >
                Leave crew
              </PrimaryButton>
            </div>
          )}
          {localError && (
            <p role="alert" className="mt-3 text-[15px]">
              {localError}
            </p>
          )}
        </Sheet>
      )}
    </section>
  );
}
