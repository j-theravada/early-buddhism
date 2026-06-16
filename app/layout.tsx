import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import ClientPageChrome from "./components/client-page-chrome";
import "./globals.css";

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
	display: "swap",
});

const siteUrl = "https://early-buddhism.j-theravada.com";
const clarityProjectId = "x7vb96xmqu";

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: { default: "初期仏教塾", template: "%s | 初期仏教塾" },
	description: "スマナサーラ長老の珠玉の法話で学ぶ。",
	icons: {
		icon: [{ url: "/jtba-mark.png", type: "image/png" }],
	},
	openGraph: {
		siteName: "初期仏教塾",
		locale: "ja_JP",
		type: "website",
	},
	twitter: {
		card: "summary",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const gaId = process.env.NEXT_PUBLIC_GA_ID;
	return (
		<html data-scroll-behavior="smooth" lang="ja">
			<body className={`${inter.variable} antialiased`}>
				<ClientPageChrome />
				{children}
				{gaId ? <GoogleAnalytics gaId={gaId} /> : null}
				<Script
					dangerouslySetInnerHTML={{
						__html: `
							(function(c,l,a,r,i,t,y){
								c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
								t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
								y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
							})(window, document, "clarity", "script", "${clarityProjectId}");
						`,
					}}
					id="microsoft-clarity"
					strategy="afterInteractive"
				/>
				<script
					// JSON-LD structured data
					dangerouslySetInnerHTML={{
						__html: JSON.stringify([
							{
								"@context": "https://schema.org",
								"@type": "WebSite",
								name: "初期仏教塾",
								url: siteUrl,
							},
							{
								"@context": "https://schema.org",
								"@type": "Organization",
								name: "初期仏教塾",
								url: siteUrl,
								logo: `${siteUrl}/jtba-mark.png`,
							},
						]),
					}}
					type="application/ld+json"
				/>
			</body>
		</html>
	);
}
