// deno-lint-ignore no-explicit-any
type App = any;
type Route = {
  path?: string;
  pattern?: RegExp;
  method?: string;
  handler: (req: Request) => Promise<Response>;
};

interface StoragePool {
  poolId: string;
  poolName: string;
  poolColor: string;
  assignedDiskPaths: string[];
  dataCategories: string[];
  description: string;
}

interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string;
  created: string;
}

export { type App, type Container, type Route, type StoragePool };
