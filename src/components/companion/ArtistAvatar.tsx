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
  variant = "circle",
  className,
}: {
  artist: FestivalArtist;
  large?: boolean;
  eager?: boolean;
  variant?: "circle" | "portrait";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const isHeadliner = /headliner|keynote/i.test(artist.role);
  const hasPhoto = Boolean(artist.avatarUrl) && !failed;
  const isPromoCrop = Boolean(artist.avatarUrl?.includes("/images/artists/"));

  if (variant === "portrait") {
    return (
      <span
        aria-hidden
        className={cn(
          "relative grid w-full aspect-[4/5] place-items-center overflow-hidden rounded-xl bg-secondary",
          !hasPhoto &&
            (isHeadliner
              ? "border border-border bg-gradient-to-br from-primary/25 via-secondary to-card text-foreground"
              : "border border-border bg-secondary text-foreground"),
          className,
        )}
      >
        {hasPhoto ? (
          <img
            src={artist.avatarUrl!}
            alt=""
            width={400}
            height={500}
            loading="eager"
            decoding="async"
            className={cn(
              "h-full w-full object-cover transition-transform duration-300",
              isPromoCrop ? "scale-[1.16] object-left-bottom" : "object-top",
            )}
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="eb-display text-[32px] tracking-tight opacity-85">
            {artistMonogram(artist.name)}
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "grid flex-none place-items-center overflow-hidden rounded-full ring-1",
        hasPhoto
          ? "bg-secondary text-secondary-foreground ring-border"
          : isHeadliner
            ? "bg-primary text-primary-foreground ring-primary/40"
            : "bg-secondary text-foreground ring-border",
        large ? "size-16 text-[19px] font-bold tracking-tight" : "size-12 text-[14px] font-bold",
        className,
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
          className={cn(
            "h-full w-full object-cover",
            isPromoCrop ? "scale-[1.18] object-left-bottom" : "object-top",
          )}
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{artistMonogram(artist.name)}</span>
      )}
    </span>
  );
}
