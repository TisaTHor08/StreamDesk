import { useMemo } from "react";
import { encodeQrMatrix, type EcLevel } from "./qr-encoder.js";

export type QrCodeProps = {
  /** Text to encode (typically a short URL). */
  value: string;
  /** Rendered pixel size of the square SVG. */
  size?: number;
  level?: EcLevel;
  /** Rendered when `value` doesn't fit the supported version range (see qr-encoder.ts). */
  fallback?: React.ReactNode;
};

/**
 * Renders `value` as a QR code, entirely client-side (see qr-encoder.ts for
 * why: no network call, so a pairing URL never leaves the device just to
 * render an image). Falls back to `fallback` (or nothing) if the value is
 * too long for the supported version range — callers should always also
 * show the plain text link next to this component, not rely on the QR
 * code alone.
 */
export function QrCode({ value, size = 200, level = "M", fallback = null }: QrCodeProps) {
  const matrix = useMemo(() => encodeQrMatrix(value, level), [value, level]);

  if (!matrix) return <>{fallback}</>;

  const quietZone = 4; // modules of light border, per spec recommendation
  const dimension = matrix.length + quietZone * 2;
  const modulePx = size / dimension;

  const rects: string[] = [];
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix.length; c++) {
      if (matrix[r]![c]) {
        const x = (c + quietZone) * modulePx;
        const y = (r + quietZone) * modulePx;
        rects.push(`M${x},${y}h${modulePx}v${modulePx}h${-modulePx}z`);
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label={`QR code: ${value}`}
      style={{ background: "#ffffff", borderRadius: 8 }}
    >
      <path d={rects.join(" ")} fill="#000000" />
    </svg>
  );
}
