/**
 * An icon a widget property can reference: either one resolved live from the
 * public Iconify icon set (`id` is Iconify's own "prefix:name" identifier,
 * e.g. "mdi:volume-high" — resolved to an SVG via Iconify's API at render
 * time, so the Interface needs internet access the moment the icon is
 * first shown), or a custom image the operator uploaded, stored by the
 * Server and served back at `/api/icons/:assetId` (works fully offline).
 */
export type WidgetIcon = { source: "iconify"; id: string } | { source: "custom"; assetId: string };
