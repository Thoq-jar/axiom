import { PUBLIC_DIR } from "~/src/config.ts";
import { getContentType } from "~/src/utils.ts";
import { Route } from "~/src/types.ts";

async function serveStaticFile(path: string): Promise<Response | null> {
  try {
    const filePath = `${PUBLIC_DIR}${path === "/" ? "/index.html" : path}`;
    const fileInfo = await Deno.stat(filePath).catch(() => null);

    if (!fileInfo || !fileInfo.isFile) {
      return null;
    }

    const file = await Deno.readFile(filePath);
    const contentType = getContentType(filePath);

    return new Response(file, {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return null;
  }
}

export async function routerHandler(
  req: Request,
  routes: Route[],
): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname.endsWith("/") && url.pathname.length > 1
    ? url.pathname.slice(0, -1)
    : url.pathname;

  for (const route of routes) {
    const pathMatch = route.pattern
      ? route.pattern.test(pathname)
      : pathname === route.path;
    if (pathMatch && (route.method || "GET") === req.method) {
      return route.handler(req);
    }
  }

  const staticResponse = await serveStaticFile(pathname);
  if (staticResponse) {
    return Promise.resolve(staticResponse);
  }

  return Promise.resolve(new Response("Not Found", { status: 404 }));
}
