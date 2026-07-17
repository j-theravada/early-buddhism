import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
	buildTalkArchivePage,
	getTalkArchivePageCount,
} from "../../../application/talk/archive";
import { buildTalkGalleryItems } from "../../../application/talk/gallery";
import {
	buildTalkArchiveHref,
	buildTalkDetailHref,
} from "../../../application/talk/links";
import Footer from "../../../components/footer";
import Header from "../../../components/header";
import { getTalks } from "../../../infrastructure/talk/repository";
import { buildCanonicalUrl } from "../../../utils/seo";

type Props = { params: Promise<{ page: string }> };
export const dynamicParams = false;

function parsePage(value: string): number | null {
	const page = Number(value);
	return Number.isInteger(page) && page >= 1 ? page : null;
}

async function readArchivePage(value: string) {
	const page = parsePage(value);
	if (!page) return null;
	return buildTalkArchivePage(buildTalkGalleryItems(await getTalks()), page);
}

export async function generateStaticParams() {
	const totalPages = getTalkArchivePageCount((await getTalks()).length);
	return Array.from({ length: totalPages }, (_, index) => ({
		page: String(index + 1),
	}));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { page: value } = await params;
	const archive = await readArchivePage(value);
	if (!archive) return { title: "全法話一覧" };

	return {
		title: `全法話一覧 ${archive.page}ページ目`,
		description: `スマナサーラ長老の法話を収録日順に探せる全件一覧の${archive.page}ページ目です。`,
		alternates: {
			canonical: buildCanonicalUrl(buildTalkArchiveHref(archive.page)),
		},
	};
}

export default async function TalkArchivePage({ params }: Props) {
	const { page: value } = await params;
	const archive = await readArchivePage(value);
	if (!archive) notFound();

	const pages = Array.from(
		{ length: archive.totalPages },
		(_, index) => index + 1,
	);
	return (
		<div className="min-h-screen bg-white text-[#303030]">
			<Header />
			<main className="mx-auto max-w-4xl px-6 pb-20 pt-28 sm:px-8 lg:pt-36">
				<Link href="/talks" prefetch={false}>
					← 動画一覧へ戻る
				</Link>
				<h1 className="mt-8 text-3xl font-semibold">全法話一覧</h1>
				<p className="mt-3 text-sm text-gray-600">
					{archive.page} / {archive.totalPages}ページ
				</p>
				<ol className="mt-8 divide-y divide-gray-200 border-y border-gray-200">
					{archive.items.map((talk) => (
						<li data-talk-archive-item key={talk.id} className="py-4">
							<Link href={buildTalkDetailHref(talk.id)} prefetch={false}>
								<span className="block text-xs text-gray-500">
									{talk.recordedOnFormatted}
								</span>
								<span className="mt-1 block font-medium">{talk.title}</span>
							</Link>
						</li>
					))}
				</ol>
				<nav
					aria-label="全法話一覧のページ"
					className="mt-10 flex flex-wrap items-center justify-center gap-2"
				>
					{archive.previousPage && (
						<Link
							href={buildTalkArchiveHref(archive.previousPage)}
							prefetch={false}
						>
							← 前へ
						</Link>
					)}
					{pages.map((page) => (
						<Link
							aria-current={page === archive.page ? "page" : undefined}
							href={buildTalkArchiveHref(page)}
							key={page}
							prefetch={false}
						>
							{page}
						</Link>
					))}
					{archive.nextPage && (
						<Link
							href={buildTalkArchiveHref(archive.nextPage)}
							prefetch={false}
						>
							次へ →
						</Link>
					)}
				</nav>
			</main>
			<Footer maxWidth="4xl" />
		</div>
	);
}
