import { useState } from "react";
import type { InteractionVariable } from "@streamdesk/shared-types";
import { api } from "../api.js";

const fieldStyle: React.CSSProperties = {
  background: "var(--deck-background)",
  border: "1px solid var(--widget-border)",
  borderRadius: 6,
  color: "var(--deck-text)",
  padding: "4px 8px",
  fontSize: 12,
  boxSizing: "border-box",
};

const smallButtonStyle: React.CSSProperties = {
  background: "var(--widget-background)",
  border: "1px solid var(--widget-border)",
  borderRadius: 6,
  padding: "3px 8px",
  fontSize: 11,
  cursor: "pointer",
  color: "var(--deck-text)",
};

/**
 * Compact CRUD for interaction-script variables, embedded directly in the
 * block editor (rather than a separate admin page) since the only place an
 * operator needs them is while wiring a "Définir/Modifier une variable"
 * block or a "Variable" expression. Every change immediately re-fetches
 * and calls `onChange` so the surrounding editor's variable pickers reflect
 * it right away.
 */
export function VariablesPanel({ variables, onChange }: { variables: InteractionVariable[]; onChange: (variables: InteractionVariable[]) => void }) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    onChange(await api.listVariables());
  }

  async function create() {
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.createVariable({ name: newName.trim(), initialValue: 0 });
      setNewName("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la création");
    } finally {
      setBusy(false);
    }
  }

  async function rename(id: string, name: string) {
    await api.updateVariable(id, { name });
    await refresh();
  }

  async function setInitialValue(id: string, initialValue: string) {
    const parsed = Number.isNaN(Number(initialValue)) ? initialValue : Number(initialValue);
    await api.updateVariable(id, { initialValue: parsed });
    await refresh();
  }

  async function reset(id: string) {
    await api.resetVariable(id);
    await refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Supprimer cette variable ? Les blocs qui l'utilisent ne fonctionneront plus.")) return;
    await api.deleteVariable(id);
    await refresh();
  }

  return (
    <div style={{ border: "1px solid var(--widget-border)", borderRadius: 8, padding: 8 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ background: "transparent", border: "none", color: "var(--deck-text)", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}
      >
        {open ? "▾" : "▸"} Variables ({variables.length})
      </button>

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {variables.map((v) => (
            <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                style={{ ...fieldStyle, flex: 1 }}
                defaultValue={v.name}
                onBlur={(e) => e.target.value.trim() && e.target.value !== v.name && rename(v.id, e.target.value.trim())}
              />
              <input
                style={{ ...fieldStyle, width: 70 }}
                title="Valeur initiale"
                defaultValue={String(v.initialValue)}
                onBlur={(e) => setInitialValue(v.id, e.target.value)}
              />
              <span style={{ fontSize: 10, color: "var(--deck-muted-text)" }} title="Valeur courante">
                = {String(v.currentValue)}
              </span>
              <button type="button" onClick={() => reset(v.id)} style={smallButtonStyle} title="Réinitialiser à la valeur initiale">
                ↺
              </button>
              <button type="button" onClick={() => remove(v.id)} style={{ ...smallButtonStyle, color: "var(--deck-danger)" }} title="Supprimer">
                ✕
              </button>
            </div>
          ))}
          {variables.length === 0 && <p style={{ fontSize: 11, color: "var(--deck-muted-text)", margin: 0 }}>Aucune variable.</p>}

          <div style={{ display: "flex", gap: 4 }}>
            <input
              style={{ ...fieldStyle, flex: 1 }}
              placeholder="Nom de la nouvelle variable"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
            <button type="button" onClick={create} disabled={busy} style={smallButtonStyle}>
              + Créer
            </button>
          </div>
          {error && <span style={{ fontSize: 11, color: "var(--deck-danger)" }}>{error}</span>}
        </div>
      )}
    </div>
  );
}
