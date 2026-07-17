import {
	getPrimaryTalkMediaUrl,
	getTalkTitle,
} from "../../domain/talk/display";
import { normalizeSumanasaraJapaneseName } from "../../domain/teacher/sumanasara";
import type { Talk } from "../../domain/talk/types";
import { formatJapaneseDate } from "../../utils/date";
import { toIsoDuration } from "../../utils/duration";
import { buildCanonicalUrl, SITE_NAME } from "../../utils/seo";
import { extractYouTubeVideoId } from "../../utils/youtube";
import {
	buildPublisherReference,
	type PublisherReference,
} from "../seo/site-identity";
import { buildTalkDetailHref } from "./links";

export type TalkDetailRow = {
	label: string;
	value: string;
};

export type TalkResourceLink = {
	label: string;
	href: string;
	className: string;
};

export type TalkMetadataData = {
	title: string;
	description: string;
	canonicalUrl: string;
	thumbnailUrl?: string;
};

export type BreadcrumbJsonLd = {
	"@context": string;
	"@type": string;
	itemListElement: Array<{
		"@type": string;
		position: number;
		name: string;
		item: string;
	}>;
};

export type TalkDetailPageData = {
	talk: {
		id: string;
		dvdId: string;
		collectionLabel: string;
		seriesLabel: string;
		title: string;
		description: string;
		event: string;
		venue: string;
		speaker: string;
		duration: string;
		language: string;
		recordedOn: string;
		youtubeUrl: string | null;
		embedUrl: string | null;
		thumbnailUrl: string | null;
		attachmentsLink: string | null;
		slideLinks: string[];
	};
	detailRows: TalkDetailRow[];
	resourceLinks: TalkResourceLink[];
	embedUrlPrefix: string | null;
	videoJsonLd: {
		"@context": string;
		"@type": string;
		name: string;
		description: string;
		thumbnailUrl: string;
		uploadDate?: string;
		contentUrl: string;
		embedUrl: string;
		duration?: string | null;
		publisher: PublisherReference;
	} | null;
	breadcrumbJsonLd: BreadcrumbJsonLd;
};

const SLIDE_LINK_CLASS_NAME =
	"inline-flex items-center gap-2 rounded-full bg-amber-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-amber-700";
const ATTACHMENT_LINK_CLASS_NAME =
	"inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700";
const MAX_META_DESCRIPTION_LENGTH = 120;

function normalizeDescriptionText(text: string): string {
	return text
		.replace(/\r\n/g, " ")
		.replace(/\n/g, " ")
		.replace(/\r/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function truncateDescription(text: string): string {
	const normalizedText = normalizeDescriptionText(text);
	if (normalizedText.length <= MAX_META_DESCRIPTION_LENGTH) {
		return normalizedText;
	}
	return `${normalizedText.slice(0, MAX_META_DESCRIPTION_LENGTH - 1)}…`;
}

function buildGeneratedTalkDescription(talk: Talk): string {
	const title = getTalkTitle(talk);
	const speaker = talk.speaker
		? normalizeSumanasaraJapaneseName(talk.speaker)
		: "スマナサーラ長老";
	const recordedOn = talk.recordedOnDate
		? `${formatJapaneseDate(talk.recordedOnDate, talk.recordedOn)}収録の`
		: "";
	const themeLabel = talk.seriesLabel || talk.collectionLabel || "初期仏教";
	const mediaLabel = talk.srtLink ? "動画と文字起こし" : "動画";

	return `${title}。${speaker}による${recordedOn}${themeLabel}の法話を${mediaLabel}で学べます。`;
}

function getTalkDescription(talk: Talk): string {
	const title = normalizeDescriptionText(getTalkTitle(talk));
	const description = normalizeDescriptionText(talk.description);

	if (description && description !== title) {
		return truncateDescription(description);
	}

	return truncateDescription(buildGeneratedTalkDescription(talk));
}

function formatStructuredDataDate(date: Date | null): string | null {
	return date ? date.toISOString().slice(0, 10) : null;
}

function buildTalkBreadcrumbJsonLd(talk: Talk): BreadcrumbJsonLd {
	const detailUrl = buildCanonicalUrl(buildTalkDetailHref(talk.id));

	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: [
			{
				"@type": "ListItem",
				position: 1,
				name: SITE_NAME,
				item: buildCanonicalUrl("/"),
			},
			{
				"@type": "ListItem",
				position: 2,
				name: "動画一覧",
				item: buildCanonicalUrl("/talks"),
			},
			{
				"@type": "ListItem",
				position: 3,
				name: getTalkTitle(talk),
				item: detailUrl,
			},
		],
	};
}

export function buildTalkMetadata(talk: Talk): TalkMetadataData {
	const title = getTalkTitle(talk);
	const description = getTalkDescription(talk);
	const youtubeUrl = getPrimaryTalkMediaUrl(talk);
	const videoId = youtubeUrl ? extractYouTubeVideoId(youtubeUrl) : null;

	return {
		title,
		description,
		canonicalUrl: buildCanonicalUrl(buildTalkDetailHref(talk.id)),
		...(videoId && {
			thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
		}),
	};
}

export function buildTalkDetailPageData(talk: Talk): TalkDetailPageData {
	const youtubeUrl = getPrimaryTalkMediaUrl(talk);
	const videoId = youtubeUrl ? extractYouTubeVideoId(youtubeUrl) : null;
	const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null;
	const recordedOnRaw = talk.recordedOn || "日付不明";
	const structuredDataDate = formatStructuredDataDate(talk.recordedOnDate);

	const talkData = {
		id: talk.id,
		dvdId: talk.dvdId,
		collectionLabel: talk.collectionLabel,
		seriesLabel: talk.seriesLabel,
		title: getTalkTitle(talk),
		description: talk.description,
		event: talk.event || "未分類",
		venue: talk.venue || "—",
		speaker: normalizeSumanasaraJapaneseName(talk.speaker || "—"),
		duration: talk.duration || "—",
		language: talk.language || "—",
		recordedOn: formatJapaneseDate(talk.recordedOnDate, recordedOnRaw),
		youtubeUrl,
		embedUrl,
		thumbnailUrl: videoId
			? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
			: null,
		attachmentsLink: talk.attachmentsLink,
		slideLinks: talk.slideLinks,
	};

	const detailRows: TalkDetailRow[] = [
		{ label: "DVD番号", value: talkData.dvdId || "—" },
		{ label: "コレクション", value: talkData.collectionLabel },
		...(talkData.seriesLabel
			? [{ label: "シリーズ", value: talkData.seriesLabel }]
			: []),
		{ label: "タイトル", value: talkData.title },
		{ label: "行事名", value: talkData.event },
		{ label: "収録場所", value: talkData.venue },
		{ label: "講師", value: talkData.speaker },
		{ label: "収録時間", value: talkData.duration },
		{ label: "言語", value: talkData.language },
		{ label: "収録日", value: talkData.recordedOn },
	];

	const resourceLinks: TalkResourceLink[] = [
		...talkData.slideLinks.map((href, index) => ({
			label:
				talkData.slideLinks.length === 1
					? "スライドを見る"
					: `スライド ${index + 1}`,
			href,
			className: SLIDE_LINK_CLASS_NAME,
		})),
		talkData.attachmentsLink
			? {
					label: "添付データ",
					href: talkData.attachmentsLink,
					className: ATTACHMENT_LINK_CLASS_NAME,
				}
			: null,
	].filter((link): link is TalkResourceLink => link !== null);

	const embedUrlPrefix = embedUrl
		? `${embedUrl}${embedUrl.includes("?") ? "&" : "?"}`
		: null;

	const videoJsonLd =
		videoId && youtubeUrl && embedUrl
			? {
					"@context": "https://schema.org",
					"@type": "VideoObject",
					name: talkData.title,
					description: getTalkDescription(talk),
					thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
					...(structuredDataDate && {
						uploadDate: structuredDataDate,
					}),
					contentUrl: youtubeUrl,
					embedUrl,
					publisher: buildPublisherReference(),
					...(talk.duration && {
						duration: toIsoDuration(talk.duration),
					}),
				}
			: null;

	return {
		talk: talkData,
		detailRows,
		resourceLinks,
		embedUrlPrefix,
		videoJsonLd,
		breadcrumbJsonLd: buildTalkBreadcrumbJsonLd(talk),
	};
}
