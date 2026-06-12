import { ExternalLink, Youtube } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
	buildTalkDetailPageData,
	buildTalkMetadata,
} from "../../application/talk/detail";
import BackToGalleryLink from "../../components/back-to-gallery-link";
import ContentCard from "../../components/content-card";
import Footer from "../../components/footer";
import TranscriptSection from "../../components/transcript-section";
import { getTalkById } from "../../infrastructure/talk/repository";
import { getTranscriptByTalkId } from "../../infrastructure/transcript/repository";

type Props = {
	params: Promise<{ id: string }>;
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
		openGraph: {
			title: metadataData.title,
			description: metadataData.description,
			type: "article",
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

export default async function TalkDetailPage({ params }: Props) {
	const { id } = await params;

	const talk = await getTalkById(id);

	if (!talk) {
		notFound();
	}

	const pageData = buildTalkDetailPageData(talk);
	const transcript = await getTranscriptByTalkId(talk.id);

	return (
		<div className="min-h-screen bg-white text-gray-900 flex flex-col">
			<header className="bg-amber-50 px-6 py-8 sm:px-8">
				<div className="mx-auto max-w-4xl">
					<BackToGalleryLink className="text-sm text-slate-600 hover:text-slate-800 transition">
						← トークギャラリーに戻る
					</BackToGalleryLink>
				</div>
			</header>

			<main className="w-full mx-auto max-w-4xl px-6 py-12 sm:px-8 flex-1">
				<div className="space-y-8">
					{/* YouTube動画埋め込み */}
					{pageData.talk.embedUrl && (
						<div className="sticky top-0 z-20 -mx-6 bg-white/95 px-6 py-3 backdrop-blur sm:-mx-8 sm:px-8">
							<div className="relative w-full aspect-video bg-gray-100 overflow-hidden rounded-lg shadow-sm">
								<iframe
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
									allowFullScreen
									className="absolute inset-0 h-full w-full"
									name="talk-player"
									src={pageData.talk.embedUrl}
									title={pageData.talk.title}
								/>
							</div>
						</div>
					)}

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

						{transcript && transcript.length > 0 && (
							<TranscriptSection
								embedUrlPrefix={pageData.embedUrlPrefix}
								transcript={transcript}
							/>
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
				</div>
			</main>

			<Footer maxWidth="4xl" />

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
