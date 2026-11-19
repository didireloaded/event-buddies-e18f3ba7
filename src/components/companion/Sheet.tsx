import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * Accessible bottom sheet built on native <dialog>.showModal(): focus is
 * trapped, Escape closes, and focus returns to the control that opened it.
 */
export function Sheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const dragStart = useRef<number | null>(null);
  const [drag, setDrag] = useState(0);
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    if (element && !element.open) element.showModal();
    return () => {
      element?.close();
      requestAnimationFrame(() => {
        if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="eb-sheet"
      style={drag ? { transform: `translateY(${drag}px)` } : undefined}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[inherit] flex-col">
        <div
          className="flex h-7 flex-none touch-none items-center justify-center"
          aria-hidden
          onPointerDown={(event) => {
            dragStart.current = event.clientY;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            if (dragStart.current !== null && event.clientY - dragStart.current > 60) onClose();
            dragStart.current = null;
            setDrag(0);
          }}
          onPointerMove={(event) => {
            if (dragStart.current !== null) setDrag(Math.max(0, event.clientY - dragStart.current));
          }}
          onPointerCancel={() => {
            dragStart.current = null;
            setDrag(0);
          }}
        >
          <span className="h-1 w-10 rounded-full bg-border" />
        </div>
        <header className="flex flex-none items-center gap-3 border-b border-separator px-5 pb-3 pt-1">
          <h2
            id={titleId}
            className="eb-display min-w-0 flex-1 break-words text-[21px] leading-snug"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full px-3 text-[15px] font-semibold text-primary hover:bg-secondary/60"
          >
            Done
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
          {children}
        </div>
      </div>
    </dialog>
  );
}
