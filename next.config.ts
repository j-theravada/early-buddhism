import type { NextConfig } from "next";

const transcriptSearchDocuments =
	"./app/generated/transcript-search-documents.json";

const nextConfig: NextConfig = {
	reactCompiler: true,
	outputFileTracingIncludes: {
		// Next matches these globs as substrings; the negative extglob keeps the root route exact.
		"/talks!(/**)": [transcriptSearchDocuments],
		"/talks/page/[page]": [transcriptSearchDocuments],
	},
	async redirects() {
		return [
			{
				source: "/talks/page/1",
				destination: "/talks",
				permanent: true,
			},
		];
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
