import { cache } from "react";
import { normalizeTalkId } from "../../domain/talk/id";
import type { Talk } from "../../domain/talk/types";
import talksJson from "../../generated/talks.json";

type SerializedTalk = Omit<Talk, "recordedOnDate" | "slideLinks"> & {
	recordedOnDate: string | null;
	slideLinks?: string[];
};

function deserializeTalk(talk: SerializedTalk): Talk {
	return {
		...talk,
		recordedOnDate: talk.recordedOnDate ? new Date(talk.recordedOnDate) : null,
		slideLinks: talk.slideLinks ?? [],
		srtLink: talk.srtLink ?? null,
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
