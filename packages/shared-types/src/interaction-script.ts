import type { ActionTarget } from "./actions.js";

/**
 * A value used inside an interaction script. Everything is resolved live on
 * the Server when the script runs — nothing here is pre-computed at save
 * time — so the same script can react to whatever a variable, a data
 * source, or the trigger's own live payload (e.g. a slider's new position)
 * happen to be at the moment a widget fires.
 */
export type InteractionExpression =
  | { kind: "literal"; value: string | number | boolean }
  | { kind: "variable"; variableId: string }
  | { kind: "dataSource"; dataSourceId: string }
  /** Reads one field from the trigger's live payload (`inputOverride`) —
   * e.g. a slider's "change" trigger carries `{ level: 42 }`; an action
   * block can read that instead of a fixed literal via `{field:"level"}`. */
  | { kind: "triggerInput"; field: string }
  | { kind: "compare"; op: CompareOp; left: InteractionExpression; right: InteractionExpression }
  | { kind: "logical"; op: LogicalOp; operands: InteractionExpression[] }
  | { kind: "arithmetic"; op: ArithmeticOp; left: InteractionExpression; right: InteractionExpression };

export type CompareOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
export type LogicalOp = "and" | "or" | "not";
export type ArithmeticOp = "add" | "sub" | "mul" | "div" | "mod";

/** Runs one action (server or Connect-routed, exactly like today's single
 * fixed action call), but every input field is now a live expression
 * instead of a fixed JSON value. */
export type ActionBlock = {
  id: string;
  kind: "action";
  actionId: string;
  input: Record<string, InteractionExpression>;
  target?: ActionTarget;
};

export type IfBlock = {
  id: string;
  kind: "if";
  condition: InteractionExpression;
  then: InteractionBlock[];
  else?: InteractionBlock[];
};

export type RepeatCountBlock = {
  id: string;
  kind: "repeatCount";
  count: InteractionExpression;
  body: InteractionBlock[];
};

export type RepeatWhileBlock = {
  id: string;
  kind: "repeatWhile";
  condition: InteractionExpression;
  body: InteractionBlock[];
};

export type WaitBlock = {
  id: string;
  kind: "wait";
  durationMs: InteractionExpression;
};

export type SetVariableBlock = {
  id: string;
  kind: "setVariable";
  variableId: string;
  value: InteractionExpression;
};

export type ChangeVariableBlock = {
  id: string;
  kind: "changeVariable";
  variableId: string;
  delta: InteractionExpression;
};

/** One step of an interaction script. "action" blocks are grouped by
 * plugin in the block editor's picker; every other kind is a generic
 * "Logique" block (if/else, loops, wait, variables) available regardless
 * of which plugins are installed. */
export type InteractionBlock =
  | ActionBlock
  | IfBlock
  | RepeatCountBlock
  | RepeatWhileBlock
  | WaitBlock
  | SetVariableBlock
  | ChangeVariableBlock;

/** A named, server-persisted mutable value a script can read/write via
 * `variable`/`setVariable`/`changeVariable`. Also exposed read-only as the
 * data source `variable.<id>`, so any widget can bind a label to it without
 * needing a script at all. */
export type InteractionVariable = {
  id: string;
  name: string;
  initialValue: string | number | boolean;
  currentValue: string | number | boolean;
  createdAt: string;
  updatedAt: string;
};
