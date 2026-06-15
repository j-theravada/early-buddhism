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

const fallbackPopularVideoIds = [
	"TALK-V-159-4-4F5E53BFA4DF",
	"TALK-V-160-1-4739BF160E79",
	"TALK-V-160-2-303B3687DE32",
] as const;

export function getPopularVideos(talks: TalkForDisplay[]): TalkForDisplay[] {
	const pageViews = generatedPopularVideosJson as GeneratedPopularVideos;
	const talksById = new Map(talks.map((talk) => [normalizeTalkId(talk.id), talk]));
	const videos: TalkForDisplay[] = [];

	for (const pageView of pageViews.entries ?? []) {
		const talk = talksById.get(normalizeTalkId(pageView.talkId));
		if (!talk?.youtubeUrl || !talk.thumbnailUrl) continue;

		videos.push(talk);

		if (videos.length >= POPULAR_VIDEO_LIMIT) break;
	}

	return fillWithFallbackVideos(videos, talksById);
}

function fillWithFallbackVideos(
	videos: TalkForDisplay[],
	talksById: Map<string, TalkForDisplay>,
): TalkForDisplay[] {
	const result = [...videos];
	const seen = new Set(result.map((video) => normalizeTalkId(video.id)));

	for (const fallbackVideoId of fallbackPopularVideoIds) {
		if (result.length >= POPULAR_VIDEO_LIMIT) break;
		const lookupKey = normalizeTalkId(fallbackVideoId);
		if (seen.has(lookupKey)) continue;

		const fallbackTalk = talksById.get(lookupKey);
		if (!fallbackTalk?.youtubeUrl || !fallbackTalk.thumbnailUrl) continue;

		result.push(fallbackTalk);
		seen.add(lookupKey);
	}

	return result;
}
