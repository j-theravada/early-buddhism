import {
	getPrimaryTalkMediaUrl,
	getTalkTitle,
} from "../../domain/talk/display";
import type { Talk } from "../../domain/talk/types";
import { formatJapaneseDate } from "../../utils/date";
import { toIsoDuration } from "../../utils/duration";
import { extractYouTubeVideoId } from "../../utils/youtube";

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
	thumbnailUrl?: string;
};

export type TalkDetailPageData = {
	talk: {
		id: string;
		dvdId: string;
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
		audioLink: string | null;
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
	} | null;
};

const AUDIO_LINK_CLASS_NAME =
	"inline-flex items-center gap-2 rounded-full bg-gray-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-700";
const SLIDE_LINK_CLASS_NAME =
	"inline-flex items-center gap-2 rounded-full bg-amber-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-amber-700";
const ATTACHMENT_LINK_CLASS_NAME =
	"inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700";

function getTalkDescription(talk: Talk): string {
	return talk.description || "初期仏教の法話を静かに味わうアーカイブ";
}

export function buildTalkMetadata(talk: Talk): TalkMetadataData {
	const title = getTalkTitle(talk);
	const description = getTalkDescription(talk);
	const youtubeUrl = getPrimaryTalkMediaUrl(talk);
	const videoId = youtubeUrl ? extractYouTubeVideoId(youtubeUrl) : null;

	return {
		title,
		description,
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

	const talkData = {
		id: talk.id,
		dvdId: talk.dvdId,
		title: getTalkTitle(talk),
		description: talk.description,
		event: talk.event || "未分類",
		venue: talk.venue || "—",
		speaker: talk.speaker || "—",
		duration: talk.duration || "—",
		language: talk.language || "—",
		recordedOn: formatJapaneseDate(talk.recordedOnDate, recordedOnRaw),
		youtubeUrl,
		embedUrl,
		audioLink: talk.audioLink,
		attachmentsLink: talk.attachmentsLink,
		slideLinks: talk.slideLinks,
	};

	const detailRows: TalkDetailRow[] = [
		{ label: "DVD番号", value: talkData.dvdId || "—" },
		{ label: "タイトル", value: talkData.title },
		{ label: "行事名", value: talkData.event },
		{ label: "収録場所", value: talkData.venue },
		{ label: "講師", value: talkData.speaker },
		{ label: "収録時間", value: talkData.duration },
		{ label: "言語", value: talkData.language },
		{ label: "収録日", value: talkData.recordedOn },
	];

	const resourceLinks: TalkResourceLink[] = [
		talkData.audioLink
			? {
					label: "音源を聞く",
					href: talkData.audioLink,
					className: AUDIO_LINK_CLASS_NAME,
				}
			: null,
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
					...(talk.recordedOnDate && {
						uploadDate: talk.recordedOnDate.toISOString(),
					}),
					contentUrl: youtubeUrl,
					embedUrl,
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
	};
}
