import Link from "next/link";
import Footer from "./footer";

type Props = {
	title: string;
	lead?: string;
	children: React.ReactNode;
};

export default function SimplePageLayout({ title, lead, children }: Props) {
	return (
		<div className="min-h-screen bg-white text-gray-900 flex flex-col">
			<header className="border-b border-amber-100 bg-amber-50/70">
				<div className="mx-auto max-w-4xl px-6 py-8 sm:px-8">
					<Link
						className="text-sm text-amber-800 transition hover:text-amber-900"
						href="/"
					>
						← トップへ戻る
					</Link>
					<div className="mt-4 space-y-2">
						<h1 className="text-xl font-semibold text-amber-900 sm:text-2xl">
							{title}
						</h1>
						{lead ? (
							<p className="text-sm leading-relaxed text-amber-900/80">
								{lead}
							</p>
						) : null}
					</div>
				</div>
			</header>

			<main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 sm:px-8">
				<div className="space-y-6">{children}</div>
			</main>

			<Footer maxWidth="4xl" />
		</div>
	);
}
