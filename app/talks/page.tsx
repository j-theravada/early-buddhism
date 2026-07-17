import type { Metadata } from "next";
import Link from "next/link";
import { getTalkArchivePageCount } from "../application/talk/archive";
import { buildTalkGalleryItems } from "../application/talk/gallery";
import { buildTalkArchiveHref } from "../application/talk/links";
import ClientHomeActions from "../components/client-home-actions";
import Footer from "../components/footer";
import Header from "../components/header";
import TalkGalleryLoader from "../components/talk-gallery-loader";
import { SUMANASARA_JA_NAME } from "../domain/teacher/sumanasara";
import type { TalkGalleryItem } from "../domain/talk/types";
import { getTalks } from "../infrastructure/talk/repository";
import { buildCanonicalUrl } from "../utils/seo";

const INITIAL_TALK_PREVIEW_COUNT = 6;

export const metadata: Metadata = {
	title: "動画一覧",
	description: `${SUMANASARA_JA_NAME}の法話動画を一覧で探せます。`,
	alternates: {
		canonical: buildCanonicalUrl("/talks"),
	},
};

export default async function TalksPage() {
	const talks = await getTalks();
	const initialTalks: TalkGalleryItem[] = buildTalkGalleryItems(talks).slice(
		0,
		INITIAL_TALK_PREVIEW_COUNT,
	);
	const archivePages = Array.from(
		{ length: getTalkArchivePageCount(talks.length) },
		(_, index) => index + 1,
	);

	return (
		<div className="min-h-screen flex flex-col bg-white text-[#303030]">
			<div className="flex-1">
				<Header />
				<main>
					<section
						className="home-gallery-bg min-h-screen px-5 pb-16 pt-28 sm:px-8 lg:pb-24 lg:pt-36"
						id="talks"
					>
						<div className="mx-auto max-w-7xl">
							<div className="mb-10 text-center">
								<h1 className="home-section-title font-display inline-block text-[28px] font-semibold leading-tight text-[#303030]">
									動画一覧
								</h1>
							</div>
							<TalkGalleryLoader initialTalks={initialTalks} />
							<div className="mt-10 text-center">
								<Link
									className="home-outline-button"
									href={buildTalkArchiveHref(1)}
									prefetch={false}
								>
									全法話をページ一覧で見る
								</Link>
								<nav
									aria-label="全法話一覧のページへ移動"
									className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm"
								>
									<span className="text-xs text-gray-500">ページ</span>
									{archivePages.map((page) => (
										<Link
											className="inline-flex min-w-8 items-center justify-center rounded-full border border-amber-200 px-2 py-1 text-amber-800 transition hover:border-amber-300 hover:bg-amber-50"
											href={buildTalkArchiveHref(page)}
											key={page}
											prefetch={false}
										>
											{page}
										</Link>
									))}
								</nav>
							</div>
						</div>
					</section>
				</main>
			</div>

			<ClientHomeActions />
			<Footer />
		</div>
	);
}
