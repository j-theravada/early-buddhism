import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import {
	closeLibsqlClientForScript,
	getLibsqlClient,
	getLibsqlDatabaseConfig,
} from "../app/infrastructure/database/libsql";

if (process.env.VERCEL_ENV !== "production") {
	console.log("Skipping database migrations outside Vercel Production.");
} else {
	const config = getLibsqlDatabaseConfig();
	if (config.target !== "turso" || !config.authToken) {
		throw new Error(
			"Vercel Production database migrations require TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.",
		);
	}

	try {
		await migrate(drizzle({ client: getLibsqlClient() }), {
			migrationsFolder: "./drizzle",
		});
		console.log(
			"Applied pending Drizzle migrations to the production database.",
		);
	} finally {
		closeLibsqlClientForScript();
	}
}

export {};
