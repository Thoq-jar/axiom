import { createContext } from "preact";
import { useContext, useEffect, useRef, useState } from "preact/hooks";

type RouteComponent = () => preact.ComponentChildren;

interface RouterContextType {
  currentPage: string;
  navigate: (page: string) => void;
  routes: Record<string, RouteComponent>;
  registerRoute: (name: string, component: RouteComponent) => void;
}

const RouterContext = createContext<RouterContextType | null>(null);

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter must be used within RouterProvider");
  }
  return context;
}

interface RouterProviderProps {
  children: preact.ComponentChildren;
  initialPage?: string;
  initialRoutes?: Record<string, RouteComponent>;
}

export function RouterProvider(
  { children, initialPage = "monitor", initialRoutes = {} }:
    RouterProviderProps,
) {
  const [currentPage, setCurrentPage] = useState<string>(initialPage);
  const [routes, setRoutes] = useState<Record<string, RouteComponent>>(
    initialRoutes,
  );

  const registerRoute = (name: string, component: RouteComponent) => {
    setRoutes((prev) => ({ ...prev, [name]: component }));
  };

  const navigate = (page: string) => {
    if (!routes[page]) {
      console.error(`Route "${page}" not found`);
      return;
    }
    globalThis.location.hash = page;
    setCurrentPage(page);
  };

  useEffect(() => {
    const hash = globalThis.location.hash.slice(1) || initialPage;
    globalThis.location.hash = hash;
    setCurrentPage(hash);

    const handleHashChange = () => {
      const hash = globalThis.location.hash.slice(1) || initialPage;
      setCurrentPage(hash);
    };

    globalThis.addEventListener("hashchange", handleHashChange);
    return () => {
      globalThis.removeEventListener("hashchange", handleHashChange);
    };
  }, [initialPage]);

  const value: RouterContextType = {
    currentPage,
    navigate,
    routes,
    registerRoute,
  };

  return (
    <RouterContext.Provider value={value}>
      {children}
    </RouterContext.Provider>
  );
}

const PAGE_ORDER = [
  "monitor",
  "cpu-details",
  "memory-details",
  "app-store",
  "about",
];

function animationsDisabled() {
  return document.body.classList.contains("no-animations");
}

export function RouterOutlet() {
  const { currentPage, routes } = useRouter();
  const [displayPage, setDisplayPage] = useState(currentPage);
  const [animClass, setAnimClass] = useState("page-enter-right");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (currentPage === displayPage) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const fromIdx = PAGE_ORDER.indexOf(displayPage);
    const toIdx = PAGE_ORDER.indexOf(currentPage);
    const forward = toIdx >= fromIdx;

    if (animationsDisabled()) {
      setDisplayPage(currentPage);
      setAnimClass(forward ? "page-enter-right" : "page-enter-left");
      return;
    }

    setAnimClass(forward ? "page-exit-left" : "page-exit-right");
    timerRef.current = setTimeout(() => {
      setDisplayPage(currentPage);
      setAnimClass(forward ? "page-enter-right" : "page-enter-left");
    }, 150);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentPage]);

  const CurrentComponent = routes[displayPage];
  if (!CurrentComponent) return null;

  return (
    <div class={animClass}>
      {CurrentComponent()}
    </div>
  );
}

export function getCurrentPage(): string {
  if (
    typeof globalThis !== "undefined" && globalThis.location &&
    globalThis.location.hash
  ) {
    const page = globalThis.location.hash.slice(1);
    return page || "monitor";
  }
  return "monitor";
}
