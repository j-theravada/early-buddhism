import generatedPopularVideosJson from "../../generated/popular-videos.json";
import { normalizeTalkId } from "../../domain/talk/id";
import type { TalkForDisplay } from "../../domain/talk/types";

const POPULAR_VIDEO_LIMIT = 3;

type GeneratedPopularVideos = {
	entries?: {
		pagePath?: string;
		talkId: string;
		views?: number;
	}[];
};

export type PopularVideo = {
	image: string;
	imageHeight: number;
	imageKind: "feature" | "thumbnail";
	imageWidth: number;
	talkId: string;
	title: string;
	views?: number;
};

const fallbackPopularVideos: PopularVideo[] = [
	{
		image: "/khanti/top/new_contents_01.png",
		imageHeight: 938,
		imageKind: "feature",
		imageWidth: 794,
		talkId: "TALK-V-159-4-4F5E53BFA4DF",
		title: "「自信過剰」の危機 〜あなたは自分を信じる？ 自分を疑う？ 〜 4",
	},
	{
		image: "/khanti/top/new_contents_02.png",
		imageHeight: 938,
		imageKind: "feature",
		imageWidth: 794,
		talkId: "TALK-V-160-1-4739BF160E79",
		title: "「世間知らず」からの脱却 〜ブッダが称賛する社会人とは？ 〜 1",
	},
	{
		image: "/khanti/top/new_contents_03.png",
		imageHeight: 938,
		imageKind: "feature",
		imageWidth: 794,
		talkId: "TALK-V-160-2-303B3687DE32",
		title: "「世間知らず」からの脱却 〜ブッダが称賛する社会人とは？ 〜 2",
	},
];

export function getPopularVideos(talks: TalkForDisplay[]): PopularVideo[] {
	const pageViews = generatedPopularVideosJson as GeneratedPopularVideos;
	const talksById = new Map(talks.map((talk) => [normalizeTalkId(talk.id), talk]));
	const videos: PopularVideo[] = [];

	for (const pageView of pageViews.entries ?? []) {
		const talk = talksById.get(normalizeTalkId(pageView.talkId));
		if (!talk?.youtubeUrl || !talk.thumbnailUrl) continue;

		videos.push({
			image: talk.thumbnailUrl,
			imageHeight: 360,
			imageKind: "thumbnail",
			imageWidth: 480,
			talkId: talk.id,
			title: talk.title,
			views: pageView.views,
		});

		if (videos.length >= POPULAR_VIDEO_LIMIT) break;
	}

	return fillWithFallbackVideos(videos);
}

function fillWithFallbackVideos(videos: PopularVideo[]): PopularVideo[] {
	const result = [...videos];
	const seen = new Set(result.map((video) => normalizeTalkId(video.talkId)));

	for (const fallbackVideo of fallbackPopularVideos) {
		if (result.length >= POPULAR_VIDEO_LIMIT) break;
		if (seen.has(normalizeTalkId(fallbackVideo.talkId))) continue;

		result.push(fallbackVideo);
		seen.add(normalizeTalkId(fallbackVideo.talkId));
	}

	return result;
}
