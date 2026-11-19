import { useEffect, useState } from "react";
import { Check, QrCode, ShieldCheck, Ticket, Trash2 } from "lucide-react";
import { photoStore } from "@/lib/attendee/ride-photo";
import {
  deleteTicketFromCloud,
  ensurePrimaryBlobIndexed,
  formatTicketTier,
  getEventGateLabel,
  getEventOpensTime,
  primaryTicketStorageKey,
  readAllSavedTickets,
  removeSavedTicket,
  saveManualCodeTicket,
  saveUploadedTicket,
  subscribeTicketChanges,
  syncTicketToCloud,
  TICKET_MAX_BYTES,
  TICKET_MIME_TYPES,
  updateEventTicketsTier,
  type SavedTicketMeta,
} from "@/lib/attendee/tickets";
import type { TicketTier } from "@/lib/attendee/use-attendee";
import { dateLabel } from "@/lib/attendee/event-clock";
import { useCompanion } from "./context";
import { PrimaryButton, SecondaryButton } from "./ui";

const TIER_CARDS: { value: TicketTier; label: string; hint: string }[] = [
  { value: "general", label: "General", hint: "Standard public areas & stages" },
  { value: "vip", label: "VIP", hint: "Unlocks VIP, Experience & Platinum zones" },
  { value: "all_access", label: "All-access", hint: "Unlocks every restricted venue zone" },
];

export function TicketVault() {
  const { data, attendee, openGateCard } = useCompanion();
  const key = primaryTicketStorageKey(data.event.id);
  const [file, setFile] = useState<Blob | null>(null);
  const [url, setUrl] = useState("");
  const [allTickets, setAllTickets] = useState<SavedTicketMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [askTierForId, setAskTierForId] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualLabel, setManualLabel] = useState("");
  const [manualHolder, setManualHolder] = useState(
    attendee.preferences.profile.name === "Guest" ? "" : attendee.preferences.profile.name,
  );

  const eventTickets = allTickets.filter((t) => t.eventId === data.event.id);
  const otherEventTickets = allTickets.filter((t) => t.eventId !== data.event.id);

  useEffect(() => {
    let active = true;
    setAllTickets(readAllSavedTickets());
    void ensurePrimaryBlobIndexed(
      data,
      attendee.preferences.profile.name,
      attendee.preferences.ticketTier,
    )
      .then(({ primaryBlob }) => {
        if (!active) return;
        setFile(primaryBlob);
        setAllTickets(readAllSavedTickets());
      })
      .catch(() => {
        if (active) {
          setError("Ticket storage is unavailable. Keep the original in Files or Photos.");
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });
    const unsub = subscribeTicketChanges(() => {
      if (active) setAllTickets(readAllSavedTickets());
    });
    return () => {
      active = false;
      unsub();
    };
  }, [key, data, attendee.preferences.profile.name, attendee.preferences.ticketTier]);

  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  const applyTier = (tier: TicketTier) => {
    attendee.update({ ticketTier: tier });
    updateEventTicketsTier(data.event.id, tier, askTierForId ?? undefined);
    const updated = readAllSavedTickets();
    setAllTickets(updated);
    if (attendee.auth.user?.id) {
      for (const t of updated.filter((item) => item.eventId === data.event.id)) {
        void syncTicketToCloud(attendee.auth.user.id, t);
      }
    }
    setAskTierForId(null);
    attendee.notify(`Ticket tier set to ${formatTicketTier(tier)} — map zones updated`);
  };

  const gateLabel = getEventGateLabel(data);
  const opensTime = getEventOpensTime(data);

  return (
    <section
      id="ticket-vault"
      className="mt-2 space-y-5 border-y border-border py-4"
      aria-labelledby="ticket-title"
    >
      <div>
        <h2 id="ticket-title" className="ios-section-title px-0">
          My Tickets &amp; Passes · Saved offline
        </h2>
        <p className="text-[15px] text-muted-foreground">
          Save your existing ticket copy on this phone for quick gate access without signal. Event
          Buddies holds your copy and unlocks your map tier — admission is checked by the organiser.
        </p>
      </div>

      {/* Immediate post-upload / post-add 1-tap Tier Sheet */}
      {askTierForId && (
        <div
          data-testid="ticket-tier-prompt"
          className="space-y-3 rounded-2xl border-2 border-primary bg-popover p-4"
        >
          <div>
            <h3 className="text-[18px] font-bold">Which ticket do you have?</h3>
            <p className="mt-1 text-[14px] text-muted-foreground">
              This unlocks the areas you can access on the map. You can change it later.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TIER_CARDS.map((card) => (
              <button
                key={card.value}
                type="button"
                className="ios-press flex min-h-20 flex-col items-center justify-center rounded-xl border border-border bg-secondary px-2 py-3 text-center"
                onClick={() => applyTier(card.value)}
              >
                <span className="text-[15px] font-bold">{card.label}</span>
                <span className="mt-1 text-[12px] leading-tight text-muted-foreground">
                  {card.hint}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {(["experience", "platinum"] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                className="ios-chip text-[13px]"
                onClick={() => applyTier(tier)}
              >
                {formatTicketTier(tier)} tier
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active event saved tickets list + 1-tap full-screen Gate Card */}
      {eventTickets.length > 0 && (
        <div className="space-y-3">
          <PrimaryButton onClick={() => openGateCard(0)}>
            <QrCode size={19} aria-hidden />
            Show my ticket
          </PrimaryButton>
          <div className="ios-group">
            {eventTickets.map((ticket, idx) => (
              <div key={ticket.id} className="ios-row items-center justify-between gap-3 py-3">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => openGateCard(idx)}
                >
                  <span className="grid size-10 flex-none place-items-center rounded-xl bg-favorite-soft text-favorite">
                    <Ticket size={18} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-semibold">{ticket.label}</span>
                    <span className="block truncate text-[13px] text-muted-foreground">
                      {formatTicketTier(ticket.tier)} · {ticket.holderName} · {gateLabel} · Opens{" "}
                      {opensTime}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Remove ${ticket.label}`}
                  className="grid size-11 flex-none place-items-center text-destructive disabled:opacity-50"
                  onClick={async () => {
                    if (busy) return;
                    setBusy(true);
                    try {
                      await removeSavedTicket(ticket.id, data.event.id);
                      if (attendee.auth.user?.id) {
                        void deleteTicketFromCloud(
                          attendee.auth.user.id,
                          data.event.id,
                          ticket.label,
                        );
                      }
                      if (ticket.storageKey === key) setFile(null);
                      setAllTickets(readAllSavedTickets());
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Trash2 size={17} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map tier selector (always editable later) */}
      <div className="space-y-2">
        <p className="text-[15px] font-semibold">Your map access tier</p>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Ticket tier">
          {TIER_CARDS.map((card) => {
            const active =
              attendee.preferences.ticketTier === card.value ||
              (card.value === "vip" &&
                (attendee.preferences.ticketTier === "platinum" ||
                  attendee.preferences.ticketTier === "experience"));
            return (
              <button
                key={card.value}
                type="button"
                aria-pressed={active}
                onClick={() => applyTier(card.value)}
                className={`flex min-h-12 items-center justify-center gap-1 rounded-xl border px-2 text-[14px] font-semibold ${
                  active
                    ? "border-primary bg-favorite-soft text-primary"
                    : "border-border bg-popover text-foreground"
                }`}
              >
                {active && <Check size={15} aria-hidden />}
                {card.label}
              </button>
            );
          })}
        </div>
        <p className="text-[13px] text-muted-foreground">
          Unlocks restricted zones on the venue map. Stewards verify official wristbands at zone
          entrances.
        </p>
      </div>

      {!ready && (
        <p role="status" className="text-[15px]">
          Checking this phone for your ticket…
        </p>
      )}

      {/* Saved primary ticket preview (preserved for offline gate preview + E2E test compatibility) */}
      {file && url && (
        <div className="my-3">
          {file.type.startsWith("image/") ? (
            <button
              type="button"
              className="block w-full text-left"
              aria-label="Open saved ticket at full size"
              onClick={() => openGateCard(0)}
            >
              <img
                src={url}
                alt="Your saved ticket. Tap to open at full size."
                className="max-h-72 w-full rounded-xl bg-white object-contain p-2 ring-1 ring-border"
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openGateCard(0)}
              className="flex min-h-12 items-center font-semibold text-primary"
            >
              Open saved PDF ticket in gate card ↗
            </button>
          )}
          <p className="mt-2 text-[13px] text-muted-foreground">
            Saved on this device · {(file.size / 1024).toFixed(0)} KB · Ready offline
          </p>
        </div>
      )}

      {/* Upload image/PDF OR add manual ticket code */}
      <div className="space-y-3 rounded-2xl bg-popover p-4">
        <label className="block text-[16px] font-semibold">
          {file ? "Replace ticket" : "Choose your ticket"}
          <input
            className="mt-2 block w-full text-[15px]"
            type="file"
            accept={TICKET_MIME_TYPES.join(",")}
            disabled={busy || !ready}
            onChange={async (event) => {
              const chosen = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (!chosen) return;
              if (
                !(TICKET_MIME_TYPES as readonly string[]).includes(chosen.type) ||
                chosen.size > TICKET_MAX_BYTES ||
                !chosen.size
              ) {
                setError("Choose a JPG, PNG, WebP or PDF under 8 MB.");
                return;
              }
              setBusy(true);
              setError("");
              try {
                const saved = await saveUploadedTicket({
                  eventId: data.event.id,
                  eventName: data.event.name,
                  eventDateIso: data.event.startAt.toISOString(),
                  file: chosen,
                  holderName:
                    attendee.preferences.profile.name === "Guest"
                      ? "Attendee"
                      : attendee.preferences.profile.name,
                  tier: attendee.preferences.ticketTier ?? "general",
                  replacePrimary: Boolean(file),
                });
                setFile(chosen);
                setAllTickets(readAllSavedTickets());
                setAskTierForId(saved.id);
                if (attendee.auth.user?.id) {
                  void syncTicketToCloud(attendee.auth.user.id, saved);
                }
              } catch {
                setError("Couldn’t save the ticket. Keep the original and try again.");
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>

        {file && (
          <label className="block text-[14px] font-semibold text-primary">
            Add another ticket image/PDF (e.g. partner’s pass)
            <input
              className="mt-1.5 block w-full text-[14px] font-normal text-foreground"
              type="file"
              accept={TICKET_MIME_TYPES.join(",")}
              disabled={busy || !ready}
              onChange={async (event) => {
                const chosen = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (!chosen) return;
                if (
                  !(TICKET_MIME_TYPES as readonly string[]).includes(chosen.type) ||
                  chosen.size > TICKET_MAX_BYTES ||
                  !chosen.size
                ) {
                  setError("Choose a JPG, PNG, WebP or PDF under 8 MB.");
                  return;
                }
                setBusy(true);
                setError("");
                try {
                  const saved = await saveUploadedTicket({
                    eventId: data.event.id,
                    eventName: data.event.name,
                    eventDateIso: data.event.startAt.toISOString(),
                    file: chosen,
                    holderName:
                      attendee.preferences.profile.name === "Guest"
                        ? "Guest ticket"
                        : attendee.preferences.profile.name,
                    tier: attendee.preferences.ticketTier ?? "general",
                    replacePrimary: false,
                  });
                  setAllTickets(readAllSavedTickets());
                  setAskTierForId(saved.id);
                  if (attendee.auth.user?.id) {
                    void syncTicketToCloud(attendee.auth.user.id, saved);
                  }
                } catch {
                  setError("Couldn’t save the extra ticket. Try again.");
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
        )}

        <SecondaryButton onClick={() => setShowManualForm((prev) => !prev)}>
          <QrCode size={17} aria-hidden />
          {showManualForm ? "Hide manual code entry" : "Enter a ticket code manually"}
        </SecondaryButton>

        {showManualForm && (
          <form
            className="space-y-3 border-t border-border pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (busy) return;
              const normalizedCode = manualCode.trim();
              if (!normalizedCode) {
                setError("Enter your ticket barcode or reference code.");
                return;
              }
              if (
                eventTickets.some(
                  (t) => t.ticketCode?.toLowerCase() === normalizedCode.toLowerCase(),
                )
              ) {
                setError("This ticket code is already saved for this event.");
                return;
              }
              setError("");
              const saved = saveManualCodeTicket({
                eventId: data.event.id,
                eventName: data.event.name,
                eventDateIso: data.event.startAt.toISOString(),
                ticketCode: normalizedCode,
                holderName:
                  manualHolder.trim() ||
                  (attendee.preferences.profile.name === "Guest"
                    ? "Attendee"
                    : attendee.preferences.profile.name),
                tier: attendee.preferences.ticketTier ?? "general",
                label: manualLabel.trim() || undefined,
              });
              setManualCode("");
              setManualLabel("");
              setShowManualForm(false);
              setAllTickets(readAllSavedTickets());
              setAskTierForId(saved.id);
              if (attendee.auth.user?.id) {
                void syncTicketToCloud(attendee.auth.user.id, saved);
              }
            }}
          >
            <label className="block text-[14px] font-semibold">
              Ticket code or reference
              <input
                className="ios-field mt-1 font-mono"
                maxLength={120}
                placeholder="e.g. HWL-2026-84920"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-[14px] font-semibold">
                Holder name
                <input
                  className="ios-field mt-1"
                  maxLength={60}
                  placeholder="Sam Nghidinwa"
                  value={manualHolder}
                  onChange={(e) => setManualHolder(e.target.value)}
                />
              </label>
              <label className="block text-[14px] font-semibold">
                Label (optional)
                <input
                  className="ios-field mt-1"
                  maxLength={60}
                  placeholder="VIP Pass"
                  value={manualLabel}
                  onChange={(e) => setManualLabel(e.target.value)}
                />
              </label>
            </div>
            <PrimaryButton type="submit" disabled={busy}>
              Save ticket code offline
            </PrimaryButton>
          </form>
        )}
      </div>

      {busy && (
        <p role="status" className="text-[15px]">
          Updating the ticket on this phone…
        </p>
      )}

      {file && (
        <button
          type="button"
          disabled={busy}
          className="min-h-11 font-semibold text-destructive"
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const primaryMeta = eventTickets.find((t) => t.storageKey === key);
              if (primaryMeta) {
                await removeSavedTicket(primaryMeta.id, data.event.id);
                if (attendee.auth.user?.id) {
                  void deleteTicketFromCloud(
                    attendee.auth.user.id,
                    data.event.id,
                    primaryMeta.label,
                  );
                }
              } else {
                await photoStore(key, "remove");
              }
              setFile(null);
              setAllTickets(readAllSavedTickets());
            } catch {
              setError("Couldn’t remove the saved ticket. Try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Remove saved ticket
        </button>
      )}

      {/* Tickets for other events — tapping opens the full-screen gate card */}
      {otherEventTickets.length > 0 && (
        <div className="space-y-2 border-t border-border pt-4">
          <h3 className="text-[15px] font-semibold text-muted-foreground">Other events</h3>
          <div className="ios-group">
            {otherEventTickets.map((t, idx) => (
              <button
                key={t.id}
                type="button"
                onClick={() => openGateCard(idx, otherEventTickets)}
                className="ios-row justify-between py-2.5 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold">{t.eventName}</span>
                  <span className="block text-[13px] text-muted-foreground">
                    {formatTicketTier(t.tier)} ·{" "}
                    {dateLabel(new Date(t.eventDateIso), data.event.timezone, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </span>
                <span className="max-w-[40%] flex-none truncate rounded-full bg-secondary px-2.5 py-1 text-[12px] font-semibold">
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="flex items-start gap-2 text-[13px] text-muted-foreground">
        <ShieldCheck size={16} className="mt-0.5 flex-none text-primary" aria-hidden />
        <span>
          {attendee.auth.user
            ? "Ticket images and PDFs stay privately on this device for offline gate access. Ticket metadata (tier, label, code) backs up privately to your signed-in account. Keep your original confirmation email or PDF as a backup."
            : "Stored privately on this device for offline gate access. Never uploaded to public storage. Keep your original confirmation email or PDF as a backup."}
        </span>
      </p>

      {error && (
        <p role="alert" className="text-[15px] text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
