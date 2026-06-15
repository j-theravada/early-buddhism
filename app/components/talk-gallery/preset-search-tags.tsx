import { useMemo } from "react";
import {
	tokenizeSearchQuery,
	type IndexedTalk,
} from "../../application/talk/search";
import { TALK_TAGS } from "../../domain/talk/tags";

const PRESET_TAGS = TALK_TAGS;

type Props = {
	indexedTalks: IndexedTalk[];
	onSelectTag: (keyword: string) => void;
};

export default function PresetSearchTags({ indexedTalks, onSelectTag }: Props) {
	const availableTags = useMemo(
		() =>
			PRESET_TAGS.filter((tag) => {
				const tokens = tokenizeSearchQuery(tag);
				return indexedTalks.some(({ searchText }) =>
					tokens.every((token) => searchText.includes(token)),
				);
			}),
		[indexedTalks],
	);

	if (availableTags.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-wrap gap-1.5">
			{availableTags.map((tag) => (
				<button
					className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 transition hover:bg-gray-200 hover:text-gray-900 active:bg-gray-300"
					key={tag}
					onClick={() => onSelectTag(tag)}
					type="button"
				>
					#{tag}
				</button>
			))}
		</div>
	);
}
