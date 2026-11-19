import { useState } from "react";
import { Cross } from "lucide-react";
import { useCompanion } from "./context";
import { Sheet } from "./Sheet";
import { PrimaryButton, SecondaryButton } from "./ui";

export function SafetyAccess() {
  const { places, openPlace, data, attendee } = useCompanion();
  const [open, setOpen] = useState(false);
  const [editingIce, setEditingIce] = useState(false);
  const existing = attendee.preferences.medicalCard;
  const [contactName, setContactName] = useState(existing?.contactName ?? "");
  const [contactPhone, setContactPhone] = useState(existing?.contactPhone ?? "");
  const [bloodType, setBloodType] = useState(existing?.bloodType ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
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
        <Sheet title="Emergency & first aid" onClose={() => setOpen(false)}>
          <p className="mb-4 text-[17px]">
            For immediate assistance, alert the nearest steward or head to a marked medical point.
          </p>
          {places
            .filter((p) => p.type === "first-aid" || p.type === "security")
            .map((p) => (
              <div key={p.id} className="mb-4">
                <SecondaryButton
                  onClick={() => {
                    setOpen(false);
                    openPlace(p.id);
                  }}
                >
                  {p.name} · show on map ↗
                </SecondaryButton>
                <p className="mt-1 text-[15px] text-muted-foreground">{p.description}</p>
              </div>
            ))}
          <p className="text-[15px] text-muted-foreground">
            On-site emergency phone, free-water locations, lifeguard and lost-property contacts are
            awaiting confirmation.
          </p>

          <div className="mt-4 rounded-2xl bg-popover p-4">
            <h3 className="text-[17px] font-semibold">Emergency contact & medical card</h3>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Stored only on this phone for you or first-aid staff to read. Never uploaded to
              servers.
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
                Add private medical & ICE card
              </SecondaryButton>
            ) : (
              <form
                className="mt-3 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  attendee.update({
                    medicalCard: {
                      contactName: contactName.trim(),
                      contactPhone: contactPhone.trim(),
                      bloodType: bloodType.trim(),
                      notes: notes.trim(),
                    },
                  });
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
                <div className="flex gap-2">
                  <PrimaryButton type="submit">Save on this phone</PrimaryButton>
                  <SecondaryButton onClick={() => setEditingIce(false)}>Cancel</SecondaryButton>
                </div>
              </form>
            )}
          </div>
          <img
            src={data.event.mapImageUrl}
            width={1238}
            height={1238}
            alt="Official venue plan with medical crosses marking the two first-aid points"
            className="mt-4 w-full"
          />
        </Sheet>
      )}
    </>
  );
}
