const PORT = 9598;
const PROD = Deno.env.get("AXIOM_PROD") === "1";
const AXIOM_DOMAIN = Deno.env.get("AXIOM_DOMAIN") ?? "";
const TLS_CERT = Deno.env.get("AXIOM_TLS_CERT") ?? "";
const TLS_KEY = Deno.env.get("AXIOM_TLS_KEY") ?? "";
const PUBLIC_DIR = PROD
  ? `${new URL("../dist", import.meta.url).pathname}`
  : `${new URL("../public", import.meta.url).pathname}`;

const AXIOM_DATA_DIR = `${Deno.env.get("HOME") ?? "/tmp"}/.axiom`;
const METADATA_PATH = `${AXIOM_DATA_DIR}/file-metadata.json`;
const STORAGE_POOLS_PATH = `${AXIOM_DATA_DIR}/storage-pools.json`;
const FILE_CATEGORIES_PATH = `${AXIOM_DATA_DIR}/file-categories.json`;

export {
  AXIOM_DATA_DIR,
  AXIOM_DOMAIN,
  FILE_CATEGORIES_PATH,
  METADATA_PATH,
  PORT,
  PROD,
  PUBLIC_DIR,
  STORAGE_POOLS_PATH,
  TLS_CERT,
  TLS_KEY,
};
