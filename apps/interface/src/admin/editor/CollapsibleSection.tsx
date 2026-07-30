import type { ReactNode } from "react";

export type CollapsibleSectionProps = {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
  /** When true, this section grows to fill the remaining height of its flex column when expanded (used for the widget palette). */
  grow?: boolean;
};

/**
 * Expand/collapse section for the editor's left sidebar. The "Page" and
 * "Grille" settings default to collapsed so the widget palette — the thing
 * an operator reaches for constantly while building a page — gets the
 * full remaining height instead of competing with settings forms that are
 * only touched occasionally.
 */
export function CollapsibleSection({ title, collapsed, onToggle, children, grow }: CollapsibleSectionProps) {
  return (
    <div
      style={{
        background: "var(--widget-background)",
        border: "1px solid var(--widget-border)",
        borderRadius: "var(--widget-radius)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        ...(grow && !collapsed ? { flex: 1 } : {}),
      }}
    >
      <button
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          background: "transparent",
          border: "none",
          color: "var(--deck-text)",
          fontSize: 13,
          fontWeight: 600,
          padding: 12,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ display: "inline-block", transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.1s" }}>
          ▾
        </span>
        {title}
      </button>
      {!collapsed && (
        <div style={{ padding: "0 12px 12px", overflow: grow ? "auto" : "visible", minHeight: 0, flex: grow ? 1 : undefined }}>
          {children}
        </div>
      )}
    </div>
  );
}
