import { useRef, type PointerEvent, type RefObject } from "react";

type Position = { x: number; y: number };
type Gesture = { midpoint: Position; distance: number; left: number; top: number; zoom: number };

export function useMapGestures(
  viewport: RefObject<HTMLDivElement | null>,
  zoom: number,
  zoomAt: (zoom: number, x: number, y: number) => void,
) {
  const pointers = useRef(new Map<number, Position>());
  const gesture = useRef<Gesture | null>(null);
  const dragged = useRef(false);
  const geometry = () => {
    const [first, second] = [...pointers.current.values()];
    if (!first) return null;
    return {
      midpoint: second ? { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 } : first,
      distance: second ? Math.hypot(first.x - second.x, first.y - second.y) : 0,
    };
  };
  const begin = () => {
    const el = viewport.current;
    const current = geometry();
    gesture.current =
      el && current ? { ...current, left: el.scrollLeft, top: el.scrollTop, zoom } : null;
  };
  const finish = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    begin();
  };
  return {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      if (!pointers.current.size) dragged.current = false;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      begin();
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      if (!pointers.current.has(event.pointerId)) return;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const el = viewport.current;
      const start = gesture.current;
      const current = geometry();
      if (!el || !start || !current) return;
      const dx = current.midpoint.x - start.midpoint.x;
      const dy = current.midpoint.y - start.midpoint.y;
      if (
        Math.hypot(dx, dy) < 4 &&
        Math.abs(current.distance - start.distance) < 4 &&
        !dragged.current
      )
        return;
      dragged.current = true;
      el.setPointerCapture(event.pointerId);
      if (start.distance && current.distance) {
        const rect = el.getBoundingClientRect();
        zoomAt(
          (start.zoom * current.distance) / start.distance,
          current.midpoint.x - rect.left,
          current.midpoint.y - rect.top,
        );
      } else el.scrollTo({ left: start.left - dx, top: start.top - dy });
    },
    onPointerUp: finish,
    onPointerCancel: finish,
    onLostPointerCapture: finish,
    onClickCapture: (event: React.MouseEvent<HTMLDivElement>) => {
      if (dragged.current && event.detail > 0) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };
}
