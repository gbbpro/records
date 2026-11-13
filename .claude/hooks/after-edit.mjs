// Runs after Claude edits a file. Cross-platform (Windows/macOS/Linux).
// Lints the edited file and runs the Vitest tests related to it.
// Exit code 2 sends the failure output back to Claude so it fixes the problem.
import { spawnSync } from "node:child_process";
import path from "node:path";

let input = "";
for await (const chunk of process.stdin) input += chunk;

let filePath;
try {
  filePath = JSON.parse(input)?.tool_input?.file_path;
} catch {
  process.exit(0);
}
if (!filePath) process.exit(0);

const norm = filePath.split(path.sep).join("/");
const ext = path.extname(norm);
if (![".ts", ".tsx", ".js", ".jsx", ".mjs"].includes(ext)) process.exit(0);
if (norm.includes("/.claude/") || norm.includes("/node_modules/")) process.exit(0);

const isWin = process.platform === "win32";
const run = (args) =>
  spawnSync(isWin ? "npx.cmd" : "npx", args, {
    encoding: "utf8",
    shell: isWin,
    cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
  });

const failures = [];

const lint = run(["eslint", "--max-warnings=0", filePath]);
if (lint.status !== 0) failures.push(`ESLint failed for ${filePath}:\n${lint.stdout}${lint.stderr}`);

// Playwright specs are slower; they run on demand and in CI, not after every edit.
if (!norm.includes("/e2e/")) {
  const tests = run(["vitest", "related", filePath, "--run", "--passWithNoTests"]);
  if (tests.status !== 0) failures.push(`Related tests failed:\n${tests.stdout}${tests.stderr}`);
}

if (failures.length) {
  process.stderr.write(failures.join("\n\n").slice(-8000));
  process.exit(2);
}
process.exit(0);
