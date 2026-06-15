import { cache } from "react";
import talkTagsJson from "../../data/talk-tags.json";
import { normalizeTalkId } from "../../domain/talk/id";
import { getTalkTags, type TalkTagOverrides } from "../../domain/talk/tags";
import type { Talk } from "../../domain/talk/types";
import transcriptTagsJson from "../../generated/talk-tags.json";
import talksJson from "../../generated/talks.json";

type SerializedTalk = Omit<Talk, "recordedOnDate" | "slideLinks" | "tags"> & {
	recordedOnDate: string | null;
	slideLinks?: string[];
	tags?: string[];
};

const talkTagOverrides = talkTagsJson as TalkTagOverrides;
const transcriptTagsByTalkId = transcriptTagsJson as Record<string, string[]>;

function getTranscriptTags(talkId: string): string[] {
	const lookupKey = normalizeTalkId(talkId);
	for (const [key, tags] of Object.entries(transcriptTagsByTalkId)) {
		if (normalizeTalkId(key) === lookupKey && Array.isArray(tags)) {
			return tags;
		}
	}
	return [];
}

function deserializeTalk(talk: SerializedTalk): Talk {
	const deserialized = {
		...talk,
		recordedOnDate: talk.recordedOnDate ? new Date(talk.recordedOnDate) : null,
		slideLinks: talk.slideLinks ?? [],
		srtLink: talk.srtLink ?? null,
		tags: talk.tags ?? [],
	};

	return {
		...deserialized,
		tags: getTalkTags(
			{
				...deserialized,
				tags: [...getTranscriptTags(deserialized.id), ...deserialized.tags],
			},
			talkTagOverrides,
		),
	};
}

const loadTalks = cache(async (): Promise<Talk[]> => {
	return (talksJson as SerializedTalk[]).map(deserializeTalk);
});

const loadTalkIndex = cache(async (): Promise<Map<string, Talk>> => {
	const talks = await loadTalks();
	const index = new Map<string, Talk>();
	for (const talk of talks) {
		index.set(normalizeTalkId(talk.id), talk);
	}
	return index;
});

export async function getTalks(): Promise<Talk[]> {
	return loadTalks();
}

export async function getTalkById(id: string): Promise<Talk | null> {
	const index = await loadTalkIndex();
	return index.get(normalizeTalkId(id)) ?? null;
}
