import { updateDockActive } from './dock.js';

let currentPage = 'monitor';
const routes = {};

export function registerRoute(name, renderFn) {
  routes[name] = renderFn;
}

export function navigate(page) {
  if (!routes[page]) {
    console.error(`Route "${page}" not found`);
    return;
  }

  const app = document.getElementById('app');
  if (!app) return;

  const html = routes[page]();
  app.innerHTML = html;

  currentPage = page;
  updateDockActive(page);
  
  if (globalThis.onPageChange) {
    globalThis.onPageChange(page);
  }
}

export function getCurrentPage() {
  return currentPage;
}

export function initRouter() {
  const hash = globalThis.location.hash.slice(1) || 'monitor';
  globalThis.location.hash = hash;
  navigate(hash);
  
  globalThis.addEventListener('hashchange', () => {
    const hash = globalThis.location.hash.slice(1) || 'monitor';
    navigate(hash);
  });
}

