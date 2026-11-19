export type LngLat = [number, number];

export type ImageCorners = [LngLat, LngLat, LngLat, LngLat]; // [NW, NE, SE, SW]

export type BoundsPair = [LngLat, LngLat]; // [NE, SW] or [SW, NE]

export type ChromePadding = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type FittedRect = {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  aspectRatio: number;
};

export type CalibrationRefPoint = {
  /** Normalized 0–100 X coordinate on the site plan image */
  x: number;
  /** Normalized 0–100 Y coordinate on the site plan image */
  y: number;
  /** Real-world latitude */
  lat: number;
  /** Real-world longitude */
  lng: number;
};

export type AffineTransform = {
  // lng = a * x + b * y + c
  a: number;
  b: number;
  c: number;
  // lat = d * x + e * y + f
  d: number;
  e: number;
  f: number;
};

export type SitePlanRotation = 0 | 90 | 180 | 270;

export const SITE_PLAN_MIN_LONG_EDGE = 2000;
export const SITE_PLAN_MIN_ASPECT = 1 / 3;
export const SITE_PLAN_MAX_ASPECT = 3;
export const SITE_PLAN_COMPRESS_THRESHOLD_BYTES = 5 * 1024 * 1024;
export const SITE_PLAN_DISPLAY_LONG_EDGE = 2000;
export const SITE_PLAN_ZOOM_LONG_EDGE = 4000;

/**
 * Option B — Aspect-ratio-preserving geographic bounding box centered on a venue lat/lng.
 * Guarantees the degree aspect ratio matches the image pixel aspect ratio so the site plan never stretches.
 */
export function computeBounds(
  center: LngLat,
  imageWidth: number,
  imageHeight: number,
  metersPerPixel = 1,
): {
  bounds: [LngLat, LngLat];
  corners: ImageCorners;
  west: number;
  east: number;
  north: number;
  south: number;
} {
  const safeW = Math.max(1, imageWidth);
  const safeH = Math.max(1, imageHeight);
  const widthMeters = safeW * metersPerPixel;
  const heightMeters = safeH * metersPerPixel;

  const latDelta = heightMeters / 111_320;
  const cosLat = Math.max(0.05, Math.cos((center[1] * Math.PI) / 180));
  const lngDelta = widthMeters / (111_320 * cosLat);

  const west = center[0] - lngDelta / 2;
  const east = center[0] + lngDelta / 2;
  const north = center[1] + latDelta / 2;
  const south = center[1] - latDelta / 2;

  return {
    bounds: [
      [west, south], // SW
      [east, north], // NE
    ],
    corners: [
      [west, north], // top-left
      [east, north], // top-right
      [east, south], // bottom-right
      [west, south], // bottom-left
    ],
    west,
    east,
    north,
    south,
  };
}

/**
 * Option A — Solves a 2D affine transform from 3 reference points (pixel% -> lng/lat)
 * so real GPS readings can be projected onto a calibrated site plan image.
 */
export function computeAffineCalibration(refs: CalibrationRefPoint[]): AffineTransform | null {
  if (refs.length < 3) return null;
  const [p1, p2, p3] = refs as [CalibrationRefPoint, CalibrationRefPoint, CalibrationRefPoint];
  const det = p1.x * (p2.y - p3.y) - p1.y * (p2.x - p3.x) + (p2.x * p3.y - p3.x * p2.y);
  if (Math.abs(det) < 1e-6) return null;

  const solve3 = (v1: number, v2: number, v3: number): [number, number, number] => {
    const da = v1 * (p2.y - p3.y) - p1.y * (v2 - v3) + (v2 * p3.y - v3 * p2.y);
    const db = p1.x * (v2 - v3) - v1 * (p2.x - p3.x) + (p2.x * v3 - p3.x * v2);
    const dc =
      p1.x * (p2.y * v3 - p3.y * v2) -
      p1.y * (p2.x * v3 - p3.x * v2) +
      v1 * (p2.x * p3.y - p3.x * p2.y);
    return [da / det, db / det, dc / det];
  };

  const [a, b, c] = solve3(p1.lng, p2.lng, p3.lng);
  const [d, e, f] = solve3(p1.lat, p2.lat, p3.lat);
  return { a, b, c, d, e, f };
}

/** Projects a real GPS coordinate onto a calibrated venue plan's 0–100 percentage grid. */
export function projectGpsToImagePercent(
  lat: number,
  lng: number,
  transform: AffineTransform,
): { x: number; y: number } | null {
  const det = transform.a * transform.e - transform.b * transform.d;
  if (Math.abs(det) < 1e-12) return null;
  const dx = lng - transform.c;
  const dy = lat - transform.f;
  const x = (transform.e * dx - transform.b * dy) / det;
  const y = (-transform.d * dx + transform.a * dy) / det;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < -10 || x > 110 || y < -10 || y > 110) return null;
  return {
    x: Math.round(Math.min(100, Math.max(0, x)) * 10) / 10,
    y: Math.round(Math.min(100, Math.max(0, y)) * 10) / 10,
  };
}

/**
 * Resolution-aware max zoom for geographic map zoom levels (baseZoom + log2(imageWidth / screenWidth)).
 * Caps at 20, and caps low-resolution images (<2000px long edge) to baseZoom + 1 to avoid pixel mush.
 */
export function computeMaxZoom(
  imageWidth: number,
  screenWidth: number,
  baseZoom: number,
  imageHeight = imageWidth,
): number {
  const longEdge = Math.max(imageWidth, imageHeight);
  if (longEdge < SITE_PLAN_MIN_LONG_EDGE) {
    return Math.min(baseZoom + 1, 20);
  }
  const scaleFactor = Math.max(1, imageWidth / Math.max(1, screenWidth));
  const maxZoom = baseZoom + Math.log2(scaleFactor);
  return Math.min(Math.max(baseZoom, maxZoom), 20);
}

/**
 * Resolution-aware scale multiplier for the interactive image canvas so zooming never pixelates
 * past the site plan's native resolution (returns between 2 and 4.5).
 */
export function computeCanvasMaxZoom(
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
): number {
  const longEdge = Math.max(imageWidth, imageHeight);
  if (longEdge < SITE_PLAN_MIN_LONG_EDGE) {
    return Math.max(2, Math.min(2.5, longEdge / Math.max(320, viewportWidth)));
  }
  const nativeRatio = imageWidth / Math.max(320, viewportWidth);
  return Math.round(Math.min(4.5, Math.max(2, nativeRatio)) * 10) / 10;
}

/**
 * Chrome-aware viewport padding so the fitted site plan never hides behind nav, chips or bottom bars.
 */
export function computeChromePadding(options: {
  topChrome?: number;
  bottomChrome?: number;
  side?: number;
}): ChromePadding {
  const side = options.side ?? 16;
  return {
    top: Math.max(16, (options.topChrome ?? 0) + 16),
    bottom: Math.max(16, (options.bottomChrome ?? 0) + 16),
    left: side,
    right: side,
  };
}

/**
 * Fits an image of arbitrary aspect ratio (landscape, portrait, or square) inside a padded viewport
 * with zero stretching and zero cropping.
 */
export function computeFittedImageRect(
  viewportWidth: number,
  viewportHeight: number,
  imageWidth: number,
  imageHeight: number,
  padding: ChromePadding = { top: 16, bottom: 16, left: 16, right: 16 },
): FittedRect {
  const availW = Math.max(120, viewportWidth - padding.left - padding.right);
  const availH = Math.max(120, viewportHeight - padding.top - padding.bottom);
  const aspect = Math.max(0.1, imageWidth / Math.max(1, imageHeight));

  let width = availW;
  let height = width / aspect;
  if (height > availH) {
    height = availH;
    width = height * aspect;
  }

  const offsetX = padding.left + (availW - width) / 2;
  const offsetY = padding.top + (availH - height) / 2;
  return {
    width: Math.round(width),
    height: Math.round(height),
    offsetX: Math.round(offsetX),
    offsetY: Math.round(offsetY),
    aspectRatio: aspect,
  };
}

/**
 * Validates organizer site plan uploads before compression/storage.
 * Rejects images < 2000px on the long edge and extreme aspect ratios (< 1:3 or > 3:1).
 */
export function validateSitePlanDimensions(width: number, height: number): string | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return "Couldn’t read the image dimensions. Choose a valid JPG, PNG or WebP map.";
  }
  const longEdge = Math.max(width, height);
  if (longEdge < SITE_PLAN_MIN_LONG_EDGE) {
    return "This image is too small to read at zoom. Please upload a version at least 2000px on the long side.";
  }
  const ratio = width / height;
  if (ratio < SITE_PLAN_MIN_ASPECT || ratio > SITE_PLAN_MAX_ASPECT) {
    return "This image's shape doesn't fit a phone screen. Please crop it to a standard festival map shape.";
  }
  return null;
}

export function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn’t read the image file."));
    };
    img.src = url;
  });
}

/**
 * Rotates (0/90/180/270) and compresses a site plan image to WebP 80% quality,
 * returning both a display version (2000px long edge) and an optional zoom version (4000px long edge).
 */
export async function optimizeSitePlanImage(
  file: File,
  options: {
    rotation?: SitePlanRotation;
    onProgress?: (percent: number, label: string) => void;
  } = {},
): Promise<{
  displayFile: File;
  zoomFile: File | null;
  width: number;
  height: number;
}> {
  const rotation = options.rotation ?? 0;
  options.onProgress?.(15, "Reading site plan dimensions…");

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Couldn’t decode the site plan image."));
      el.src = url;
    });

    const swapped = rotation === 90 || rotation === 270;
    const natW = swapped ? img.naturalHeight : img.naturalWidth;
    const natH = swapped ? img.naturalWidth : img.naturalHeight;

    const problem = validateSitePlanDimensions(natW, natH);
    if (problem) throw new Error(problem);

    const renderVariant = async (maxLongEdge: number, suffix: string): Promise<File> => {
      const longEdge = Math.max(natW, natH);
      const scale = longEdge > maxLongEdge ? maxLongEdge / longEdge : 1;
      const outW = Math.round(natW * scale);
      const outH = Math.round(natH * scale);

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;

      ctx.save();
      ctx.translate(outW / 2, outH / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      const drawW = swapped ? outH : outW;
      const drawH = swapped ? outW : outH;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/webp", 0.8),
      );
      if (!blob) return file;
      const baseName = file.name.replace(/\.[^.]+$/, "");
      return new File([blob], `${baseName}-${suffix}.webp`, { type: "image/webp" });
    };

    options.onProgress?.(45, "Optimizing map…");
    const displayFile =
      rotation === 0 &&
      file.size <= SITE_PLAN_COMPRESS_THRESHOLD_BYTES &&
      Math.max(natW, natH) <= SITE_PLAN_DISPLAY_LONG_EDGE
        ? file
        : await renderVariant(SITE_PLAN_DISPLAY_LONG_EDGE, "display");

    let zoomFile: File | null = null;
    if (Math.max(natW, natH) > SITE_PLAN_DISPLAY_LONG_EDGE) {
      options.onProgress?.(75, "Preparing zoom layer…");
      zoomFile = await renderVariant(SITE_PLAN_ZOOM_LONG_EDGE, "zoom");
    }

    options.onProgress?.(100, "Map ready");
    return { displayFile, zoomFile, width: natW, height: natH };
  } finally {
    URL.revokeObjectURL(url);
  }
}
