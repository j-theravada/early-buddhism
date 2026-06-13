import type { ReactNode } from "react";
import Footer from "./footer";
import Header from "./header";

type LayoutProps = {
	title: string;
	lead?: string;
	children: ReactNode;
};

type SectionProps = {
	title?: string;
	children: ReactNode;
	className?: string;
};

export default function AboutPageLayout({
	title,
	lead,
	children,
}: LayoutProps) {
	return (
		<div className="min-h-screen bg-[#fcfbf9] text-[#303030]">
			<Header />
			<main>
				<section className="about-profile-bg about-title-bg px-5 pb-12 pt-20 sm:px-8 md:pb-16 md:pt-24 lg:pb-20 lg:pt-28">
					<div className="mx-auto flex min-h-[210px] max-w-[900px] flex-col items-center justify-center text-center md:min-h-[250px] lg:min-h-[280px]">
						<h1 className="font-display home-section-title inline-block text-2xl font-semibold text-[#303030] md:text-[32px]">
							{title}
						</h1>
						{lead ? (
							<p className="mx-auto mt-8 max-w-2xl text-[15px] leading-[2] text-[#303030] md:text-base">
								{lead}
							</p>
						) : null}
					</div>
				</section>

				<section className="px-5 py-14 sm:px-8 md:py-20 lg:py-24">
					<div className="mx-auto max-w-[900px] space-y-8 md:space-y-10">
						{children}
					</div>
				</section>
			</main>
			<Footer />
		</div>
	);
}

export function AboutTextSection({ title, children, className }: SectionProps) {
	const classes = [
		"rounded-lg bg-white/80 p-6 shadow-[0_20px_60px_rgba(48,48,48,0.05)] md:p-8",
		className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<section className={classes}>
			{title ? (
				<h2 className="font-serif-display mb-5 text-2xl font-semibold leading-relaxed text-[#303030] md:text-[30px]">
					{title}
				</h2>
			) : null}
			<div className="space-y-5 text-[15px] leading-[2] text-[#303030] md:text-base md:leading-[2.15]">
				{children}
			</div>
		</section>
	);
}

export function AboutQuote({ children }: { children: ReactNode }) {
	return (
		<blockquote className="font-serif-display rounded-lg bg-white/80 px-6 py-7 text-xl font-semibold leading-[1.9] text-[#303030] shadow-[0_20px_60px_rgba(48,48,48,0.05)] md:px-8 md:py-8 md:text-[26px]">
			{children}
		</blockquote>
	);
}
