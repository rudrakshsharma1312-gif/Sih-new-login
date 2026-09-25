// TanStack Start & Vite configuration with Tailwind CSS, tsConfigPaths, and SSR bundling.
// Additional custom configurations can be passed to defineConfig({ vite: { ... } }).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
