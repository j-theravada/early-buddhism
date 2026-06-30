import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import ClientPageChrome from "./components/client-page-chrome";
import { SUMANASARA_JA_NAME } from "./domain/teacher/sumanasara";
import { SITE_NAME, SITE_URL } from "./utils/seo";
import "./globals.css";

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
	display: "swap",
});

const clarityProjectId = "x7vb96xmqu";

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
	description: `${SUMANASARA_JA_NAME}の珠玉の法話で学ぶ。`,
	icons: {
		icon: [{ url: "/jtba-mark.png", type: "image/png" }],
	},
	openGraph: {
		siteName: SITE_NAME,
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
				{gaId ? (
					<>
						<Script
							src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
							strategy="lazyOnload"
						/>
						<Script
							dangerouslySetInnerHTML={{
								__html: `
									window.dataLayer = window.dataLayer || [];
									function gtag(){dataLayer.push(arguments);}
									gtag('js', new Date());
									gtag('config', '${gaId}');
								`,
							}}
							id="google-analytics"
							strategy="lazyOnload"
						/>
					</>
				) : null}
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
					strategy="lazyOnload"
				/>
				<script
					// JSON-LD structured data
					dangerouslySetInnerHTML={{
						__html: JSON.stringify([
							{
								"@context": "https://schema.org",
								"@type": "WebSite",
								name: SITE_NAME,
								url: SITE_URL,
							},
							{
								"@context": "https://schema.org",
								"@type": "Organization",
								name: SITE_NAME,
								url: SITE_URL,
								logo: `${SITE_URL}/jtba-mark.png`,
							},
						]),
					}}
					type="application/ld+json"
				/>
			</body>
		</html>
	);
}
