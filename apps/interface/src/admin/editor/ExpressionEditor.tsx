import type { DataSourceDefinition, InteractionExpression, InteractionVariable } from "@streamdesk/shared-types";

const fieldStyle: React.CSSProperties = {
  background: "var(--widget-background)",
  border: "1px solid var(--widget-border)",
  borderRadius: 6,
  color: "var(--deck-text)",
  padding: "4px 8px",
  fontSize: 12,
  boxSizing: "border-box",
};

const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" };

export type ExpressionEditorProps = {
  value: InteractionExpression;
  onChange: (value: InteractionExpression) => void;
  variables: InteractionVariable[];
  dataSources: DataSourceDefinition[];
  /** Visual nesting depth, purely to give deeply-nested expressions a subtle indent/border cue. */
  depth?: number;
};

const KIND_LABELS: Record<InteractionExpression["kind"], string> = {
  literal: "Valeur fixe",
  variable: "Variable",
  dataSource: "Source de données",
  triggerInput: "Valeur du déclencheur",
  compare: "Comparaison",
  logical: "Logique (ET/OU/NON)",
  arithmetic: "Calcul",
};

const COMPARE_LABELS: Record<string, string> = { eq: "=", neq: "≠", gt: ">", gte: "≥", lt: "<", lte: "≤" };
const LOGICAL_LABELS: Record<string, string> = { and: "ET", or: "OU", not: "NON" };
const ARITHMETIC_LABELS: Record<string, string> = { add: "+", sub: "-", mul: "×", div: "÷", mod: "%" };

function defaultForKind(kind: InteractionExpression["kind"], variables: InteractionVariable[], dataSources: DataSourceDefinition[]): InteractionExpression {
  switch (kind) {
    case "literal":
      return { kind: "literal", value: "" };
    case "variable":
      return { kind: "variable", variableId: variables[0]?.id ?? "" };
    case "dataSource":
      return { kind: "dataSource", dataSourceId: dataSources[0]?.id ?? "" };
    case "triggerInput":
      return { kind: "triggerInput", field: "" };
    case "compare":
      return { kind: "compare", op: "eq", left: { kind: "literal", value: "" }, right: { kind: "literal", value: "" } };
    case "logical":
      return { kind: "logical", op: "and", operands: [{ kind: "literal", value: true }, { kind: "literal", value: true }] };
    case "arithmetic":
      return { kind: "arithmetic", op: "add", left: { kind: "literal", value: 0 }, right: { kind: "literal", value: 0 } };
  }
}

/**
 * Recursive editor for one `InteractionExpression` (see interaction-script.ts
 * in shared-types) — the value side of every block field (an action's
 * input, an `if`'s condition, a `repeatCount`'s count, etc). Comparisons,
 * logical combinators, and arithmetic all nest further `ExpressionEditor`s
 * for their operands, so this component calls itself.
 */
export function ExpressionEditor({ value, onChange, variables, dataSources, depth = 0 }: ExpressionEditorProps) {
  function changeKind(kind: InteractionExpression["kind"]) {
    onChange(defaultForKind(kind, variables, dataSources));
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        paddingLeft: depth > 0 ? 8 : 0,
        borderLeft: depth > 0 ? "2px solid var(--widget-border)" : "none",
      }}
    >
      <select style={fieldStyle} value={value.kind} onChange={(e) => changeKind(e.target.value as InteractionExpression["kind"])}>
        {Object.entries(KIND_LABELS).map(([kind, label]) => (
          <option key={kind} value={kind}>
            {label}
          </option>
        ))}
      </select>

      {value.kind === "literal" && <LiteralEditor value={value} onChange={onChange} />}

      {value.kind === "variable" && (
        <select style={fieldStyle} value={value.variableId} onChange={(e) => onChange({ kind: "variable", variableId: e.target.value })}>
          <option value="">— choisir une variable —</option>
          {variables.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      )}

      {value.kind === "dataSource" && (
        <select style={fieldStyle} value={value.dataSourceId} onChange={(e) => onChange({ kind: "dataSource", dataSourceId: e.target.value })}>
          <option value="">— choisir une source de données —</option>
          {dataSources.map((ds) => (
            <option key={ds.id} value={ds.id}>
              {ds.displayName} ({ds.id})
            </option>
          ))}
        </select>
      )}

      {value.kind === "triggerInput" && (
        <input
          style={fieldStyle}
          placeholder="nom du champ (ex : level)"
          value={value.field}
          onChange={(e) => onChange({ kind: "triggerInput", field: e.target.value })}
        />
      )}

      {value.kind === "compare" && (
        <div style={rowStyle}>
          <ExpressionEditor value={value.left} onChange={(left) => onChange({ ...value, left })} variables={variables} dataSources={dataSources} depth={depth + 1} />
          <select style={fieldStyle} value={value.op} onChange={(e) => onChange({ ...value, op: e.target.value as typeof value.op })}>
            {Object.entries(COMPARE_LABELS).map(([op, label]) => (
              <option key={op} value={op}>
                {label}
              </option>
            ))}
          </select>
          <ExpressionEditor value={value.right} onChange={(right) => onChange({ ...value, right })} variables={variables} dataSources={dataSources} depth={depth + 1} />
        </div>
      )}

      {value.kind === "logical" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <select style={fieldStyle} value={value.op} onChange={(e) => onChange({ ...value, op: e.target.value as typeof value.op })}>
            {Object.entries(LOGICAL_LABELS).map(([op, label]) => (
              <option key={op} value={op}>
                {label}
              </option>
            ))}
          </select>
          {value.operands.map((operand, index) => (
            <div key={index} style={rowStyle}>
              <ExpressionEditor
                value={operand}
                onChange={(next) => {
                  const operands = [...value.operands];
                  operands[index] = next;
                  onChange({ ...value, operands });
                }}
                variables={variables}
                dataSources={dataSources}
                depth={depth + 1}
              />
              {value.op !== "not" && value.operands.length > 2 && (
                <button
                  type="button"
                  onClick={() => onChange({ ...value, operands: value.operands.filter((_, i) => i !== index) })}
                  style={{ ...fieldStyle, cursor: "pointer" }}
                  title="Retirer"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {value.op !== "not" && (
            <button
              type="button"
              onClick={() => onChange({ ...value, operands: [...value.operands, { kind: "literal", value: true }] })}
              style={{ ...fieldStyle, cursor: "pointer", alignSelf: "flex-start" }}
            >
              + Condition
            </button>
          )}
        </div>
      )}

      {value.kind === "arithmetic" && (
        <div style={rowStyle}>
          <ExpressionEditor value={value.left} onChange={(left) => onChange({ ...value, left })} variables={variables} dataSources={dataSources} depth={depth + 1} />
          <select style={fieldStyle} value={value.op} onChange={(e) => onChange({ ...value, op: e.target.value as typeof value.op })}>
            {Object.entries(ARITHMETIC_LABELS).map(([op, label]) => (
              <option key={op} value={op}>
                {label}
              </option>
            ))}
          </select>
          <ExpressionEditor value={value.right} onChange={(right) => onChange({ ...value, right })} variables={variables} dataSources={dataSources} depth={depth + 1} />
        </div>
      )}
    </div>
  );
}

function LiteralEditor({
  value,
  onChange,
}: {
  value: Extract<InteractionExpression, { kind: "literal" }>;
  onChange: (value: InteractionExpression) => void;
}) {
  const type = typeof value.value === "boolean" ? "boolean" : typeof value.value === "number" ? "number" : "string";

  return (
    <div style={rowStyle}>
      <select
        style={fieldStyle}
        value={type}
        onChange={(e) => {
          const nextType = e.target.value;
          const next = nextType === "boolean" ? true : nextType === "number" ? 0 : "";
          onChange({ kind: "literal", value: next });
        }}
      >
        <option value="string">Texte</option>
        <option value="number">Nombre</option>
        <option value="boolean">Booléen</option>
      </select>
      {type === "boolean" ? (
        <select style={fieldStyle} value={String(value.value)} onChange={(e) => onChange({ kind: "literal", value: e.target.value === "true" })}>
          <option value="true">vrai</option>
          <option value="false">faux</option>
        </select>
      ) : type === "number" ? (
        <input
          type="number"
          style={fieldStyle}
          value={typeof value.value === "number" ? value.value : 0}
          onChange={(e) => onChange({ kind: "literal", value: Number(e.target.value) })}
        />
      ) : (
        <input
          type="text"
          style={fieldStyle}
          value={typeof value.value === "string" ? value.value : ""}
          onChange={(e) => onChange({ kind: "literal", value: e.target.value })}
        />
      )}
    </div>
  );
}
