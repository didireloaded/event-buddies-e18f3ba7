import { useState } from "react";
import { Cross } from "lucide-react";
import { useCompanion } from "./context";
import { Sheet } from "./Sheet";
import { PrimaryButton, SecondaryButton } from "./ui";

export function SafetyPanel({ onDone }: { onDone?: () => void }) {
  const { places, openPlace, data, attendee } = useCompanion();
  const [editingIce, setEditingIce] = useState(false);
  const existing = attendee.preferences.medicalCard;
  const [contactName, setContactName] = useState(existing?.contactName ?? "");
  const [contactPhone, setContactPhone] = useState(existing?.contactPhone ?? "");
  const [bloodType, setBloodType] = useState(existing?.bloodType ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [iceError, setIceError] = useState("");
  const safetyPlaces = places.filter(
    (p) => p.type === "first-aid" || p.type === "security" || p.type === "exit",
  );

  return (
    <div className="space-y-4">
      <p className="text-[16px] leading-relaxed">
        For immediate assistance, alert the nearest steward or head to a marked medical point.
      </p>
      {safetyPlaces.length > 0 ? (
        <div className="space-y-3">
          {safetyPlaces.map((p) => (
            <div key={p.id}>
              <SecondaryButton
                onClick={() => {
                  onDone?.();
                  openPlace(p.id);
                }}
              >
                {p.name} · show on map ↗
              </SecondaryButton>
              <p className="mt-1 text-[14px] text-muted-foreground">{p.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[15px] text-muted-foreground">
          Medical and security points will appear here once placed on the venue plan.
        </p>
      )}
      <p className="text-[14px] text-muted-foreground">
        Verified on-site emergency contacts appear here when published by the organiser.
      </p>

      <div className="rounded-2xl bg-popover p-4">
        <h3 className="text-[17px] font-semibold">Emergency contact &amp; medical card</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Stored only on this phone for you or first-aid staff to read. Never uploaded to servers.
        </p>
        {existing && !editingIce ? (
          <div className="mt-3 space-y-1 text-[15px]">
            {existing.contactName && (
              <p>
                <strong>ICE contact:</strong> {existing.contactName}{" "}
                {existing.contactPhone ? `· ${existing.contactPhone}` : ""}
              </p>
            )}
            {existing.bloodType && (
              <p>
                <strong>Blood type:</strong> {existing.bloodType}
              </p>
            )}
            {existing.notes && (
              <p>
                <strong>Allergies / medical notes:</strong> {existing.notes}
              </p>
            )}
            <div className="flex gap-4 pt-2">
              <button
                type="button"
                className="min-h-11 font-semibold text-primary"
                onClick={() => {
                  setContactName(existing.contactName);
                  setContactPhone(existing.contactPhone);
                  setBloodType(existing.bloodType);
                  setNotes(existing.notes);
                  setEditingIce(true);
                }}
              >
                Edit card
              </button>
              <button
                type="button"
                className="min-h-11 font-semibold text-destructive"
                onClick={() => {
                  attendee.update({ medicalCard: null });
                  attendee.notify("Medical card cleared from this phone");
                }}
              >
                Clear card
              </button>
            </div>
          </div>
        ) : !editingIce ? (
          <SecondaryButton className="mt-3" onClick={() => setEditingIce(true)}>
            Add private medical &amp; ICE card
          </SecondaryButton>
        ) : (
          <form
            className="mt-3 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = {
                contactName: contactName.trim(),
                contactPhone: contactPhone.trim(),
                bloodType: bloodType.trim(),
                notes: notes.trim(),
              };
              if (
                !trimmed.contactName &&
                !trimmed.contactPhone &&
                !trimmed.bloodType &&
                !trimmed.notes
              ) {
                setIceError("Enter at least an emergency contact or medical note before saving.");
                return;
              }
              setIceError("");
              attendee.update({ medicalCard: trimmed });
              setEditingIce(false);
              attendee.notify("Medical card saved on this phone");
            }}
          >
            <label className="block text-[14px] font-semibold">
              Emergency contact name
              <input
                className="ios-field mt-1"
                maxLength={60}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </label>
            <label className="block text-[14px] font-semibold">
              Emergency contact phone
              <input
                type="tel"
                className="ios-field mt-1"
                maxLength={30}
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </label>
            <label className="block text-[14px] font-semibold">
              Blood type (optional)
              <input
                className="ios-field mt-1"
                maxLength={12}
                placeholder="O+, A-, etc."
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
              />
            </label>
            <label className="block text-[14px] font-semibold">
              Allergies or medical notes (optional)
              <textarea
                rows={2}
                maxLength={240}
                className="ios-field mt-1"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            {iceError && (
              <p role="alert" className="text-[14px] font-medium text-destructive">
                {iceError}
              </p>
            )}
            <div className="flex gap-2">
              <PrimaryButton type="submit">Save on this phone</PrimaryButton>
              <SecondaryButton
                onClick={() => {
                  setIceError("");
                  setEditingIce(false);
                }}
              >
                Cancel
              </SecondaryButton>
            </div>
          </form>
        )}
      </div>

      {data.event.mapImageUrl && (
        <img
          src={data.event.mapImageUrl}
          alt={`${data.event.name} venue plan`}
          width={1200}
          height={800}
          loading="lazy"
          decoding="async"
          className="w-full rounded-xl border border-border object-contain"
        />
      )}
    </div>
  );
}

export function SafetyAccess() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Emergency and first aid"
        className="ios-press grid size-11 place-items-center rounded-full text-favorite"
        onClick={() => setOpen(true)}
      >
        <Cross size={21} />
      </button>
      {open && (
        <Sheet title="Safety & support" onClose={() => setOpen(false)}>
          <SafetyPanel onDone={() => setOpen(false)} />
        </Sheet>
      )}
    </>
  );
}
