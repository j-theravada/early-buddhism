import { formatJapaneseDate } from "../../utils/date";
import { getYouTubeInfo } from "../../utils/youtube";
import {
	parseContentCollectionId,
	parseContentSeriesId,
	resolveContentClassification,
} from "../content/collection";
import { normalizeSumanasaraJapaneseName } from "../teacher/sumanasara";
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
	talk: Pick<Talk, "youtubeLink">,
): string | null {
	return talk.youtubeLink || null;
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
	const classification = resolveContentClassification({
		collectionSources: [talk.collectionLabel, talk.event],
		seriesSources: [talk.seriesLabel],
	});
	const collectionId =
		parseContentCollectionId(talk.collectionId) || classification.collectionId;
	const seriesId =
		parseContentSeriesId(talk.seriesId) || classification.seriesId;

	return {
		id: talk.id || `talk-${index}`,
		kind: "talk",
		collectionId,
		collectionLabel: talk.collectionLabel || classification.collectionLabel,
		seriesId,
		seriesLabel: talk.seriesLabel || classification.seriesLabel,
		dvdId: talk.dvdId || "",
		event: talk.event || "未分類",
		title: displayTitle,
		description: normalizeText(talk.description || ""),
		subtitle,
		venue: talk.venue || "—",
		speaker: normalizeSumanasaraJapaneseName(talk.speaker || "—"),
		duration: talk.duration || "—",
		language: talk.language || "—",
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
