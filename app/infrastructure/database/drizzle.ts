import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { getLibsqlClient } from "./libsql";
import * as schema from "./schema";

export type Database = LibSQLDatabase<typeof schema>;

let database: Database | null = null;

export function getDatabase(): Database {
	if (!database) {
		database = drizzle({ client: getLibsqlClient(), schema });
	}
	return database;
}
