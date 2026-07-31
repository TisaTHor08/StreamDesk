/**
 * An icon a widget property can reference: either one resolved live from the
 * public Iconify icon set (`id` is Iconify's own "prefix:name" identifier,
 * e.g. "mdi:volume-high" — resolved to an SVG via Iconify's API at render
 * time, so the Interface needs internet access the moment the icon is
 * first shown), or a custom image the operator uploaded, stored by the
 * Server and served back at `/api/icons/:assetId` (works fully offline).
 *
 * `size` (pixels) overrides whatever default the widget component would
 * otherwise pass to `<IconView>`, and `color` recolors an Iconify icon via
 * Iconify's own `?color=` rendering param (most Iconify icons are single-
 * color/monochrome SVGs designed for exactly this). `color` has no effect
 * on a `custom` uploaded image — an arbitrary raster/SVG image can't be
 * recolored in a way that reliably looks right, so the picker doesn't
 * offer it for that case.
 */
export type WidgetIcon =
  | { source: "iconify"; id: string; size?: number; color?: string }
  | { source: "custom"; assetId: string; size?: number };
