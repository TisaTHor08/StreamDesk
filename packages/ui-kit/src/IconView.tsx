import type { WidgetIcon } from "@streamdesk/shared-types";

/**
 * Renders a `WidgetIcon` (see shared-types/icon.ts) as an `<img>`, whether
 * it points at a public Iconify icon (resolved to an SVG via Iconify's own
 * API — needs internet access the moment it's first shown; the browser
 * then caches the SVG like any other image) or a custom image the operator
 * uploaded (served back by the Server at /api/icons/:assetId, works fully
 * offline). Renders nothing for an unset/malformed icon so callers can
 * unconditionally render `<IconView icon={properties.icon} />`. Lives in
 * ui-kit (not the Interface app) so both built-in widgets and plugin
 * widgets can render icons consistently.
 */
export function IconView({ icon, size = 20, alt = "" }: { icon: unknown; size?: number; alt?: string }) {
  const src = resolveIconSrc(icon);
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
      draggable={false}
    />
  );
}

function resolveIconSrc(icon: unknown): string | null {
  if (!icon || typeof icon !== "object") return null;
  const value = icon as Partial<WidgetIcon>;
  if (value.source === "iconify" && typeof value.id === "string" && value.id.includes(":")) {
    const [prefix, name] = value.id.split(":", 2);
    return `https://api.iconify.design/${prefix}/${name}.svg`;
  }
  if (value.source === "custom" && typeof value.assetId === "string") {
    return `/api/icons/${value.assetId}`;
  }
  return null;
}
