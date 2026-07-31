import type {
  ActionRequester,
  ArithmeticOp,
  CompareOp,
  InteractionBlock,
  InteractionExpression,
  LogicalOp,
} from "@streamdesk/shared-types";
import type { ActionRouter } from "./action-router.js";
import type { DataSourceStore } from "./datasource-store.js";
import type { VariablesRepository } from "../db/repositories/variables.repo.js";
import type { Logger } from "../logging/logger.js";
import { generateId } from "../security/tokens.js";

export type InteractionExecutionContext = {
  /** The trigger's live payload (`inputOverride`), e.g. `{ level: 42 }` for a slider mid-drag. */
  triggerInput: Record<string, unknown>;
  requestedBy: ActionRequester;
};

export type InteractionRunResult = {
  ok: boolean;
  /** Human-readable messages for every action/budget failure encountered — empty when `ok`. */
  errors: string[];
};

/** Hard ceiling on total loop iterations across an entire script run (shared
 * across every repeatCount/repeatWhile block, not per-loop) — a script is a
 * small user-authored program running with real side effects (it can open
 * apps, change system volume, etc.), so an accidental or malicious infinite
 * loop must not be able to spin the Server forever. */
const MAX_ITERATIONS = 1000;
/** Hard ceiling on a single `wait` block's duration. */
const MAX_WAIT_MS = 60_000;
/** Wall-clock budget for one full script run, checked between every block/iteration. */
const MAX_SCRIPT_MS = 120_000;

class ScriptBudgetExceededError extends Error {}

type RunState = {
  iterations: number;
  startedAt: number;
};

/**
 * Interprets a widget interaction's block script (see interaction-script.ts
 * in shared-types) — the server-side counterpart to the visual block editor.
 * Every "action" leaf still goes through the exact same `ActionRouter` used
 * by V1's single-action interactions, so the routing/permission/Connect
 * model is unchanged; this only adds sequencing, branching, loops, waits,
 * and variables around those calls.
 */
export class InteractionEngine {
  constructor(
    private readonly router: ActionRouter,
    private readonly variables: VariablesRepository,
    private readonly dataSources: DataSourceStore,
    private readonly logger: Logger,
  ) {}

  async run(blocks: InteractionBlock[], ctx: InteractionExecutionContext): Promise<InteractionRunResult> {
    const state: RunState = { iterations: 0, startedAt: Date.now() };
    const errors: string[] = [];
    try {
      await this.runSequence(blocks, ctx, state, errors);
    } catch (error) {
      if (error instanceof ScriptBudgetExceededError) {
        errors.push(error.message);
        this.logger.warn("Interaction script aborted: budget exceeded", { message: error.message });
      } else {
        const message = error instanceof Error ? error.message : "Erreur inconnue pendant l'exécution du script";
        errors.push(message);
        this.logger.error("Interaction script raised an unexpected error", { message });
      }
    }
    return { ok: errors.length === 0, errors };
  }

  private async runSequence(
    blocks: InteractionBlock[],
    ctx: InteractionExecutionContext,
    state: RunState,
    errors: string[],
  ): Promise<void> {
    for (const block of blocks) {
      this.guardBudget(state);
      await this.runBlock(block, ctx, state, errors);
    }
  }

  private async runBlock(
    block: InteractionBlock,
    ctx: InteractionExecutionContext,
    state: RunState,
    errors: string[],
  ): Promise<void> {
    switch (block.kind) {
      case "action": {
        const input: Record<string, unknown> = {};
        for (const [key, expr] of Object.entries(block.input)) input[key] = this.evaluate(expr, ctx);
        const result = await this.router.execute({
          executionId: generateId("exec"),
          actionId: block.actionId,
          input,
          target: block.target,
          requestedBy: ctx.requestedBy,
        });
        if (result.status !== "success") {
          errors.push(result.error?.message ?? `L'action "${block.actionId}" a échoué (${result.status})`);
        }
        return;
      }
      case "if": {
        const branch = truthy(this.evaluate(block.condition, ctx)) ? block.then : (block.else ?? []);
        await this.runSequence(branch, ctx, state, errors);
        return;
      }
      case "repeatCount": {
        const raw = this.evaluate(block.count, ctx);
        const count = clamp(Math.floor(toNumber(raw)), 0, MAX_ITERATIONS);
        for (let i = 0; i < count; i++) {
          state.iterations++;
          this.guardBudget(state);
          await this.runSequence(block.body, ctx, state, errors);
        }
        return;
      }
      case "repeatWhile": {
        while (truthy(this.evaluate(block.condition, ctx))) {
          state.iterations++;
          this.guardBudget(state);
          await this.runSequence(block.body, ctx, state, errors);
        }
        return;
      }
      case "wait": {
        const ms = clamp(toNumber(this.evaluate(block.durationMs, ctx)), 0, MAX_WAIT_MS);
        await sleep(ms);
        return;
      }
      case "setVariable": {
        this.applyVariable(block.variableId, this.evaluate(block.value, ctx));
        return;
      }
      case "changeVariable": {
        const current = toNumber(this.variables.getById(block.variableId)?.currentValue ?? 0);
        const delta = toNumber(this.evaluate(block.delta, ctx));
        this.applyVariable(block.variableId, current + delta);
        return;
      }
    }
  }

  private applyVariable(variableId: string, value: unknown): void {
    const scalar = toScalar(value);
    this.variables.setValue(variableId, scalar);
    // Reuses the existing data-source binding pipeline so any widget bound
    // to "variable.<id>" (e.g. a text label) updates live — no separate
    // push mechanism needed. Registration of the synthetic data source
    // itself happens once at variable-creation time (see variables HTTP
    // routes / bootstrap), not here.
    this.dataSources.update(`variable.${variableId}`, undefined, scalar);
  }

  private evaluate(expr: InteractionExpression, ctx: InteractionExecutionContext): unknown {
    switch (expr.kind) {
      case "literal":
        return expr.value;
      case "variable":
        return this.variables.getById(expr.variableId)?.currentValue ?? null;
      case "dataSource":
        return this.dataSources.getLatest(expr.dataSourceId)?.value ?? null;
      case "triggerInput":
        return ctx.triggerInput[expr.field] ?? null;
      case "compare":
        return compare(expr.op, this.evaluate(expr.left, ctx), this.evaluate(expr.right, ctx));
      case "logical":
        return logical(
          expr.op,
          expr.operands.map((operand) => this.evaluate(operand, ctx)),
        );
      case "arithmetic":
        return arithmetic(expr.op, toNumber(this.evaluate(expr.left, ctx)), toNumber(this.evaluate(expr.right, ctx)));
    }
  }

  private guardBudget(state: RunState): void {
    if (state.iterations > MAX_ITERATIONS) {
      throw new ScriptBudgetExceededError(`Le script a dépassé la limite de ${MAX_ITERATIONS} itérations et a été arrêté.`);
    }
    if (Date.now() - state.startedAt > MAX_SCRIPT_MS) {
      throw new ScriptBudgetExceededError(`Le script a dépassé la limite de temps (${MAX_SCRIPT_MS / 1000}s) et a été arrêté.`);
    }
  }
}

function truthy(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value !== "" && value !== "false" && value !== "0";
  return Boolean(value);
}

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toScalar(value: unknown): string | number | boolean {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function compare(op: CompareOp, left: unknown, right: unknown): boolean {
  // Numeric comparison when both sides look numeric, otherwise a loose
  // equality/string comparison — mirrors how an operator would expect
  // "40" and 40 to compare equal when picked from different sources.
  const bothNumeric = isNumericLike(left) && isNumericLike(right);
  const l = bothNumeric ? toNumber(left) : left;
  const r = bothNumeric ? toNumber(right) : right;
  switch (op) {
    case "eq":
      return l === r;
    case "neq":
      return l !== r;
    case "gt":
      return toNumber(l) > toNumber(r);
    case "gte":
      return toNumber(l) >= toNumber(r);
    case "lt":
      return toNumber(l) < toNumber(r);
    case "lte":
      return toNumber(l) <= toNumber(r);
  }
}

function isNumericLike(value: unknown): boolean {
  if (typeof value === "number") return true;
  if (typeof value === "string" && value.trim() !== "") return Number.isFinite(Number(value));
  return false;
}

function logical(op: LogicalOp, operands: unknown[]): boolean {
  switch (op) {
    case "and":
      return operands.every(truthy);
    case "or":
      return operands.some(truthy);
    case "not":
      return !truthy(operands[0]);
  }
}

function arithmetic(op: ArithmeticOp, left: number, right: number): number {
  switch (op) {
    case "add":
      return left + right;
    case "sub":
      return left - right;
    case "mul":
      return left * right;
    case "div":
      return right === 0 ? 0 : left / right;
    case "mod":
      return right === 0 ? 0 : left % right;
  }
}
