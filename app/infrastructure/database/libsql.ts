import { createClient, type Client } from "@libsql/client";

const DEFAULT_LOCAL_DATABASE_URL = "file:app/generated/gakurin.db";

type DatabaseTarget = "local" | "turso";

export type DatabaseConfig = {
	authToken?: string;
	target: DatabaseTarget;
	url: string;
};

let client: Client | null = null;

function normalizeTarget(value: string | undefined): DatabaseTarget | null {
	if (value === "local" || value === "sqlite") {
		return "local";
	}
	if (value === "turso" || value === "remote") {
		return "turso";
	}
	return null;
}

function resolveDatabaseConfig(): DatabaseConfig {
	const explicitUrl = process.env.GAKURIN_DATABASE_URL;
	if (explicitUrl) {
		return {
			url: explicitUrl,
			authToken: process.env.GAKURIN_DATABASE_AUTH_TOKEN,
			target: explicitUrl.startsWith("file:") ? "local" : "turso",
		};
	}

	const target = normalizeTarget(process.env.GAKURIN_DATABASE_TARGET);
	const tursoUrl = process.env.TURSO_DATABASE_URL;
	if (
		target === "turso" ||
		(target !== "local" && process.env.VERCEL_ENV === "production" && tursoUrl)
	) {
		if (!tursoUrl) {
			throw new Error(
				"TURSO_DATABASE_URL is required when GAKURIN_DATABASE_TARGET=turso",
			);
		}
		return {
			url: tursoUrl,
			authToken: process.env.TURSO_AUTH_TOKEN,
			target: "turso",
		};
	}

	return {
		url: DEFAULT_LOCAL_DATABASE_URL,
		target: "local",
	};
}

export function getLibsqlDatabaseConfig(): DatabaseConfig {
	return resolveDatabaseConfig();
}

export function getLibsqlClient(): Client {
	if (!client) {
		const { authToken, url } = resolveDatabaseConfig();
		client = createClient(authToken ? { url, authToken } : { url });
	}
	return client;
}

export function closeLibsqlClientForScript() {
	client?.close();
	client = null;
}
