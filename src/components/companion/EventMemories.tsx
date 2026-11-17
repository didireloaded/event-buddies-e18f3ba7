import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { readMemories, saveMemory, removeMemory, type EventMemory } from "@/lib/attendee/memories";
import { useCompanion } from "./context";
import { memoryCard } from "@/lib/attendee/memory-card";
import { PrimaryButton } from "./ui";

function MemoryPhoto({ memory, onRemove }: { memory: EventMemory; onRemove: () => Promise<void> }) {
  const { data, places, openPlace } = useCompanion();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(memory.photo);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [memory.photo]);
  const place = places.find((point) => point.id === memory.pointId);
  return (
    <article className="overflow-hidden rounded-2xl bg-popover">
      {url && (
        <img
          src={url}
          alt={memory.caption || "Your private event memory"}
          width={1200}
          height={900}
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full object-cover"
        />
      )}
      <div className="p-4">
        <p className="text-[17px] font-semibold">{memory.caption || data.event.name}</p>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {new Date(memory.createdAt).toLocaleString()}
        </p>
        {place && (
          <button
            type="button"
            className="min-h-11 text-[16px] underline"
            onClick={() => openPlace(place.id)}
          >
            {place.name} ↗
          </button>
        )}
        <div className="flex flex-wrap gap-4">
          <a
            className="min-h-11 content-center text-[16px] font-semibold"
            href={url}
            download={`${data.event.slug}-memory.${memory.photo.type === "image/png" ? "png" : memory.photo.type === "image/webp" ? "webp" : "jpg"}`}
          >
            Download photo
          </a>
          <button
            type="button"
            disabled={busy}
            className="min-h-11 text-[16px] font-semibold"
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const card = await memoryCard(data, memory);
                const cardUrl = URL.createObjectURL(card);
                const link = document.createElement("a");
                link.href = cardUrl;
                link.download = `${data.event.slug}-story.png`;
                link.click();
                window.setTimeout(() => URL.revokeObjectURL(cardUrl), 1000);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Couldn’t create the story card.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Download story card
          </button>
          <button
            type="button"
            disabled={busy}
            className="min-h-11 text-[16px] text-destructive"
            onClick={async () => {
              setBusy(true);
              try {
                await onRemove();
              } finally {
                setBusy(false);
              }
            }}
          >
            Remove
          </button>
        </div>
        {error && (
          <p role="alert" className="text-[15px] text-destructive">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}

export function EventMemories() {
  const { data, places } = useCompanion();
  const [memories, setMemories] = useState<EventMemory[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [pointId, setPointId] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    readMemories(data.event.id)
      .then((rows) => {
        if (active) {
          setMemories(rows);
          setReady(true);
        }
      })
      .catch(() => {
        if (active)
          setError("Photo storage couldn’t open. Allow site storage and reopen Memories.");
      });
    return () => {
      active = false;
    };
  }, [data.event.id]);
  return (
    <div className="space-y-5">
      <p className="text-[15px] text-muted-foreground">
        Private photos on this phone. Download a copy to keep outside the app.
      </p>
      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          if (!file || busy) return;
          setBusy(true);
          setError("");
          try {
            const memory: EventMemory = {
              id: crypto.randomUUID(),
              eventId: data.event.id,
              createdAt: Date.now(),
              caption: caption.trim().slice(0, 140),
              pointId: pointId || null,
              photo: file,
            };
            await saveMemory(memory);
            setMemories((rows) => [memory, ...rows]);
            setFile(null);
            setCaption("");
            setPointId("");
            form.reset();
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "Couldn’t save this photo. Free some storage and try again.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block text-[17px] font-medium focus-within:rounded-xl focus-within:ring-2 focus-within:ring-ring">
          Add a photo
          <span className="mt-2 flex min-h-14 items-center gap-3 rounded-xl border border-border bg-popover px-4">
            <Camera size={22} />
            <span className="min-w-0 truncate text-[16px]">{file?.name ?? "Choose a photo"}</span>
          </span>
          <input
            className="sr-only"
            type="file"
            aria-label="Add a photo"
            disabled={busy}
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <label className="block text-[16px]">
          Caption
          <input
            className="ios-field mt-1"
            maxLength={140}
            disabled={busy}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
          />
        </label>
        <label className="block text-[16px]">
          Landmark
          <select
            disabled={busy}
            className="ios-field mt-1"
            value={pointId}
            onChange={(event) => setPointId(event.target.value)}
          >
            <option value="">No landmark</option>
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name}
              </option>
            ))}
          </select>
        </label>
        <PrimaryButton type="submit" disabled={!ready || !file || busy}>
          {busy ? "Saving photo…" : "Save memory on this phone"}
        </PrimaryButton>
      </form>
      {error && (
        <p role="alert" className="text-[16px] text-destructive">
          {error}
        </p>
      )}
      {ready && memories.length === 0 && (
        <p className="text-[17px]">Your photo diary starts with the first picture you save.</p>
      )}
      {memories.map((memory) => (
        <MemoryPhoto
          key={memory.id}
          memory={memory}
          onRemove={async () => {
            setError("");
            try {
              await removeMemory(memory.id);
              setMemories((rows) => rows.filter((row) => row.id !== memory.id));
            } catch {
              setError("Couldn’t remove this photo. Try again.");
            }
          }}
        />
      ))}
    </div>
  );
}
