// Build estático (SPA): o resultado em dist/ é servido pelo nginx da EC2 a
// partir do S3 (scripts/publicar_site.* no repositório Infra). A URL da API e
// a configuração do login vêm de /config.json, gerado pelo Terraform, então o
// mesmo build serve em qualquer ambiente.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: { port: 8080, host: true },
  preview: { port: 8080 },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
});
