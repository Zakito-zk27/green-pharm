import "server-only";

// Local data store: one JSON file in `.data/` (git-ignored), created from the prototype
// data on first run. Every read goes to disk and every write is serialized and atomic,
// so the storefront, the admin and server actions always see the same data.
// When Supabase is connected, the functions in this folder keep their signatures and
// switch to database queries; the pages don't change.

import { promises as fs } from "node:fs";
import path from "node:path";
import { emptyDB } from "@/lib/defaults";
import type { DB } from "@/lib/types";

export const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "db.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

type Queue = { chain: Promise<unknown> };
const g = globalThis as typeof globalThis & { __gpQueue?: Queue };
const queue: Queue = (g.__gpQueue ??= { chain: Promise.resolve() });

async function load(): Promise<DB> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as DB;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    const db = emptyDB();
    await save(db);
    return db;
  }
}

async function save(db: DB) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = FILE + "." + process.pid + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(db));
  await fs.rename(tmp, FILE);
}

/** Read-only snapshot. */
export async function readDB(): Promise<DB> {
  await queue.chain.catch(() => {});
  return load();
}

/** Runs `fn` on the current data and saves the result; writes never overlap. */
export function writeDB<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = queue.chain
    .catch(() => {})
    .then(async () => {
      const db = await load();
      const result = await fn(db);
      await save(db);
      return result;
    });
  queue.chain = run;
  return run;
}
