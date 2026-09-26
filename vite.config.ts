// TanStack Start & Vite configuration with Tailwind CSS, tsConfigPaths, and SSR bundling.
// Additional custom configurations can be passed to defineConfig({ vite: { ... } }).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

function apiDevPlugin(): Plugin {
  return {
    name: "api-dev-middleware",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) {
          return next();
        }

        try {
          const { handleApiRequest } = await server.ssrLoadModule("/src/server/api-router.ts");
          const protocol = req.headers["x-forwarded-proto"] || "http";
          const host = req.headers.host || "localhost:3000";
          const fullUrl = `${protocol}://${host}${req.url}`;

          // Buffer request body if method has body
          let body: Buffer | undefined;
          if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method || "")) {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
            }
            if (chunks.length > 0) {
              body = Buffer.concat(chunks);
            }
          }

          const webReq = new Request(fullUrl, {
            method: req.method,
            headers: req.headers as HeadersInit,
            ...(body ? { body } : {}),
            // @ts-expect-error duplex required in node fetch
            duplex: "half",
          });

          const webRes: Response = await handleApiRequest(webReq);

          res.statusCode = webRes.status;
          webRes.headers.forEach((val, key) => {
            res.setHeader(key, val);
          });

          const resBody = await webRes.arrayBuffer();
          res.end(Buffer.from(resBody));
        } catch (err) {
          console.error("Vite dev API middleware error:", err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              success: false,
              error: "Internal server error",
              details: String(err),
            }),
          );
        }
      });
    },
  };
}

export default defineConfig({
  vite: {
    plugins: [apiDevPlugin()],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
