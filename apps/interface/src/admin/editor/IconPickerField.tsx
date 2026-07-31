import { useRef, useState } from "react";
import type { WidgetIcon } from "@streamdesk/shared-types";
import { IconView } from "@streamdesk/ui-kit";
import { api } from "../api.js";

const fieldStyle: React.CSSProperties = {
  background: "var(--widget-background)",
  border: "1px solid var(--widget-border)",
  borderRadius: 8,
  color: "var(--deck-text)",
  padding: "6px 10px",
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
};

const smallButtonStyle: React.CSSProperties = {
  background: "var(--widget-background)",
  border: "1px dashed var(--widget-border)",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 12,
  cursor: "pointer",
  color: "var(--deck-text)",
};

type IconifySearchResult = { icons: string[] };

/**
 * Icon picker used wherever a widget property has `format: "icon"` in its
 * JSON schema (see PropertyField in WidgetInspector.tsx). Two independent
 * ways to set an icon: search Iconify's public icon set (needs internet —
 * flagged in the UI, since StreamDesk otherwise runs fine on a fully
 * offline LAN), or upload a custom image, stored by the Server and served
 * back from /api/icons (works offline).
 */
export function IconPickerField({ value, onChange }: { value: unknown; onChange: (icon: WidgetIcon | undefined) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const current = isWidgetIcon(value) ? value : undefined;

  async function runSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=48`);
      if (!response.ok) throw new Error(`Iconify a répondu ${response.status}`);
      const data = (await response.json()) as IconifySearchResult;
      setResults(data.icons ?? []);
    } catch {
      setSearchError("Recherche Iconify indisponible (vérifiez la connexion Internet de ce PC).");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { assetId } = await api.uploadIcon(file);
      onChange({ source: "custom", assetId, ...(current?.size ? { size: current.size } : {}) });
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Échec de l'import de l'image");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 12, color: "var(--deck-muted-text)" }}>Icône</span>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 36,
            height: 36,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid var(--widget-border)",
            borderRadius: 8,
            background: "var(--deck-background)",
          }}
        >
          {current ? <IconView icon={current} size={22} /> : <span style={{ fontSize: 10, color: "var(--deck-muted-text)" }}>—</span>}
        </div>
        {current && (
          <button type="button" onClick={() => onChange(undefined)} style={smallButtonStyle}>
            Retirer
          </button>
        )}
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={smallButtonStyle}>
          {uploading ? "Import..." : "Importer une image"}
        </button>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif" style={{ display: "none" }} onChange={handleFileSelected} />
      </div>

      {current && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--deck-muted-text)" }}>
            Taille
            <input
              type="number"
              min={8}
              max={128}
              value={current.size ?? 20}
              onChange={(e) => onChange({ ...current, size: e.target.value === "" ? undefined : Number(e.target.value) })}
              style={{ ...fieldStyle, width: 64 }}
            />
            px
          </label>
          {current.source === "iconify" && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--deck-muted-text)" }}>
              Couleur
              <input
                type="color"
                value={current.color ?? "#ffffff"}
                onChange={(e) => onChange({ ...current, color: e.target.value })}
                style={{ width: 32, height: 28, padding: 0, border: "1px solid var(--widget-border)", borderRadius: 6, background: "none", cursor: "pointer" }}
              />
              {current.color && (
                <button type="button" onClick={() => onChange({ ...current, color: undefined })} style={{ ...smallButtonStyle, padding: "2px 8px" }}>
                  Défaut
                </button>
              )}
            </label>
          )}
        </div>
      )}

      <input
        type="search"
        placeholder="Rechercher une icône (Iconify, en ligne)..."
        value={query}
        onChange={(e) => runSearch(e.target.value)}
        style={fieldStyle}
      />
      {searching && <span style={{ fontSize: 11, color: "var(--deck-muted-text)" }}>Recherche...</span>}
      {searchError && <span style={{ fontSize: 11, color: "var(--deck-danger)" }}>{searchError}</span>}

      {results.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4, maxHeight: 160, overflow: "auto" }}>
          {results.map((id) => (
            <button
              key={id}
              type="button"
              title={id}
              onClick={() =>
                onChange({
                  source: "iconify",
                  id,
                  ...(current?.size ? { size: current.size } : {}),
                  ...(current?.source === "iconify" && current.color ? { color: current.color } : {}),
                })
              }
              style={{
                aspectRatio: "1 / 1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: current?.source === "iconify" && current.id === id ? "var(--widget-active-background)" : "var(--widget-background)",
                border: "1px solid var(--widget-border)",
                borderRadius: 6,
                cursor: "pointer",
                padding: 4,
              }}
            >
              <IconView icon={{ source: "iconify", id }} size={20} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function isWidgetIcon(value: unknown): value is WidgetIcon {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<WidgetIcon>;
  return (v.source === "iconify" && typeof v.id === "string") || (v.source === "custom" && typeof v.assetId === "string");
}
