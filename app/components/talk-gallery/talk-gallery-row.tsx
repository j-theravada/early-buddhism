import type { TalkForDisplay } from "../../domain/talk/types";
import type { TranscriptSnippet } from "./use-talk-gallery-data";
import TalkGalleryCard from "./talk-gallery-card";

const GRID_CLASS_BY_COLUMNS: Record<number, string> = {
	1: "grid-cols-1",
	2: "grid-cols-1 sm:grid-cols-2",
	3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
};

type Props = {
	talks: TalkForDisplay[];
	isFirstRow: boolean;
	columns: number;
	searchTokens: string[];
	searchQuery: string;
	transcriptSnippetsByTalkId: ReadonlyMap<string, TranscriptSnippet[]>;
	onNavigateToTalk: () => void;
};

export default function TalkGalleryRow({
	talks,
	isFirstRow,
	columns,
	searchTokens,
	searchQuery,
	transcriptSnippetsByTalkId,
	onNavigateToTalk,
}: Props) {
	const gridClass = GRID_CLASS_BY_COLUMNS[columns] ?? GRID_CLASS_BY_COLUMNS[1];

	return (
		<div className={isFirstRow ? "pt-6" : "pt-8"}>
			<div className={`grid gap-8 ${gridClass}`}>
				{talks.map((talk) => (
					<TalkGalleryCard
						key={talk.id}
						onNavigateToTalk={onNavigateToTalk}
						searchQuery={searchQuery}
						searchTokens={searchTokens}
						talk={talk}
						transcriptSnippets={transcriptSnippetsByTalkId.get(talk.id) ?? []}
					/>
				))}
			</div>
		</div>
	);
}
