import { createContext } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";

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

export function RouterOutlet() {
  const { currentPage, routes } = useRouter();
  const CurrentComponent = routes[currentPage];
  if (!CurrentComponent) return null;

  return <>{CurrentComponent}</>;
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
