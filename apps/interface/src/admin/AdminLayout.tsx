import { NavLink, Outlet } from "react-router-dom";

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
  color: isActive ? "var(--deck-accent)" : "var(--deck-muted-text)",
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 600,
  padding: "8px 12px",
  borderRadius: 8,
  background: isActive ? "var(--widget-active-background)" : "transparent",
});

export function AdminLayout() {
  return (
    <div style={{ minHeight: "100dvh", background: "var(--deck-background)", color: "var(--deck-text)" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "var(--spacing-md)",
          borderBottom: "1px solid var(--widget-border)",
        }}
      >
        <strong>StreamDesk — Administration</strong>
        <nav style={{ display: "flex", gap: 8 }}>
          <NavLink to="/admin" end style={navLinkStyle}>
            Vue d'ensemble
          </NavLink>
          <NavLink to="/admin/pages" style={navLinkStyle}>
            Pages
          </NavLink>
          <NavLink to="/admin/plugins" style={navLinkStyle}>
            Plugins
          </NavLink>
          <NavLink to="/admin/devices" style={navLinkStyle}>
            Appareils
          </NavLink>
        </nav>
        <a href="/" style={{ marginLeft: "auto", color: "var(--deck-muted-text)", fontSize: 13 }}>
          ← Retour au Deck
        </a>
      </header>
      <main style={{ padding: "var(--spacing-lg)" }}>
        <Outlet />
      </main>
    </div>
  );
}
