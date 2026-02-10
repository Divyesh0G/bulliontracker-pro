import { spawn } from "node:child_process";

const processes = [];
const isWindows = process.platform === "win32";
const nodeCmd = process.execPath;

const start = (name, command, args) => {
  const child = spawn(command, args, {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      shutdown(code || 1);
    }
  });

  processes.push(child);
  return child;
};

const shutdown = (code = 0) => {
  for (const proc of processes) {
    if (!proc.killed) {
      proc.kill();
    }
  }
  process.exit(code);
};

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

start("api", nodeCmd, ["server/index.mjs"]);
if (isWindows) {
  start("vite", "cmd.exe", ["/c", "npm", "run", "dev"]);
} else {
  start("vite", "npm", ["run", "dev"]);
}
