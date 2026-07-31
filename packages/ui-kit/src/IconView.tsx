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
  // An icon-level `size` (set by the operator in the picker) overrides the
  // caller's own default — the whole point of exposing it is to let each
  // widget's icon be sized independently of the widget component's layout.
  const effectiveSize = isWidgetIcon(icon) && typeof icon.size === "number" ? icon.size : size;
  return (
    <img
      src={src}
      alt={alt}
      width={effectiveSize}
      height={effectiveSize}
      style={{ width: effectiveSize, height: effectiveSize, objectFit: "contain", flexShrink: 0 }}
      draggable={false}
    />
  );
}

function isWidgetIcon(icon: unknown): icon is WidgetIcon {
  return typeof icon === "object" && icon !== null && "source" in icon;
}

function resolveIconSrc(icon: unknown): string | null {
  if (!isWidgetIcon(icon)) return null;
  if (icon.source === "iconify" && typeof icon.id === "string" && icon.id.includes(":")) {
    const [prefix, name] = icon.id.split(":", 2);
    // Iconify's own SVG rendering endpoint accepts a `color` param for
    // most (monochrome) icons — recoloring server-side means every
    // Interface benefits with no extra client-side SVG manipulation.
    const color = "color" in icon && typeof icon.color === "string" && icon.color ? icon.color : null;
    const query = color ? `?color=${encodeURIComponent(color)}` : "";
    return `https://api.iconify.design/${prefix}/${name}.svg${query}`;
  }
  if (icon.source === "custom" && typeof icon.assetId === "string") {
    return `/api/icons/${icon.assetId}`;
  }
  return null;
}
