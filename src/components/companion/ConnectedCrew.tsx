import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useCompanion, initials } from "./context";
import { Sheet } from "./Sheet";
import { MeetingForm } from "./forms";
import { eventTime } from "@/lib/attendee/schedule";
import { PrimaryButton, SecondaryButton, Avatar } from "./ui";

export function ConnectedCrew() {
  const { crew: sync, attendee, avatar, data, places, openPlace, now } = useCompanion();
  const [mode, setMode] = useState<
    "create" | "join" | "invite" | "meeting" | "leave" | "pin" | null
  >(null);
  const [name, setName] = useState("Our crew");
  const [code, setCode] = useState("");
  const [pointId, setPointId] = useState(places[0]?.id ?? "");
  const [localError, setLocalError] = useState("");
  const crew = sync.crew;
  const self = crew?.members.find((m) => m.id === attendee.auth.user?.id);
  const waiting = Boolean(sync.pending);
  const meetingPlace = places.find((p) => p.id === crew?.meeting?.pointId);
  const activePin =
    self?.pointId && self.expiresAt && Date.parse(self.expiresAt) > (now ?? Date.now());
  function open(next: typeof mode) {
    setLocalError("");
    setMode(next);
  }
  async function shareInvite() {
    if (!sync.invite) return;
    const text = `Join ${crew?.name ?? "our crew"} on Event Buddies. Crew code: ${sync.invite.code}`;
    try {
      if (navigator.share) await navigator.share({ title: "Event Buddies crew", text });
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
      <h2 id="connected-crew-heading" className="text-[22px] font-semibold">
        {crew?.name ?? "Your connected crew"}
      </h2>
      {!attendee.auth.user ? (
        <>
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
            <div className="mt-3 flex flex-wrap gap-3">
              <PrimaryButton disabled={waiting || sync.loading} onClick={() => open("create")}>
                Start a crew
              </PrimaryButton>
              <SecondaryButton disabled={waiting || sync.loading} onClick={() => open("join")}>
                Join with a code
              </SecondaryButton>
            </div>
          ) : (
            <>
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
                {(activePin || sync.pending?.command.op === "share") && (
                  <button
                    type="button"
                    className="min-h-11 font-semibold text-primary"
                    onClick={() => sync.command({ op: "stop", crewId: crew.id })}
                  >
                    Stop sharing · Ghost Mode
                  </button>
                )}
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
                      : "Leave this crew?"
          }
          onClose={() => setMode(null)}
        >
          {(mode === "create" || mode === "join") && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const value =
                  mode === "create"
                    ? {
                        op: "create" as const,
                        name: name.trim(),
                        displayName: attendee.preferences.profile.name,
                      }
                    : {
                        op: "join" as const,
                        code: code.trim().toLowerCase(),
                        displayName: attendee.preferences.profile.name,
                      };
                if (sync.command(value)) setMode(null);
              }}
            >
              <p className="text-[15px] text-muted-foreground">
                One active private crew per event. Your profile name will be visible to its members.
              </p>
              <label className="block font-medium">
                {mode === "create" ? "Crew name" : "Crew code"}
                <input
                  className="ios-field mt-2"
                  required
                  minLength={mode === "create" ? 2 : 36}
                  maxLength={mode === "create" ? 60 : 36}
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
                Anyone with this code can join. Replacing the code revokes the previous invite.
              </p>
              {sync.invite && Date.parse(sync.invite.expiresAt) > Date.now() && (
                <>
                  <SecondaryButton onClick={() => void shareInvite()}>Share invite</SecondaryButton>
                  <div className="mx-auto w-fit bg-white p-4">
                    <QRCodeSVG
                      value={sync.invite.code}
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
              <PrimaryButton type="submit" disabled={waiting}>
                Share with my crew
              </PrimaryButton>
            </form>
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
