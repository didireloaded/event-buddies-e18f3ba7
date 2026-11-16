import { useEffect, useState } from "react";
import { useCompanion } from "./context";

function photoStore(
  eventId: string,
  action: "read" | "save" | "remove",
  file?: File,
): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("event-buddies-photos", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("rides");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction("rides", action === "read" ? "readonly" : "readwrite");
      const store = transaction.objectStore("rides");
      const operation =
        action === "read"
          ? store.get(eventId)
          : action === "remove"
            ? store.delete(eventId)
            : store.put(file, eventId);
      let photo: Blob | null = null;
      operation.onsuccess = () => {
        photo =
          action === "read" && operation.result instanceof Blob ? operation.result : (file ?? null);
      };
      transaction.oncomplete = () => {
        db.close();
        resolve(photo);
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
      transaction.onabort = () => {
        db.close();
        reject(transaction.error);
      };
    };
  });
}

export function RidePhoto() {
  const { data } = useCompanion();
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void photoStore(data.event.id, "read")
      .then((file) => {
        if (active) setPhoto(file);
      })
      .catch(() => {
        if (active) setError("Saved photos are unavailable on this browser.");
      });
    return () => {
      active = false;
    };
  }, [data.event.id]);
  useEffect(() => {
    if (!photo) {
      setUrl("");
      return;
    }
    const next = URL.createObjectURL(photo);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [photo]);
  return (
    <div className="mt-3">
      <label className="block text-[15px] font-semibold">
        Landmark photo (optional)
        <input
          className="mt-2 block w-full text-[16px]"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (
              !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
              file.size > 8 * 1024 * 1024
            ) {
              setError("Choose a JPEG, PNG or WebP photo up to 8 MB.");
              return;
            }
            setBusy(true);
            setError("");
            try {
              setPhoto(await photoStore(data.event.id, "save", file));
            } catch {
              setError("Couldn’t save this photo. Storage may be full or blocked.");
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <p className="mt-1 text-[14px] text-muted-foreground">
        Stored on this phone. JPEG, PNG or WebP, up to 8 MB.
      </p>
      {url && (
        <>
          <img
            src={url}
            alt="Your saved parking or shuttle landmark"
            className="mt-3 max-h-64 w-full rounded-xl object-contain"
          />
          <button
            type="button"
            disabled={busy}
            className="min-h-11 font-semibold"
            onClick={async () => {
              setBusy(true);
              try {
                await photoStore(data.event.id, "remove");
                setPhoto(null);
              } catch {
                setError("Couldn’t remove the photo. Try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Remove photo
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="mt-2 text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
