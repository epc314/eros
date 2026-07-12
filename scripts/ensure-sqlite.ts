import { closeSync, mkdirSync, openSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
if (!url.startsWith("file:")) process.exit(0);
const value = url.slice(5).split("?")[0];
const databasePath = isAbsolute(value) ? value : resolve(process.cwd(), "prisma", value);
mkdirSync(dirname(databasePath), { recursive: true });
closeSync(openSync(databasePath, "a"));
