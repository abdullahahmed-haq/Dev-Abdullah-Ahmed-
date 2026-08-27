import { watch } from "node:fs";
import { spawn } from "node:child_process";
import { relative, resolve, sep } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".vinext",
  ".wrangler",
  "coverage",
  "dist",
  "node_modules",
]);
const ignoredFiles = new Set([
  ".DS_Store",
  "next-env.d.ts",
  "tsconfig.tsbuildinfo",
]);
const debounceMilliseconds = 2_500;

let debounceTimer;
let deploymentRunning = false;
let deploymentQueued = false;
const changedFiles = new Set();

function shouldDeploy(filename) {
  if (!filename) return false;

  const normalized = filename.split(sep).join("/");
  const segments = normalized.split("/");
  return (
    !segments.some((segment) => ignoredDirectories.has(segment)) &&
    !ignoredFiles.has(segments.at(-1)) &&
    !normalized.endsWith(".log")
  );
}

function runDeployment() {
  if (deploymentRunning) {
    deploymentQueued = true;
    return;
  }

  deploymentRunning = true;
  deploymentQueued = false;
  const files = [...changedFiles].sort();
  changedFiles.clear();

  console.log(`\nChange detected in ${files.join(", ")}`);
  console.log("Building and deploying the latest stable file state...");

  const child = spawn(process.execPath, ["scripts/deploy-preview.mjs"], {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    deploymentRunning = false;
    if (code === 0) {
      console.log("Automatic deployment completed successfully.");
    } else {
      console.error(
        `Automatic deployment failed${
          signal ? ` with signal ${signal}` : ` with exit code ${code}`
        }. The previous online version remains active.`,
      );
    }

    if (deploymentQueued || changedFiles.size > 0) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runDeployment, debounceMilliseconds);
    }
  });
}

function scheduleDeployment(filename) {
  const projectPath = relative(projectRoot, resolve(projectRoot, filename));
  if (!shouldDeploy(projectPath)) return;

  changedFiles.add(projectPath);
  if (deploymentRunning) {
    deploymentQueued = true;
    return;
  }

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runDeployment, debounceMilliseconds);
}

const watcher = watch(projectRoot, { recursive: true }, (_, filename) => {
  scheduleDeployment(filename);
});

function shutdown(signal) {
  console.log(`\n${signal} received; stopping automatic deployment watcher.`);
  clearTimeout(debounceTimer);
  watcher.close();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

console.log(`Watching ${projectRoot}`);
console.log(
  "Every saved source change will be built, deployed, and smoke-tested automatically.",
);
