/// <reference lib="deno.ns" />

if (!Deno.args.includes("--skip-upgrade")) {
  const denoUpgrade = new Deno.Command(Deno.execPath(), {
    args: ["upgrade"],
    stdout: "inherit",
    stderr: "inherit",
  });

  await denoUpgrade.output();

  const relaunch = new Deno.Command(Deno.execPath(), {
    args: ["run", "-P", "scripts/prod.ts", "--skip-upgrade"],
    stdout: "inherit",
    stderr: "inherit",
  });
  const relaunched = relaunch.spawn();
  await relaunched.status;
  Deno.exit(0);
}

const install = new Deno.Command(Deno.execPath(), {
  args: ["install"],
  stdout: "inherit",
  stderr: "inherit",
});

await install.output();

const viteBuild = new Deno.Command(Deno.execPath(), {
  args: ["task", "build:vite"],
  stdout: "inherit",
  stderr: "inherit",
});

await viteBuild.output();

const serverProcess = new Deno.Command(Deno.execPath(), {
  args: ["run", "-P", "src/main.ts"],
  stdout: "inherit",
  stderr: "inherit",
});

const vitePreviewProcess = new Deno.Command(Deno.execPath(), {
  args: ["task", "preview"],
  stdout: "inherit",
  stderr: "inherit",
});

const server = serverProcess.spawn();
const vitePreview = vitePreviewProcess.spawn();

await Promise.all([server.status, vitePreview.status]);
