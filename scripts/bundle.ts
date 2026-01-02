/// <reference lib="deno.ns" />

async function findTsFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(dir)) {
    const fullPath = `${dir}/${entry.name}`;
    if (entry.isDirectory) {
      const subFiles = await findTsFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

async function bundleFile(tsPath: string): Promise<void> {
  const jsPath = tsPath.replace(/\.ts$/, ".js");
  const outputDir = jsPath.substring(0, jsPath.lastIndexOf("/"));

  try {
    const result = await Deno.bundle({
      entrypoints: [tsPath],
      outputDir: outputDir,
      platform: "browser",
      minify: false,
    });

    console.log(result);

    if (result && typeof result === "object" && "outputs" in result) {
      const outputs =
        (result as { outputs?: Record<string, string> }).outputs || {};
      const outputFiles = Object.keys(outputs);
      if (outputFiles.length > 0) {
        const content = outputs[outputFiles[0]];
        await Deno.writeTextFile(jsPath, content);
        console.log(`Bundled ${tsPath} -> ${jsPath}`);
      }
    } else if (typeof result === "string") {
      await Deno.writeTextFile(jsPath, result);
      console.log(`Bundled ${tsPath} -> ${jsPath}`);
    }
  } catch (error) {
    console.error(`Error bundling ${tsPath}:`, error);
    throw error;
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
      const changedFiles = event.paths.filter((path) => path.endsWith(".ts"));
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
