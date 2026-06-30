import type { Metadata } from "next";
import Link from "next/link";
import Footer from "./components/footer";
import Header from "./components/header";
import { FEEDBACK_FORM_URL } from "./utils/site-links";

export const metadata: Metadata = {
	title: "ページが見つかりません",
	description:
		"初期仏教塾のページが見つからない場合は、動画一覧から法話を検索できます。",
};

export default function NotFound() {
	return (
		<div className="min-h-screen bg-white text-[#303030]">
			<Header />
			<main className="home-gallery-bg px-5 pb-20 pt-32 sm:px-8 lg:pt-40">
				<section className="mx-auto max-w-3xl rounded-lg border border-[#d6c6ad] bg-white p-8 text-center shadow-sm sm:p-12">
					<p className="text-sm font-semibold text-[#9d7e4c]">404</p>
					<h1 className="mt-3 font-display text-2xl font-semibold leading-tight sm:text-3xl">
						ページが見つかりませんでした
					</h1>
					<p className="mt-4 text-sm leading-7 text-[#666]">
						URLが変わったか、現在は公開されていないページです。法話をお探しの場合は動画一覧から検索できます。
					</p>
					<div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
						<Link className="home-outline-button" href="/talks">
							動画一覧で探す
						</Link>
						<Link className="home-outline-button" href="/">
							トップへ戻る
						</Link>
					</div>
					<a
						className="mt-6 inline-block text-sm font-medium text-[#6e522b] underline-offset-4 hover:text-[#9d7e4c] hover:underline"
						href={FEEDBACK_FORM_URL}
						rel="noopener noreferrer"
						target="_blank"
					>
						リンク切れを報告する
					</a>
				</section>
			</main>
			<Footer />
		</div>
	);
}
