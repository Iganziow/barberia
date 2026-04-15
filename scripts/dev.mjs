#!/usr/bin/env node
// Lanzador de `next dev` que fija el CWD al directorio del proyecto
// antes de invocar Next. Esto soluciona el caso en que la herramienta
// que inicia el comando (ej. el MCP de preview) lo lanza con un CWD
// distinto al del proyecto, lo que provoca que webpack/Turbopack
// resuelvan módulos CSS desde el directorio padre
// (ej. C:\Users\ignac\Documents) y falle el @import "tailwindcss".

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");

process.chdir(projectRoot);

const args = ["next", "dev", ...process.argv.slice(2)];
const child = spawn("npx", args, {
  cwd: projectRoot,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, INIT_CWD: projectRoot },
});

child.on("exit", (code) => process.exit(code ?? 0));
