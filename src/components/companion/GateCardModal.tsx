import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, WifiOff, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  formatTicketTier,
  getEventGateLabel,
  getEventOpensTime,
  readTicketBlob,
  type SavedTicketMeta,
} from "@/lib/attendee/tickets";
import type { DemoData } from "@/lib/event/types";

type WakeLockSentinelLike = {
  release?: () => Promise<void>;
};

export function GateCardModal({
  open,
  onClose,
  tickets,
  initialIndex = 0,
  data,
  online,
}: {
  open: boolean;
  onClose: () => void;
  tickets: SavedTicketMeta[];
  initialIndex?: number;
  data: DemoData;
  online: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string>("");
  const [blobType, setBlobType] = useState<string>("");
  const [loadingBlob, setLoadingBlob] = useState(false);
  const [brightnessBoosted, setBrightnessBoosted] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setIndex(Math.min(Math.max(0, initialIndex), Math.max(0, tickets.length - 1)));
    }
  }, [open, initialIndex, tickets.length]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!open || !el) return;
    const trigger = document.activeElement as HTMLElement | null;
    if (!el.open) {
      if (typeof el.showModal === "function") el.showModal();
      else el.setAttribute("open", "");
    }

    // Request Screen Wake Lock + experimental Brightness API on open and restore on close
    let sentinel: WakeLockSentinelLike | null = null;
    let active = true;
    const screenWithBrightness = window.screen as Screen & { brightness?: number };
    const previousBrightness =
      typeof screenWithBrightness.brightness === "number" ? screenWithBrightness.brightness : null;
    if (previousBrightness !== null) {
      try {
        screenWithBrightness.brightness = 1;
        setBrightnessBoosted(true);
      } catch {
        setBrightnessBoosted(false);
      }
    } else {
      setBrightnessBoosted(false);
    }
    const nav = navigator as Navigator & {
      wakeLock?: { request?: (type: "screen") => Promise<WakeLockSentinelLike> };
    };
    if (nav.wakeLock?.request) {
      void nav.wakeLock
        .request("screen")
        .then((lock) => {
          if (active) {
            sentinel = lock;
            setWakeLockActive(true);
          } else {
            void lock.release?.();
          }
        })
        .catch(() => {
          if (active) setWakeLockActive(false);
        });
    } else {
      setWakeLockActive(false);
    }

    return () => {
      active = false;
      setBrightnessBoosted(false);
      setWakeLockActive(false);
      void sentinel?.release?.();
      if (previousBrightness !== null) {
        try {
          screenWithBrightness.brightness = previousBrightness;
        } catch {
          /* Ignore brightness restore failures. */
        }
      }
      if (el.open) {
        if (typeof el.close === "function") el.close();
        else el.removeAttribute("open");
      }
      requestAnimationFrame(() => trigger?.isConnected && trigger.focus({ preventScroll: true }));
    };
  }, [open]);

  const current = tickets[index] ?? null;

  useEffect(() => {
    if (!open || !current) {
      setBlobUrl("");
      setBlobType("");
      return;
    }
    if (current.fileType === "code" || !current.storageKey) {
      setBlobUrl("");
      setBlobType("code");
      return;
    }
    let active = true;
    let createdUrl = "";
    setLoadingBlob(true);
    void readTicketBlob(current)
      .then((blob) => {
        if (!active) return;
        if (blob) {
          createdUrl = URL.createObjectURL(blob);
          setBlobUrl(createdUrl);
          setBlobType(blob.type || current.fileType);
        } else {
          setBlobUrl("");
          setBlobType("");
        }
      })
      .finally(() => {
        if (active) setLoadingBlob(false);
      });
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [open, current]);

  if (!open || !current) return null;

  const gateLabel = getEventGateLabel(data);
  const opensTime = getEventOpensTime(data);
  const tierLabel = formatTicketTier(current.tier);
  const multiple = tickets.length > 1;

  const goPrev = () => setIndex((prev) => (prev > 0 ? prev - 1 : tickets.length - 1));
  const goNext = () => setIndex((prev) => (prev < tickets.length - 1 ? prev + 1 : 0));

  return (
    <dialog
      ref={dialogRef}
      data-testid="gate-card-modal"
      aria-label={`Ticket gate card for ${current.eventName}`}
      className="fixed inset-0 z-50 m-0 flex h-dvh max-h-none w-screen max-w-none flex-col bg-background p-0 text-foreground"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if (!multiple) return;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          goPrev();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          goNext();
        }
      }}
    >
      {/* Top minimal chrome: 1-tap close top-left, optional Offline badge top-right */}
      <div className="flex flex-none items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close ticket"
          className="ios-press grid size-11 place-items-center rounded-full bg-popover text-foreground shadow-sm ring-1 ring-border"
        >
          <X size={22} aria-hidden />
        </button>
        {!online && (
          <span
            role="status"
            className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1 text-[13px] font-semibold text-foreground"
          >
            <WifiOff size={14} aria-hidden /> Offline
          </span>
        )}
      </div>

      {/* Main full-height pure white scanner area, scrollable on landscape/short phones */}
      <div
        className="mx-auto flex w-full max-w-md flex-1 flex-col justify-between overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onTouchStart={(e) => {
          touchStartX.current = e.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (!multiple || touchStartX.current === null) return;
          const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
          const delta = endX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(delta) > 48) {
            if (delta < 0) goNext();
            else goPrev();
          }
        }}
      >
        <div
          data-testid="gate-card-surface"
          className="relative flex min-h-[140px] max-h-[68dvh] w-full flex-1 select-none items-center justify-center overflow-hidden rounded-3xl bg-[#ffffff] p-3.5 text-[#000000] shadow-float ring-1 ring-black/10"
          style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {loadingBlob ? (
            <p role="status" className="text-[15px] text-black/50">
              Loading offline ticket…
            </p>
          ) : current.fileType === "code" && current.ticketCode ? (
            <div className="flex max-h-full max-w-full flex-col items-center gap-2">
              <QRCodeSVG
                value={current.ticketCode}
                size={256}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
                className="h-auto max-h-[min(256px,34dvh)] w-auto max-w-full"
              />
              <p className="max-w-full break-all text-center font-mono text-[14px] font-semibold tracking-wider text-black">
                {current.ticketCode}
              </p>
            </div>
          ) : blobUrl && (blobType.startsWith("image/") || current.fileType === "image") ? (
            <img
              src={blobUrl}
              alt={`${current.eventName} ticket for ${current.holderName}`}
              draggable={false}
              className="max-h-full max-w-full object-contain pointer-events-none select-none"
            />
          ) : blobUrl && (blobType === "application/pdf" || current.fileType === "pdf") ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
              <object
                data={blobUrl}
                type="application/pdf"
                aria-label={`${current.eventName} PDF ticket`}
                className="h-[46dvh] w-full rounded-xl border border-black/10"
              >
                <p className="p-4 text-[15px] text-black/70">
                  Saved PDF ticket ready offline on this phone.
                </p>
              </object>
              <a
                href={blobUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center rounded-full bg-black px-5 text-[15px] font-semibold text-white"
              >
                Open PDF full screen ↗
              </a>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-[17px] font-semibold text-black">{current.label}</p>
              <p className="mt-1 text-[14px] text-black/60">
                Saved copy unavailable on this browser. Re-add your screenshot or code in My Tickets
                &amp; Passes.
              </p>
            </div>
          )}
        </div>

        {/* Below QR/Ticket: Event name, holder + tier, gate + opens time */}
        <div className="mt-2.5 space-y-0.5 text-center">
          <p className="break-words text-[17px] font-semibold leading-snug text-foreground">
            {current.eventName}
          </p>
          <p className="break-words text-[15px] text-muted-foreground">
            {current.holderName} · {tierLabel}
          </p>
          <p className="text-[15px] tabular-nums text-foreground">
            {gateLabel} · Opens {opensTime} CAT
          </p>

          {multiple && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                aria-label="Previous ticket"
                onClick={goPrev}
                className="grid size-11 place-items-center rounded-full bg-popover ring-1 ring-border"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-1.5" aria-live="polite">
                {tickets.map((t, idx) => (
                  <span
                    key={t.id}
                    aria-hidden
                    className={
                      idx === index
                        ? "size-2 rounded-full bg-foreground"
                        : "size-2 rounded-full bg-muted-foreground/35"
                    }
                  />
                ))}
                <span className="ml-1.5 text-[13px] tabular-nums text-muted-foreground">
                  {index + 1} of {tickets.length}
                </span>
              </div>
              <button
                type="button"
                aria-label="Next ticket"
                onClick={goNext}
                className="grid size-11 place-items-center rounded-full bg-popover ring-1 ring-border"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          <p className="pt-1 text-[13px] text-muted-foreground">
            {brightnessBoosted
              ? "Brightness raised to max"
              : wakeLockActive
                ? "Screen kept awake · Raise device brightness if needed at the gate"
                : "Turn screen brightness up at the gate for faster scanning"}
          </p>
        </div>
      </div>
    </dialog>
  );
}
