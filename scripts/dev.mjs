import { spawn } from "node:child_process";

const DEFAULT_ENV = {
  PORTLESS_PORT: "1355",
  PORTLESS_HTTPS: "1",
  PORTLESS_LAN: "1",
};

export function buildDevCommand(args, env = process.env) {
  return {
    command: "portless",
    args: ["alexkafer", "next", "dev", ...args],
    env: {
      PORTLESS_PORT: env.PORTLESS_PORT ?? DEFAULT_ENV.PORTLESS_PORT,
      PORTLESS_HTTPS: env.PORTLESS_HTTPS ?? DEFAULT_ENV.PORTLESS_HTTPS,
      PORTLESS_LAN: env.PORTLESS_LAN ?? DEFAULT_ENV.PORTLESS_LAN,
    },
  };
}

function run(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      const reason = signal ? `signal ${signal}` : `exit code ${code}`;
      reject(new Error(`${command} failed with ${reason}`));
    });
  });
}

export async function main(args = process.argv.slice(2)) {
  await run(process.execPath, ["scripts/generate-build-info.mjs"]);

  const { command, args: portlessArgs, env } = buildDevCommand(args);
  await run(command, portlessArgs, env);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
