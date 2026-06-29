import type { NextConfig } from "next";

const shouldTraceLocalSearchDatabase = !(
	process.env.VERCEL_ENV === "production" && process.env.TURSO_DATABASE_URL
);

const nextConfig: NextConfig = {
	reactCompiler: true,
	outputFileTracingIncludes: shouldTraceLocalSearchDatabase
		? {
				"/api/talk-search": ["./app/generated/gakurin.db"],
			}
		: {},
	outputFileTracingExcludes: {
		"/api/talk-search": [
			"./app/generated/gakurin.db-shm",
			"./app/generated/gakurin.db-wal",
		],
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "img.youtube.com",
			},
		],
	},
	compiler: {
		// モダンなJavaScript機能を保持（レガシーポリフィルを削減）
		removeConsole:
			process.env.NODE_ENV === "production"
				? {
						exclude: ["error", "warn"],
					}
				: false,
	},
};

export default nextConfig;
