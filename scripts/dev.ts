/// <reference lib="deno.ns" />

const initialBuild = new Deno.Command(Deno.execPath(), {
  args: ["run", "-A", "--unstable-bundle", "scripts/bundle.ts"],
  stdout: "inherit",
  stderr: "inherit",
});

await initialBuild.output();

const bundleProcess = new Deno.Command(Deno.execPath(), {
  args: ["run", "-A", "--unstable-bundle", "scripts/bundle.ts", "--watch"],
  stdout: "inherit",
  stderr: "inherit",
});

const serverProcess = new Deno.Command(Deno.execPath(), {
  args: ["run", "-P", "--watch", "src/main.ts"],
  stdout: "inherit",
  stderr: "inherit",
});

const bundle = bundleProcess.spawn();
const server = serverProcess.spawn();

await Promise.all([bundle.status, server.status]);
