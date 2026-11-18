import { AVATAR_TYPES } from "@/lib/attendee/avatar";
import { useCompanion } from "./context";

export function AvatarPicker({
  fallbackLabel,
  altName,
  size = "lg",
}: {
  fallbackLabel: string;
  altName: string;
  size?: "md" | "lg";
}) {
  const { avatar } = useCompanion();
  const url = avatar?.url ?? null;
  const busy = avatar?.busy ?? false;
  const error = avatar?.error ?? "";
  const dim = size === "lg" ? "size-24 text-[34px]" : "size-16 text-xl";
  return (
    <div className="flex flex-col items-center">
      <div
        className={`grid ${dim} place-items-center overflow-hidden rounded-full bg-favorite-soft font-bold text-favorite`}
      >
        {url ? (
          <img
            src={url}
            alt={altName ? `${altName}’s profile photo` : "Your profile photo"}
            className="h-full w-full object-cover"
          />
        ) : (
          <span aria-hidden>{fallbackLabel}</span>
        )}
      </div>
      {avatar && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
          <label className="ios-press inline-flex min-h-11 cursor-pointer items-center rounded-full bg-secondary px-4 text-[15px] font-semibold">
            {busy ? "Saving photo…" : url ? "Change photo" : "Add photo (optional)"}
            <input
              type="file"
              accept={AVATAR_TYPES.join(",")}
              disabled={busy}
              className="sr-only"
              onChange={(event) => {
                const chosen = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (chosen) void avatar.save(chosen);
              }}
            />
          </label>
          {url && (
            <button
              type="button"
              disabled={busy}
              className="min-h-11 px-2 text-[15px] font-semibold text-destructive"
              onClick={() => void avatar.remove()}
            >
              Remove photo
            </button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-center text-[14px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
