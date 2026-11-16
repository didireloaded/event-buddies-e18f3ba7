import { Music2 } from "lucide-react";
import { useState } from "react";
import type { FestivalArtist } from "@/lib/event/sound-of-summer";
import { cn } from "@/lib/utils";

export function ArtistAvatar({
  artist,
  large = false,
}: {
  artist: FestivalArtist;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      aria-hidden
      className={cn(
        "grid flex-none place-items-center overflow-hidden rounded-full bg-secondary text-secondary-foreground ring-1 ring-border",
        large ? "size-16" : "size-12",
      )}
    >
      {artist.avatarUrl && !failed ? (
        <img
          src={artist.avatarUrl}
          alt=""
          width={320}
          height={320}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Music2 size={large ? 28 : 20} strokeWidth={1.75} />
      )}
    </span>
  );
}
