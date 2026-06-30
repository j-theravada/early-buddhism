import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactCompiler: true,
	outputFileTracingIncludes: {
		"/api/talk-search": ["./app/generated/transcript-search-documents.json"],
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
