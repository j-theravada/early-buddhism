import { createClient } from "@libsql/client";
import { access, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { getLibsqlDatabaseConfig } from "../app/infrastructure/database/libsql";
import {
	GENERATED_DATA_HASH_META_KEY,
	SEARCH_DATABASE_SCHEMA_VERSION,
	SEARCH_DATABASE_SCHEMA_VERSION_META_KEY,
	getGeneratedSearchDataFingerprint,
} from "./generated-data";

function shouldForceSeed(): boolean {
	const value = process.env.GAKURIN_FORCE_SEARCH_DATABASE_SEED;
	return value === "1" || value === "true";
}

function getLocalDatabasePath(databaseUrl: string): string | null {
	if (!databaseUrl.startsWith("file:")) {
		return null;
	}
	return resolve(process.cwd(), databaseUrl.slice("file:".length));
}

async function hasFreshLocalSearchDatabase(): Promise<boolean> {
	const config = getLibsqlDatabaseConfig();
	if (config.target !== "local") {
		return false;
	}

	const databasePath = getLocalDatabasePath(config.url);
	if (!databasePath) {
		return false;
	}

	try {
		await access(databasePath);
		const expectedHash = await getGeneratedSearchDataFingerprint();
		const db = createClient({ url: config.url });
		try {
			const result = await db.execute({
				sql: "SELECT key, value FROM search_database_meta WHERE key IN (?, ?)",
				args: [
					GENERATED_DATA_HASH_META_KEY,
					SEARCH_DATABASE_SCHEMA_VERSION_META_KEY,
				],
			});
			const meta = new Map(
				result.rows.flatMap((row) =>
					typeof row.key === "string" && typeof row.value === "string"
						? [[row.key, row.value]]
						: [],
				),
			);
			const isFresh =
				meta.get(GENERATED_DATA_HASH_META_KEY) === expectedHash &&
				meta.get(SEARCH_DATABASE_SCHEMA_VERSION_META_KEY) ===
					SEARCH_DATABASE_SCHEMA_VERSION;
			if (isFresh) {
				await db.execute("PRAGMA optimize");
				await db.execute("PRAGMA wal_checkpoint(TRUNCATE)");
			}
			return isFresh;
		} finally {
			db.close();
		}
	} catch {
		return false;
	} finally {
		await Promise.all([
			rm(`${databasePath}-shm`, { force: true }),
			rm(`${databasePath}-wal`, { force: true }),
		]);
	}
}

if (process.env.VERCEL_ENV === "production" && process.env.TURSO_DATABASE_URL) {
	console.log(
		"Skipping search database seed during Vercel Production build. Seed Turso separately with `bun run db:seed:turso`.",
	);
} else if (!shouldForceSeed() && (await hasFreshLocalSearchDatabase())) {
	console.log(
		"Using existing local search database for build. Run `bun run db:seed:local` to refresh.",
	);
} else {
	await import("./seed-search-database");
}

export {};
