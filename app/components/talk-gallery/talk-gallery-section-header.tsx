import type { GroupedSection } from "../../application/talk/grouping";
import { highlightMatches } from "./highlight";

type Props = {
	section: GroupedSection;
	isFirst: boolean;
	searchTokens: string[];
};

export default function TalkGallerySectionHeader({
	section,
	isFirst,
	searchTokens,
}: Props) {
	return (
		<div className={`${isFirst ? "" : "pt-12"} bg-white/95 px-5 sm:px-8`}>
			<div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[#d6c6ad] pb-3">
				<h3 className="text-xl font-bold text-[#303030] sm:text-2xl">
					{highlightMatches(section.label, searchTokens)}
				</h3>
				<span className="text-xs text-[#888]">{section.count} 件</span>
			</div>
		</div>
	);
}
