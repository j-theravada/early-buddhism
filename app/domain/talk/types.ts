import type { ContentItemBase, TalkContentItem } from "../content/types";

export type Talk = TalkContentItem;

export type TalkForDisplay = ContentItemBase & {
	kind: "talk";
	dvdId: string;
	event: string;
	subtitle: string;
	venue: string;
	speaker: string;
	duration: string;
	language: string;
	audioLink: string | null;
	attachmentsLink: string | null;
	youtubeUrl: string | null;
	thumbnailUrl: string | null;
	recordedOnRaw: string;
	recordedOnFormatted: string;
	recordedOnSortValue: number;
	decadeLabel: string;
	themeLabel: string;
};

export type TalkGalleryItem = Pick<
	TalkForDisplay,
	| "id"
	| "dvdId"
	| "collectionId"
	| "collectionLabel"
	| "seriesId"
	| "seriesLabel"
	| "title"
	| "subtitle"
	| "audioLink"
	| "attachmentsLink"
	| "youtubeUrl"
	| "thumbnailUrl"
	| "recordedOnFormatted"
	| "recordedOnSortValue"
	| "decadeLabel"
	| "themeLabel"
>;
