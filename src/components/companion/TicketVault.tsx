import { useEffect, useState } from "react";
import { photoStore } from "@/lib/attendee/ride-photo";
import { useCompanion } from "./context";

const TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export function TicketVault() {
  const { data } = useCompanion();
  const key = `ticket:${data.event.id}`;
  const [file, setFile] = useState<Blob | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void photoStore(key, "read")
      .then((saved) => {
        if (active) setFile(saved);
      })
      .catch(() => {
        if (active)
          setError("Ticket storage is unavailable. Keep the original in Files or Photos.");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [key]);
  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return (
    <section
      id="ticket-vault"
      className="mt-6 border-y border-border py-4"
      aria-labelledby="ticket-title"
    >
      <h2 id="ticket-title" className="ios-section-title">
        Your ticket, saved offline
      </h2>
      <p className="mb-3 text-[15px] text-muted-foreground">
        Save your Howler screenshot or PDF on this phone before the gates. This stores a copy.
        Ticket validity and admission are checked by the organiser.
      </p>
      {!ready && (
        <p role="status" className="text-[15px]">
          Checking this phone for your ticket…
        </p>
      )}
      {file && url && (
        <div className="my-3">
          {file.type.startsWith("image/") ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              aria-label="Open saved ticket at full size"
            >
              <img
                src={url}
                alt="Your saved ticket. Tap to open at full size."
                className="max-h-96 w-full rounded-xl object-contain bg-popover"
              />
            </a>
          ) : (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-12 items-center font-semibold"
            >
              Open saved PDF ticket ↗
            </a>
          )}
          <p className="mt-2 text-[13px] text-muted-foreground">
            Saved on this device · {(file.size / 1024).toFixed(0)} KB
          </p>
        </div>
      )}
      <label className="block text-[17px] font-semibold">
        {file ? "Replace ticket" : "Choose your ticket"}
        <input
          className="mt-2 block w-full text-[15px]"
          type="file"
          accept={TYPES.join(",")}
          disabled={busy || !ready}
          onChange={async (event) => {
            const chosen = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (!chosen) return;
            if (!TYPES.includes(chosen.type) || chosen.size > 8 * 1024 * 1024 || !chosen.size) {
              setError("Choose a JPG, PNG, WebP or PDF under 8 MB.");
              return;
            }
            setBusy(true);
            setError("");
            try {
              await photoStore(key, "save", chosen);
              setFile(chosen);
            } catch {
              setError("Couldn’t save the ticket. Keep the original and try again.");
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {busy && (
        <p role="status" className="mt-2 text-[15px]">
          Updating the ticket on this phone…
        </p>
      )}
      {file && (
        <button
          type="button"
          disabled={busy}
          className="mt-3 min-h-11 font-semibold text-destructive"
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await photoStore(key, "remove");
              setFile(null);
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
      {error && (
        <p role="alert" className="mt-2 text-[15px] text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
