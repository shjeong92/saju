import { spawn, type ChildProcess } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

type Service = {
  name: string;
  cwd: string;
  command: string;
  args: string[];
  color: string;
};

const services: Service[] = [
  {
    name: "api",
    cwd: resolve(root, "backend/apps/api"),
    command: "bun",
    args: ["run", "--hot", "src/index.ts"],
    color: "\x1b[36m",
  },
  {
    name: "worker",
    cwd: resolve(root, "backend/apps/worker"),
    command: "bun",
    args: ["run", "--hot", "src/index.ts"],
    color: "\x1b[33m",
  },
  {
    name: "web",
    cwd: resolve(root, "frontend"),
    command: "bun",
    args: ["run", "dev"],
    color: "\x1b[35m",
  },
];

const reset = "\x1b[0m";
const children: ChildProcess[] = [];

function prefixStream(stream: NodeJS.ReadableStream, name: string, color: string) {
  let buffer = "";
  stream.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      process.stdout.write(`${color}[${name}]${reset} ${line}\n`);
    }
  });
  stream.on("end", () => {
    if (buffer.length > 0) {
      process.stdout.write(`${color}[${name}]${reset} ${buffer}\n`);
    }
  });
}

function shutdown(code: number) {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

for (const service of services) {
  const child = spawn(service.command, service.args, {
    cwd: service.cwd,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);
  if (child.stdout) prefixStream(child.stdout, service.name, service.color);
  if (child.stderr) prefixStream(child.stderr, service.name, service.color);
  child.on("exit", (code) => {
    process.stdout.write(`${service.color}[${service.name}]${reset} exited with code ${code}\n`);
    shutdown(code ?? 1);
  });
}

console.log("starting api (4000), worker, web (3100). ctrl+c to stop.");
