import { useEffect, useRef } from "react";

export function QrCameraScanner({
  onCode,
  onError,
  ariaLabel = "Point your camera at the QR code",
}: {
  onCode: (code: string) => void;
  onError: (message: string) => void;
  ariaLabel?: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | undefined;
    let frame = 0;
    let decode: typeof import("jsqr").default | undefined;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const scan = () => {
      const el = video.current;
      if (el && ctx && decode && el.readyState >= 2 && el.videoWidth > 0) {
        canvas.width = 640;
        canvas.height = Math.round((640 * el.videoHeight) / el.videoWidth);
        ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = decode(pixels.data, pixels.width, pixels.height);
        if (code && code.data) {
          onCode(code.data);
          return;
        }
      }
      frame = requestAnimationFrame(scan);
    };
    void import("jsqr")
      .then(async (module) => {
        decode = module.default;
        if (stopped) return null;
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera unavailable");
        return navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      })
      .then(async (media) => {
        if (!media) return;
        if (stopped) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        if (video.current) {
          video.current.srcObject = media;
          await video.current.play();
        }
        frame = requestAnimationFrame(scan);
      })
      .catch(() => {
        if (!stopped) onError("Camera unavailable. Paste the code or link below instead.");
      });
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onCode, onError]);

  return (
    <video
      ref={video}
      autoPlay
      muted
      playsInline
      className="mt-3 aspect-square w-full rounded-xl bg-muted object-cover"
      aria-label={ariaLabel}
    />
  );
}
