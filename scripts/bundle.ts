/// <reference lib="deno.ns" />

async function findTsFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(dir)) {
    const fullPath = `${dir}/${entry.name}`;
    if (entry.isDirectory) {
      const subFiles = await findTsFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

async function bundleFile(tsPath: string): Promise<void> {
  const jsPath = tsPath.replace(/\.tsx?$/, ".js");

  try {
    const command = new Deno.Command(Deno.execPath(), {
      args: [
        "bundle",
        "--unstable-bundle",
        tsPath,
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await command.output();

    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr);
      console.error(`Error bundling ${tsPath}:`);
      console.error(errorText);
      return;
    }

    const bundledCode = new TextDecoder().decode(stdout);
    await Deno.writeTextFile(jsPath, bundledCode);
    console.log(`Bundled ${tsPath} -> ${jsPath}`);
  } catch (error) {
    console.error(`Error bundling ${tsPath}:`, error);
  }
}

async function bundleAll(): Promise<void> {
  console.log("Bundling frontend TypeScript files...");

  const tsFiles = await findTsFiles("public/js");

  for (const tsFile of tsFiles) {
    await bundleFile(tsFile);
  }

  console.log("Bundling complete!");
}

async function watchAndBundle(): Promise<void> {
  await bundleAll();

  console.log("Watching for changes...");

  const watcher = Deno.watchFs("public/js");
  for await (const event of watcher) {
    if (event.kind === "modify" || event.kind === "create") {
      const changedFiles = event.paths.filter((path) =>
        path.endsWith(".ts") || path.endsWith(".tsx")
      );
      if (changedFiles.length > 0) {
        console.log(`Detected changes in ${changedFiles.join(", ")}`);
        for (const file of changedFiles) {
          await bundleFile(file);
        }
        console.log("Rebundled changed files");
      }
    }
  }
}

async function main(): Promise<void> {
  const watch = Deno.args.includes("--watch");

  if (watch) {
    await watchAndBundle();
  } else {
    await bundleAll();
  }
}

if (import.meta.main) {
  await main();
}
