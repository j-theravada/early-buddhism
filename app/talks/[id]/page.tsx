import { ExternalLink, Youtube } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
	buildTalkDetailPageData,
	buildTalkMetadata,
} from "../../application/talk/detail";
import {
	buildTalksHref,
	getFirstSearchParam,
	getSearchParamValues,
	parseTalkDetailGalleryPage,
	parseTranscriptCueIndex,
	TALK_DETAIL_GALLERY_COLLECTION_PARAM,
	TALK_DETAIL_GALLERY_PAGE_PARAM,
	TALK_DETAIL_GALLERY_QUERY_PARAM,
	TALK_DETAIL_GALLERY_SERIES_PARAM,
	TALK_DETAIL_GALLERY_SEARCH_FIELDS_PARAM,
	TALK_DETAIL_TRANSCRIPT_CUE_PARAM,
	TALK_DETAIL_TRANSCRIPT_QUERY_PARAM,
} from "../../application/talk/links";
import { buildTranscriptParagraphs } from "../../application/transcript/presentation";
import BackToGalleryLink from "../../components/back-to-gallery-link";
import ContentCard from "../../components/content-card";
import Footer from "../../components/footer";
import TalkDetailPlayer from "../../components/talk-detail-player";
import TranscriptReadable from "../../components/transcript-readable";
import TranscriptSectionLoader from "../../components/transcript-section-loader";
import {
	parseContentCollectionId,
	parseContentSeriesId,
} from "../../domain/content/collection";
import { getTalkById } from "../../infrastructure/talk/repository";
import { getTranscriptByTalkId } from "../../infrastructure/transcript/repository";

type TalkDetailSearchParamName =
	| typeof TALK_DETAIL_GALLERY_QUERY_PARAM
	| typeof TALK_DETAIL_GALLERY_COLLECTION_PARAM
	| typeof TALK_DETAIL_GALLERY_SERIES_PARAM
	| typeof TALK_DETAIL_GALLERY_SEARCH_FIELDS_PARAM
	| typeof TALK_DETAIL_GALLERY_PAGE_PARAM
	| typeof TALK_DETAIL_TRANSCRIPT_QUERY_PARAM
	| typeof TALK_DETAIL_TRANSCRIPT_CUE_PARAM;

type TalkDetailSearchParams = Partial<
	Record<TalkDetailSearchParamName, string | string[]>
>;

type Props = {
	params: Promise<{ id: string }>;
	searchParams?: Promise<TalkDetailSearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { id } = await params;
	const talk = await getTalkById(id);

	if (!talk) {
		return {
			title: "トークが見つかりません",
		};
	}

	const metadataData = buildTalkMetadata(talk);

	return {
		title: metadataData.title,
		description: metadataData.description,
		alternates: {
			canonical: metadataData.canonicalUrl,
		},
		openGraph: {
			title: metadataData.title,
			description: metadataData.description,
			type: "article",
			url: metadataData.canonicalUrl,
			...(metadataData.thumbnailUrl && {
				images: [{ url: metadataData.thumbnailUrl, width: 480, height: 360 }],
			}),
		},
		twitter: {
			card: metadataData.thumbnailUrl ? "summary_large_image" : "summary",
			title: metadataData.title,
			description: metadataData.description,
			...(metadataData.thumbnailUrl && { images: [metadataData.thumbnailUrl] }),
		},
	};
}

export default async function TalkDetailPage({ params, searchParams }: Props) {
	const { id } = await params;
	const resolvedSearchParams = await searchParams;
	const transcriptHighlightQuery = getFirstSearchParam(
		resolvedSearchParams?.[TALK_DETAIL_TRANSCRIPT_QUERY_PARAM],
	);
	const galleryQuery =
		getFirstSearchParam(
			resolvedSearchParams?.[TALK_DETAIL_GALLERY_QUERY_PARAM],
		) || transcriptHighlightQuery;
	const galleryCollectionId = getFirstSearchParam(
		resolvedSearchParams?.[TALK_DETAIL_GALLERY_COLLECTION_PARAM],
	);
	const gallerySeriesId = getFirstSearchParam(
		resolvedSearchParams?.[TALK_DETAIL_GALLERY_SERIES_PARAM],
	);
	const gallerySearchFields = getSearchParamValues(
		resolvedSearchParams?.[TALK_DETAIL_GALLERY_SEARCH_FIELDS_PARAM],
	);
	const galleryPage = parseTalkDetailGalleryPage(
		getFirstSearchParam(resolvedSearchParams?.[TALK_DETAIL_GALLERY_PAGE_PARAM]),
	);
	const galleryHref = buildTalksHref({
		page: galleryPage,
		query: galleryQuery,
		collectionId: parseContentCollectionId(galleryCollectionId),
		seriesId: parseContentSeriesId(gallerySeriesId),
		searchFields: gallerySearchFields,
	});
	const targetCueIndex = parseTranscriptCueIndex(
		getFirstSearchParam(
			resolvedSearchParams?.[TALK_DETAIL_TRANSCRIPT_CUE_PARAM],
		),
	);

	const [talk, transcript] = await Promise.all([
		getTalkById(id),
		getTranscriptByTalkId(id),
	]);

	if (!talk) {
		notFound();
	}

	const transcriptParagraphs = transcript
		? buildTranscriptParagraphs(transcript)
		: [];
	const pageData = buildTalkDetailPageData(talk);

	return (
		<div className="min-h-screen bg-white text-gray-900 flex flex-col">
			<header className="bg-amber-50 px-6 py-8 sm:px-8">
				<div className="mx-auto max-w-4xl">
					<BackToGalleryLink
						className="text-sm text-slate-600 hover:text-slate-800 transition"
						href={galleryHref}
					>
						← トークギャラリーに戻る
					</BackToGalleryLink>
				</div>
			</header>

			<main className="w-full mx-auto max-w-4xl px-6 py-12 sm:px-8 flex-1">
				<div className="mb-8 space-y-3">
					<p className="text-sm font-medium text-amber-700">
						{pageData.talk.seriesLabel
							? `${pageData.talk.collectionLabel} / ${pageData.talk.seriesLabel}`
							: pageData.talk.collectionLabel}
					</p>
					<h1 className="text-2xl font-semibold leading-relaxed text-gray-950 sm:text-3xl">
						{pageData.talk.title}
					</h1>
				</div>

				<TalkDetailPlayer
					embedUrl={pageData.talk.embedUrl}
					talkId={talk.id}
					thumbnailUrl={pageData.talk.thumbnailUrl}
					title={pageData.talk.title}
				>
					{/* データ情報 */}
					<ContentCard as="div">
						<dl className="space-y-4 text-sm">
							{pageData.detailRows.map((row, index) => {
								const isLast = index === pageData.detailRows.length - 1;
								return (
									<div
										className={`flex justify-between gap-4 ${isLast ? "" : "border-b border-gray-100 pb-4"}`}
										key={row.label}
									>
										<dt className="font-medium text-gray-700">{row.label}</dt>
										<dd className="text-right text-gray-600">{row.value}</dd>
									</div>
								);
							})}
						</dl>

						{pageData.talk.description && (
							<div className="mt-6 pt-6 border-t border-gray-100">
								<p className="text-sm leading-relaxed text-gray-700">
									{pageData.talk.description}
								</p>
							</div>
						)}

						{pageData.resourceLinks.length > 0 && (
							<div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap gap-3">
								{pageData.resourceLinks.map((link) => (
									<a
										className={link.className}
										href={link.href}
										key={link.label}
										rel="noopener noreferrer"
										target="_blank"
									>
										{link.label}
										<span aria-hidden>↗</span>
									</a>
								))}
							</div>
						)}

						{transcriptParagraphs.length > 0 && (
							<TranscriptSectionLoader
								embedUrlPrefix={pageData.embedUrlPrefix}
								hasStickyPlayer={Boolean(pageData.talk.embedUrl)}
								key={talk.id}
								talkId={talk.id}
								targetCueIndex={targetCueIndex}
								transcriptHighlightQuery={transcriptHighlightQuery}
							>
								<TranscriptReadable paragraphs={transcriptParagraphs} />
							</TranscriptSectionLoader>
						)}
						{pageData.talk.youtubeUrl && (
							<div className="mt-6 pt-6 border-t border-gray-100 flex justify-end">
								<a
									className="inline-flex items-center gap-2 rounded-full border border-red-500 bg-white px-6 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700"
									href={pageData.talk.youtubeUrl}
									rel="noopener noreferrer"
									target="_blank"
								>
									<Youtube className="h-5 w-5" />
									<span>YouTube</span>
									<ExternalLink className="h-4 w-4" />
								</a>
							</div>
						)}
					</ContentCard>
				</TalkDetailPlayer>
			</main>

			<Footer maxWidth="4xl" />

			<script
				// JSON-LD structured data
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(pageData.breadcrumbJsonLd),
				}}
				type="application/ld+json"
			/>

			{pageData.videoJsonLd && (
				<script
					// JSON-LD structured data
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(pageData.videoJsonLd),
					}}
					type="application/ld+json"
				/>
			)}
		</div>
	);
}
