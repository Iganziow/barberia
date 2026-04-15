import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Fija la raíz de trazado al directorio del proyecto.
  // Sin esto, Next camina hacia arriba buscando node_modules y puede
  // elegir un node_modules huérfano (ej. C:\Users\ignac\Documents\node_modules)
  // como "monorepo root", lo que corrompe la resolución de módulos CSS
  // (@import "tailwindcss" falla en el dev server).
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
