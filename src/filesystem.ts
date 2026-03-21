import { StoragePool } from "~/src/types.ts";
import { AXIOM_DATA_DIR, METADATA_PATH, STORAGE_POOLS_PATH } from "./config.ts";

export async function saveStoragePools(pools: StoragePool[]): Promise<void> {
  await Deno.mkdir(AXIOM_DATA_DIR, { recursive: true });
  await Deno.writeTextFile(STORAGE_POOLS_PATH, JSON.stringify(pools));
}

export async function loadFileMetadata(): Promise<
  Record<string, { usage: string; fileType: string; uploadedAt: number }>
> {
  try {
    return JSON.parse(await Deno.readTextFile(METADATA_PATH));
  } catch {
    return {};
  }
}

export async function loadStoragePools(): Promise<StoragePool[]> {
  try {
    return JSON.parse(await Deno.readTextFile(STORAGE_POOLS_PATH));
  } catch {
    return [];
  }
}

export async function saveFileMetadata(
  filePath: string,
  meta: { usage: string; fileType: string; uploadedAt: number },
): Promise<void> {
  const all = await loadFileMetadata();
  all[filePath] = meta;
  await Deno.mkdir(AXIOM_DATA_DIR, { recursive: true });
  await Deno.writeTextFile(METADATA_PATH, JSON.stringify(all));
}
