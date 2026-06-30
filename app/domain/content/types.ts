export type ContentKind = "talk" | "text";

export type ContentCollectionId =
	| "monthly_talk"
	| "scripture_commentary"
	| "other";

export type ContentSeriesId = string;

export type ContentItemBase = {
	id: string;
	kind: ContentKind;
	collectionId: ContentCollectionId;
	collectionLabel: string;
	seriesId: ContentSeriesId | "";
	seriesLabel: string;
	title: string;
	description: string;
};

export type TalkContentItem = ContentItemBase & {
	kind: "talk";
	dvdId: string;
	folder: string;
	event: string;
	venue: string;
	recordedOn: string;
	recordedOnDate: Date | null;
	duration: string;
	speaker: string;
	language: string;
	format: string;
	attachmentsLink: string | null;
	slideLinks: string[];
	youtubeLink: string | null;
	srtLink: string | null;
};

export type TextContentItem = ContentItemBase & {
	kind: "text";
	body: string;
	sourceLabel: string;
};

export type ContentItem = TalkContentItem | TextContentItem;
