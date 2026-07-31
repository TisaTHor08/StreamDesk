import { useMemo, useState } from "react";
import type {
  ActionDefinition,
  DataSourceDefinition,
  InteractionBlock,
  InteractionExpression,
  InteractionVariable,
} from "@streamdesk/shared-types";
import { ExpressionEditor } from "./ExpressionEditor.js";
import { VariablesPanel } from "./VariablesPanel.js";

const panelStyle: React.CSSProperties = {
  background: "var(--widget-background)",
  border: "1px solid var(--widget-border)",
  borderRadius: "var(--widget-radius)",
  padding: 14,
};

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

const primaryButtonStyle: React.CSSProperties = {
  background: "var(--deck-accent)",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  fontWeight: 600,
  cursor: "pointer",
};

type LogicBlockKind = Exclude<InteractionBlock["kind"], "action">;

const LOGIC_BLOCK_LABELS: Record<LogicBlockKind, string> = {
  if: "Si / Sinon",
  repeatCount: "Répéter N fois",
  repeatWhile: "Répéter tant que",
  wait: "Attendre",
  setVariable: "Définir une variable",
  changeVariable: "Modifier une variable",
};

const BLOCK_COLORS: Record<InteractionBlock["kind"], string> = {
  action: "var(--deck-accent)",
  if: "#9b6bd6",
  repeatCount: "#9b6bd6",
  repeatWhile: "#9b6bd6",
  wait: "#9b6bd6",
  setVariable: "#c9852c",
  changeVariable: "#c9852c",
};

function newId(): string {
  return crypto.randomUUID();
}

function defaultExpressionForSchemaType(type: string | undefined): InteractionExpression {
  if (type === "number" || type === "integer") return { kind: "literal", value: 0 };
  if (type === "boolean") return { kind: "literal", value: false };
  return { kind: "literal", value: "" };
}

function createActionBlock(action: ActionDefinition): InteractionBlock {
  const input: Record<string, InteractionExpression> = {};
  for (const [key, schema] of Object.entries(action.inputSchema.properties ?? {})) {
    input[key] = defaultExpressionForSchemaType(schema.type);
  }
  return { id: newId(), kind: "action", actionId: action.id, input, target: { mode: "automatic" } };
}

function createLogicBlock(kind: LogicBlockKind, variables: InteractionVariable[]): InteractionBlock {
  const firstVariableId = variables[0]?.id ?? "";
  switch (kind) {
    case "if":
      return { id: newId(), kind: "if", condition: { kind: "literal", value: true }, then: [] };
    case "repeatCount":
      return { id: newId(), kind: "repeatCount", count: { kind: "literal", value: 1 }, body: [] };
    case "repeatWhile":
      return { id: newId(), kind: "repeatWhile", condition: { kind: "literal", value: false }, body: [] };
    case "wait":
      return { id: newId(), kind: "wait", durationMs: { kind: "literal", value: 500 } };
    case "setVariable":
      return { id: newId(), kind: "setVariable", variableId: firstVariableId, value: { kind: "literal", value: 0 } };
    case "changeVariable":
      return { id: newId(), kind: "changeVariable", variableId: firstVariableId, delta: { kind: "literal", value: 1 } };
  }
}

export type BlockEditorContext = {
  actions: ActionDefinition[];
  dataSources: DataSourceDefinition[];
  variables: InteractionVariable[];
  pluginNames: Record<string, string>;
};

/* -------------------------------- Add-block menu -------------------------------- */

function AddBlockMenu({ ctx, onAdd }: { ctx: BlockEditorContext; onAdd: (block: InteractionBlock) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const actionsByPlugin = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = ctx.actions.filter((a) => !q || a.displayName.toLowerCase().includes(q) || a.id.toLowerCase().includes(q));
    const grouped = new Map<string, ActionDefinition[]>();
    for (const action of filtered) {
      if (!grouped.has(action.pluginId)) grouped.set(action.pluginId, []);
      grouped.get(action.pluginId)!.push(action);
    }
    return [...grouped.entries()]
      .map(([pluginId, actions]) => ({ pluginId, pluginName: ctx.pluginNames[pluginId] ?? pluginId, actions }))
      .sort((a, b) => a.pluginName.localeCompare(b.pluginName));
  }, [ctx.actions, ctx.pluginNames, query]);

  const logicEntries = (Object.keys(LOGIC_BLOCK_LABELS) as LogicBlockKind[]).filter((kind) => {
    const q = query.trim().toLowerCase();
    return !q || LOGIC_BLOCK_LABELS[kind].toLowerCase().includes(q);
  });

  function pick(block: InteractionBlock) {
    onAdd(block);
    setOpen(false);
    setQuery("");
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{ ...smallButtonStyle, borderStyle: "dashed" }}>
        + Ajouter un bloc
      </button>
    );
  }

  return (
    <div style={{ ...panelStyle, padding: 8, display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflow: "auto" }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          autoFocus
          type="search"
          placeholder="Rechercher un bloc..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ ...fieldStyle, flex: 1 }}
        />
        <button type="button" onClick={() => setOpen(false)} style={smallButtonStyle}>
          Fermer
        </button>
      </div>

      {logicEntries.length > 0 && (
        <div>
          <h4 style={{ fontSize: 11, color: "var(--deck-muted-text)", margin: "4px 0" }}>Logique</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {logicEntries.map((kind) => (
              <button key={kind} type="button" onClick={() => pick(createLogicBlock(kind, ctx.variables))} style={smallButtonStyle}>
                {LOGIC_BLOCK_LABELS[kind]}
              </button>
            ))}
          </div>
        </div>
      )}

      {actionsByPlugin.map((group) => (
        <div key={group.pluginId}>
          <h4 style={{ fontSize: 11, color: "var(--deck-muted-text)", margin: "4px 0" }}>{group.pluginName}</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {group.actions.map((action) => (
              <button key={action.id} type="button" onClick={() => pick(createActionBlock(action))} style={smallButtonStyle} title={action.description}>
                {action.displayName}
              </button>
            ))}
          </div>
        </div>
      ))}

      {logicEntries.length === 0 && actionsByPlugin.length === 0 && (
        <p style={{ fontSize: 11, color: "var(--deck-muted-text)" }}>Aucun résultat.</p>
      )}
    </div>
  );
}

/* -------------------------------- Block list / card -------------------------------- */

function BlockList({
  blocks,
  onChange,
  ctx,
  label,
}: {
  blocks: InteractionBlock[];
  onChange: (blocks: InteractionBlock[]) => void;
  ctx: BlockEditorContext;
  label?: string;
}) {
  function update(index: number, block: InteractionBlock) {
    const next = [...blocks];
    next[index] = block;
    onChange(next);
  }

  function remove(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    onChange(next);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <span style={{ fontSize: 11, color: "var(--deck-muted-text)", fontWeight: 600 }}>{label}</span>}
      {blocks.length === 0 && <p style={{ fontSize: 11, color: "var(--deck-muted-text)", margin: 0 }}>Aucun bloc.</p>}
      {blocks.map((block, index) => (
        <BlockCard
          key={block.id}
          block={block}
          ctx={ctx}
          onChange={(next) => update(index, next)}
          onRemove={() => remove(index)}
          onMoveUp={index > 0 ? () => move(index, -1) : undefined}
          onMoveDown={index < blocks.length - 1 ? () => move(index, 1) : undefined}
        />
      ))}
      <AddBlockMenu ctx={ctx} onAdd={(block) => onChange([...blocks, block])} />
    </div>
  );
}

function BlockCard({
  block,
  ctx,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  block: InteractionBlock;
  ctx: BlockEditorContext;
  onChange: (block: InteractionBlock) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  return (
    <div
      style={{
        border: `1px solid ${BLOCK_COLORS[block.kind]}`,
        borderLeft: `4px solid ${BLOCK_COLORS[block.kind]}`,
        borderRadius: 8,
        padding: 8,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        background: "var(--deck-background)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: BLOCK_COLORS[block.kind] }}>{blockTitle(block, ctx)}</span>
        <div style={{ display: "flex", gap: 4 }}>
          {onMoveUp && (
            <button type="button" onClick={onMoveUp} style={smallButtonStyle} title="Monter">
              ↑
            </button>
          )}
          {onMoveDown && (
            <button type="button" onClick={onMoveDown} style={smallButtonStyle} title="Descendre">
              ↓
            </button>
          )}
          <button type="button" onClick={onRemove} style={{ ...smallButtonStyle, color: "var(--deck-danger)" }} title="Supprimer">
            ✕
          </button>
        </div>
      </div>

      {block.kind === "action" && <ActionBlockBody block={block} ctx={ctx} onChange={onChange} />}

      {block.kind === "if" && (
        <>
          <ExpressionEditor value={block.condition} onChange={(condition) => onChange({ ...block, condition })} variables={ctx.variables} dataSources={ctx.dataSources} />
          <BlockList label="Alors" blocks={block.then} onChange={(then) => onChange({ ...block, then })} ctx={ctx} />
          {block.else ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--deck-muted-text)", fontWeight: 600 }}>Sinon</span>
                <button type="button" onClick={() => onChange({ ...block, else: undefined })} style={smallButtonStyle}>
                  Retirer le "sinon"
                </button>
              </div>
              <BlockList blocks={block.else} onChange={(elseBlocks) => onChange({ ...block, else: elseBlocks })} ctx={ctx} />
            </>
          ) : (
            <button type="button" onClick={() => onChange({ ...block, else: [] })} style={{ ...smallButtonStyle, alignSelf: "flex-start" }}>
              + Sinon
            </button>
          )}
        </>
      )}

      {block.kind === "repeatCount" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--deck-muted-text)" }}>Nombre de fois :</span>
            <ExpressionEditor value={block.count} onChange={(count) => onChange({ ...block, count })} variables={ctx.variables} dataSources={ctx.dataSources} />
          </div>
          <BlockList blocks={block.body} onChange={(body) => onChange({ ...block, body })} ctx={ctx} />
        </>
      )}

      {block.kind === "repeatWhile" && (
        <>
          <ExpressionEditor value={block.condition} onChange={(condition) => onChange({ ...block, condition })} variables={ctx.variables} dataSources={ctx.dataSources} />
          <BlockList blocks={block.body} onChange={(body) => onChange({ ...block, body })} ctx={ctx} />
        </>
      )}

      {block.kind === "wait" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--deck-muted-text)" }}>Durée (ms) :</span>
          <ExpressionEditor value={block.durationMs} onChange={(durationMs) => onChange({ ...block, durationMs })} variables={ctx.variables} dataSources={ctx.dataSources} />
        </div>
      )}

      {(block.kind === "setVariable" || block.kind === "changeVariable") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <select
            style={fieldStyle}
            value={block.variableId}
            onChange={(e) => onChange({ ...block, variableId: e.target.value })}
          >
            <option value="">— choisir une variable —</option>
            {ctx.variables.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          {ctx.variables.length === 0 && (
            <span style={{ fontSize: 11, color: "var(--deck-muted-text)" }}>
              Aucune variable n'existe encore — créez-en une dans le panneau "Variables".
            </span>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--deck-muted-text)" }}>{block.kind === "setVariable" ? "Nouvelle valeur :" : "Ajouter :"}</span>
            {block.kind === "setVariable" ? (
              <ExpressionEditor value={block.value} onChange={(value) => onChange({ ...block, value })} variables={ctx.variables} dataSources={ctx.dataSources} />
            ) : (
              <ExpressionEditor value={block.delta} onChange={(delta) => onChange({ ...block, delta })} variables={ctx.variables} dataSources={ctx.dataSources} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function blockTitle(block: InteractionBlock, ctx: BlockEditorContext): string {
  switch (block.kind) {
    case "action": {
      const action = ctx.actions.find((a) => a.id === block.actionId);
      return `Action : ${action?.displayName ?? block.actionId}`;
    }
    case "if":
      return "Si / Sinon";
    case "repeatCount":
      return "Répéter N fois";
    case "repeatWhile":
      return "Répéter tant que";
    case "wait":
      return "Attendre";
    case "setVariable":
      return "Définir une variable";
    case "changeVariable":
      return "Modifier une variable";
  }
}

function ActionBlockBody({
  block,
  ctx,
  onChange,
}: {
  block: Extract<InteractionBlock, { kind: "action" }>;
  ctx: BlockEditorContext;
  onChange: (block: InteractionBlock) => void;
}) {
  const action = ctx.actions.find((a) => a.id === block.actionId);
  const fields = Object.entries(action?.inputSchema.properties ?? {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <select
        style={fieldStyle}
        value={block.actionId}
        onChange={(e) => {
          const nextAction = ctx.actions.find((a) => a.id === e.target.value);
          onChange(nextAction ? createActionBlock(nextAction) : { ...block, actionId: e.target.value, input: {} });
        }}
      >
        <option value="">— choisir une action —</option>
        {ctx.actions.map((a) => (
          <option key={a.id} value={a.id}>
            {a.displayName} ({a.id})
          </option>
        ))}
      </select>
      {fields.map(([key, schema]) => (
        <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--deck-muted-text)", minWidth: 70 }} title={schema.description}>
            {key}
          </span>
          <ExpressionEditor
            value={block.input[key] ?? defaultExpressionForSchemaType(schema.type)}
            onChange={(value) => onChange({ ...block, input: { ...block.input, [key]: value } })}
            variables={ctx.variables}
            dataSources={ctx.dataSources}
          />
        </div>
      ))}
      {fields.length === 0 && <span style={{ fontSize: 11, color: "var(--deck-muted-text)" }}>Cette action ne prend aucun paramètre.</span>}
    </div>
  );
}

/* -------------------------------- Modal -------------------------------- */

const TRIGGER_LABELS: Record<string, string> = {
  press: "Appui",
  release: "Relâchement",
  longPress: "Appui long",
  change: "Changement (curseur)",
};

export function InteractionScriptEditor({
  trigger,
  blocks,
  ctx,
  onSave,
  onClose,
}: {
  trigger: string;
  blocks: InteractionBlock[];
  ctx: BlockEditorContext;
  onSave: (blocks: InteractionBlock[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<InteractionBlock[]>(blocks);
  const [variables, setVariables] = useState(ctx.variables);
  const effectiveCtx: BlockEditorContext = { ...ctx, variables };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{ ...panelStyle, width: "min(720px, 100%)", maxHeight: "85vh", overflow: "auto", display: "flex", flexDirection: "column", gap: 12 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 15, margin: 0 }}>Interaction : {TRIGGER_LABELS[trigger] ?? trigger}</h2>
          <button type="button" onClick={onClose} style={smallButtonStyle}>
            ✕
          </button>
        </div>

        <p style={{ fontSize: 12, color: "var(--deck-muted-text)", margin: 0 }}>
          Les blocs s'exécutent dans l'ordre, de haut en bas. Utilisez "Si / Sinon", les boucles et les variables pour
          construire une logique plus riche qu'un simple appel d'action.
        </p>

        <VariablesPanel variables={variables} onChange={setVariables} />

        <BlockList blocks={draft} onChange={setDraft} ctx={effectiveCtx} />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <button type="button" onClick={onClose} style={smallButtonStyle}>
            Annuler
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            style={primaryButtonStyle}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
