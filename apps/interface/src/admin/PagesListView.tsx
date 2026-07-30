import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { DeckPage, WidgetInstance } from "@streamdesk/shared-types";
import { api } from "./api.js";

export function PagesListView() {
  const [pages, setPages] = useState<DeckPage[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.listPages().then((result) => {
      setPages(result);
      setLoading(false);
    });
  }, []);

  async function createPage() {
    const name = window.prompt("Nom de la nouvelle page ?");
    if (!name) return;
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    // Every page other than "home" must offer a way back to it — added here
    // up front so a brand-new page is never one accidental save away from
    // being a dead end, and so it shows up immediately in the editor,
    // movable like any other widget.
    const widgets: WidgetInstance[] =
      slug === "home"
        ? []
        : [
            {
              id: crypto.randomUUID(),
              widgetType: "core.navigation",
              pluginId: "core",
              position: { column: 0, row: 0, columnSpan: 1, rowSpan: 1 },
              properties: { label: "Retour", targetSlug: "home" },
            },
          ];
    const page = await api.createPage({ name, slug, widgets });
    navigate(`/admin/pages/${page.id}`);
  }

  if (loading) return <p>Chargement...</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 18 }}>Pages ({pages.length})</h1>
        <button onClick={createPage} style={primaryButtonStyle}>
          + Nouvelle page
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {pages.map((page) => (
          <Link
            key={page.id}
            to={`/admin/pages/${page.id}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "var(--spacing-md)",
              background: "var(--widget-background)",
              border: "1px solid var(--widget-border)",
              borderRadius: "var(--widget-radius)",
              color: "var(--deck-text)",
              textDecoration: "none",
            }}
          >
            <span>{page.name}</span>
            <span style={{ color: "var(--deck-muted-text)" }}>
              /{page.slug} — {page.widgets.length} widget(s)
            </span>
          </Link>
        ))}
        {pages.length === 0 && <p style={{ color: "var(--deck-muted-text)" }}>Aucune page pour l'instant.</p>}
      </div>
    </div>
  );
}

export const primaryButtonStyle: React.CSSProperties = {
  background: "var(--deck-accent)",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  fontWeight: 600,
  cursor: "pointer",
};
