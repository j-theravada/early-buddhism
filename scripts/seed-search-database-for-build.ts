if (process.env.VERCEL_ENV === "production" && process.env.TURSO_DATABASE_URL) {
	console.log(
		"Skipping search database seed during Vercel Production build. Seed Turso separately with `bun run db:seed:turso`.",
	);
} else {
	await import("./seed-search-database");
}
