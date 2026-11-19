import { useState } from "react";
import type { FestivalArtist } from "@/lib/event/sound-of-summer";
import { cn } from "@/lib/utils";

function artistMonogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "EB";
}

export function ArtistAvatar({
  artist,
  large = false,
  eager = false,
}: {
  artist: FestivalArtist;
  large?: boolean;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const isHeadliner = /headliner|keynote/i.test(artist.role);
  const hasPhoto = Boolean(artist.avatarUrl) && !failed;
  return (
    <span
      aria-hidden
      className={cn(
        "grid flex-none place-items-center overflow-hidden rounded-full ring-1",
        hasPhoto
          ? "bg-secondary text-secondary-foreground ring-border/70"
          : isHeadliner
            ? "bg-gradient-to-br from-primary to-foreground text-primary-foreground ring-pin-stage/60"
            : "bg-foreground/90 text-popover ring-border/60",
        large ? "size-16 text-[20px] font-bold tracking-tight" : "size-12 text-[14px] font-bold",
      )}
    >
      {hasPhoto ? (
        <img
          src={artist.avatarUrl!}
          alt=""
          width={320}
          height={320}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{artistMonogram(artist.name)}</span>
      )}
    </span>
  );
}
