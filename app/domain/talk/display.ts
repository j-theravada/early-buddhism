import { formatJapaneseDate } from "../../utils/date";
import { getYouTubeInfo } from "../../utils/youtube";
import type { Talk, TalkForDisplay } from "./types";

function normalizeText(text: string): string {
	return text
		.replace(/\r\n/g, " ")
		.replace(/\n/g, " ")
		.replace(/\r/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function getTalkTitle(
	talk: Pick<Talk, "title" | "description" | "event">,
	fallback = "タイトル未設定",
): string {
	return talk.title || talk.description || talk.event || fallback;
}

export function getPrimaryTalkMediaUrl(
	talk: Pick<Talk, "youtubeLink" | "audioLink">,
): string | null {
	return talk.youtubeLink || talk.audioLink || null;
}

export function transformTalkToDisplay(
	talk: Talk,
	index: number,
): TalkForDisplay {
	const rawTitle = getTalkTitle(talk);
	const displayTitle = normalizeText(rawTitle);

	const rawSubtitle =
		talk.description &&
		talk.title &&
		talk.description.trim() !== talk.title.trim()
			? talk.description
			: "";
	const subtitle = rawSubtitle ? normalizeText(rawSubtitle) : "";

	const year = talk.recordedOnDate?.getFullYear() ?? null;
	const decade = year ? Math.floor(year / 10) * 10 : null;
	const decadeLabel = decade ? `${decade}年代` : "年代不明";
	const themeSource = (talk.description || talk.event || "").trim();
	const themeLabel = themeSource || "テーマ未設定";

	const youtubeUrl = getPrimaryTalkMediaUrl(talk);
	const { youtubeUrl: finalYoutubeUrl, thumbnailUrl } =
		getYouTubeInfo(youtubeUrl);

	const recordedOnSortValue = talk.recordedOnDate?.getTime() ?? 0;
	const recordedOnRaw = talk.recordedOn || "日付不明";

	return {
		id: talk.id || `talk-${index}`,
		dvdId: talk.dvdId || "",
		event: talk.event || "未分類",
		title: displayTitle,
		subtitle,
		venue: talk.venue || "—",
		speaker: talk.speaker || "—",
		duration: talk.duration || "—",
		language: talk.language || "—",
		audioLink: talk.audioLink,
		attachmentsLink: talk.attachmentsLink,
		youtubeUrl: finalYoutubeUrl,
		thumbnailUrl,
		recordedOnRaw,
		recordedOnFormatted: formatJapaneseDate(talk.recordedOnDate, recordedOnRaw),
		recordedOnSortValue,
		decadeLabel,
		themeLabel,
	};
}
