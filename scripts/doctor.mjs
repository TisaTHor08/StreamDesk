#!/usr/bin/env node
// Quick environment sanity check: Node version, pnpm availability, and
// architecture — run with `node scripts/doctor.mjs` before your first
// `pnpm install` if something seems off.

const REQUIRED_NODE_MAJOR = 20;

function check(label, ok, detail) {
  console.log(`${ok ? "OK  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

let allOk = true;

const [major] = process.versions.node.split(".").map(Number);
allOk = check("Node.js >= 20", major >= REQUIRED_NODE_MAJOR, `found ${process.version}`) && allOk;

allOk = check(
  "Architecture recognized",
  ["x64", "arm64"].includes(process.arch),
  `${process.platform}/${process.arch}`,
) && allOk;

try {
  const { execSync } = await import("node:child_process");
  const pnpmVersion = execSync("pnpm -v", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  check("pnpm available", true, `v${pnpmVersion}`);
} catch {
  check("pnpm available", false, "run: corepack enable && corepack prepare pnpm@9.7.0 --activate");
  allOk = false;
}

console.log("");
console.log(allOk ? "Environment looks ready for `pnpm install && pnpm build`." : "Fix the FAIL lines above, then re-run this script.");
process.exit(allOk ? 0 : 1);
