import { AXIOM_DOMAIN, PORT, PROD, TLS_CERT, TLS_KEY } from "~/src/config.ts";
import { routerHandler } from "~/src/router.ts";
import { hasTlsCerts } from "~/src/utils.ts";
import ROUTES from "~/src/routes.ts";

function handler(req: Request): Promise<Response> {
  return routerHandler(req, ROUTES);
}

export function startServer(port: number = PORT) {
  if (PROD && hasTlsCerts()) {
    const label = AXIOM_DOMAIN || "LAN";
    console.log(`Server running at https://${label}:${port}`);
    Deno.serve({
      port,
      cert: Deno.readTextFileSync(TLS_CERT),
      key: Deno.readTextFileSync(TLS_KEY),
    }, handler);
  } else {
    console.log(`Server running at http://localhost:${port}`);
    Deno.serve({ port }, handler);
  }
}
