import { spawn } from "node:child_process";

const PREVIEW_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_ORIGIN ??
  "https://my-profile-next-preview.odd-andesaurus.workers.dev";

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: options.env ?? process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} failed${
            signal ? ` with signal ${signal}` : ` with exit code ${code}`
          }`,
        ),
      );
    });
  });
}

async function fetchWithRetry(path, attempts = 8) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(new URL(path, PREVIEW_ORIGIN), {
        redirect: "manual",
      });

      if (response.status >= 500) {
        throw new Error(`received HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }

  throw lastError;
}

async function verifyDeployment() {
  const localizedHome = await fetchWithRetry("/en");
  if (localizedHome.status !== 200) {
    throw new Error(`/en returned HTTP ${localizedHome.status}`);
  }

  const contentSecurityPolicy =
    localizedHome.headers.get("content-security-policy") ?? "";
  if (!contentSecurityPolicy || contentSecurityPolicy.includes("'unsafe-eval'")) {
    throw new Error("production CSP is missing or contains unsafe-eval");
  }

  const robots = await fetchWithRetry("/robots.txt");
  const robotsBody = await robots.text();
  if (robots.status !== 200 || !robotsBody.includes(PREVIEW_ORIGIN)) {
    throw new Error("robots.txt does not reference the deployed public origin");
  }
}

async function main() {
  console.log(`Building preview for ${PREVIEW_ORIGIN}`);
  await run("npm", ["run", "build:vinext"], {
    env: {
      ...process.env,
      NEXT_PUBLIC_SITE_ORIGIN: PREVIEW_ORIGIN,
    },
  });

  const deployArgs = [
    "wrangler",
    "deploy",
    "--config",
    "wrangler.preview.jsonc",
  ];

  console.log("Deploying with authenticated Cloudflare credentials");
  await run("npx", deployArgs);
  await verifyDeployment();
  console.log(`Deployment verified: ${PREVIEW_ORIGIN}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
