import { transformTalkToDisplay } from "../../domain/talk/display";
import type { Talk, TalkForDisplay } from "../../domain/talk/types";

export function buildTalkGalleryTalks(talks: Talk[]): TalkForDisplay[] {
	const sortedTalks = [...talks].sort((a, b) => {
		const aTime = a.recordedOnDate?.getTime() ?? 0;
		const bTime = b.recordedOnDate?.getTime() ?? 0;
		return bTime - aTime;
	});

	return sortedTalks.map((talk, index) => transformTalkToDisplay(talk, index));
}
