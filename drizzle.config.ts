import { defineConfig } from "drizzle-kit";
import { getLibsqlDatabaseConfig } from "./app/infrastructure/database/libsql";

const database = getLibsqlDatabaseConfig();

export default defineConfig({
	dialect: "turso",
	dbCredentials: {
		authToken: database.authToken,
		url: database.url,
	},
	out: "./drizzle",
	schema: "./app/infrastructure/database/schema.ts",
});
