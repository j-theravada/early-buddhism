import { transformTalkToDisplay } from "../../domain/talk/display";
import type {
	Talk,
	TalkForDisplay,
	TalkGalleryItem,
} from "../../domain/talk/types";

export function buildTalkGalleryTalks(talks: Talk[]): TalkForDisplay[] {
	const sortedTalks = [...talks].sort((a, b) => {
		const aTime = a.recordedOnDate?.getTime() ?? Number.POSITIVE_INFINITY;
		const bTime = b.recordedOnDate?.getTime() ?? Number.POSITIVE_INFINITY;
		return aTime - bTime;
	});

	return sortedTalks.map((talk, index) => transformTalkToDisplay(talk, index));
}

function pickTalkGalleryItem(talk: TalkForDisplay): TalkGalleryItem {
	return {
		id: talk.id,
		dvdId: talk.dvdId,
		collectionId: talk.collectionId,
		collectionLabel: talk.collectionLabel,
		seriesId: talk.seriesId,
		seriesLabel: talk.seriesLabel,
		title: talk.title,
		subtitle: talk.subtitle,
		attachmentsLink: talk.attachmentsLink,
		youtubeUrl: talk.youtubeUrl,
		thumbnailUrl: talk.thumbnailUrl,
		recordedOnFormatted: talk.recordedOnFormatted,
		recordedOnSortValue: talk.recordedOnSortValue,
		decadeLabel: talk.decadeLabel,
		themeLabel: talk.themeLabel,
	};
}

export function buildTalkGalleryItems(talks: Talk[]): TalkGalleryItem[] {
	return buildTalkGalleryTalks(talks).map(pickTalkGalleryItem);
}
