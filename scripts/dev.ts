import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * backend/.env를 읽어서 자식 프로세스 환경에 주입.
 *
 * Bun의 .env auto-load는 cwd 기준이라, 자식 프로세스를 backend/apps/{api,worker}
 * cwd로 띄우면 backend/.env를 못 찾는다. 루트에서 한 번 읽어서 명시적으로 넘긴다.
 * (이미 process.env에 같은 키가 있으면 process.env를 우선해서, 셸에서 export한
 *  값이 .env 파일을 덮어쓰는 표준 동작을 유지.)
 */
function loadBackendEnv(): Record<string, string> {
  const envPath = resolve(root, "backend/.env");
  let raw: string;
  try {
    raw = readFileSync(envPath, "utf8");
  } catch {
    console.warn(`[dev] ${envPath} not found, skipping .env load`);
    return {};
  }
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const backendEnv = loadBackendEnv();

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
    env: { ...backendEnv, ...process.env },
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
