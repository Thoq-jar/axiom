import { updateDockActive } from "./dock.ts";

type RenderFunction = () => string;

let currentPage: string = "monitor";
const routes: Record<string, RenderFunction> = {};

export function registerRoute(name: string, renderFn: RenderFunction): void {
  routes[name] = renderFn;
}

export function navigate(page: string): void {
  if (!routes[page]) {
    console.error(`Route "${page}" not found`);
    return;
  }

  const app = document.getElementById("app");
  if (!app) return;

  const html = routes[page]();
  app.innerHTML = html;

  currentPage = page;
  updateDockActive(page);

  if ((globalThis as any).onPageChange) {
    (globalThis as any).onPageChange(page);
  }
}

export function getCurrentPage(): string {
  return currentPage;
}

export function initRouter(): void {
  const hash = globalThis.location.hash.slice(1) || "monitor";
  globalThis.location.hash = hash;
  navigate(hash);

  globalThis.addEventListener("hashchange", () => {
    const hash = globalThis.location.hash.slice(1) || "monitor";
    navigate(hash);
  });
}
