import Link from "next/link";
import { buildTalksHref } from "../../application/talk/links";
import type {
	TalkListingConditions,
	TalkListingDecadeTarget,
} from "../../application/talk/listing";

type Props = {
	conditions: TalkListingConditions;
	targets: TalkListingDecadeTarget[];
};

export default function DecadeJumpNav({ conditions, targets }: Props) {
	if (targets.length <= 1) {
		return null;
	}

	return (
		<nav
			aria-label="年代ジャンプ"
			className="scrollbar-none flex gap-3 overflow-x-auto"
		>
			{targets.map((target) => (
				<Link
					className="shrink-0 text-xs font-medium text-gray-500 underline-offset-4 transition hover:text-gray-900 hover:underline"
					href={`${buildTalksHref({
						page: target.page,
						query: conditions.query,
						collectionId: conditions.collectionId,
						seriesId: conditions.seriesId,
						searchFields: conditions.searchFields,
					})}#${target.anchorId}`}
					key={target.label}
					prefetch={false}
				>
					{target.label}
					<span className="ml-0.5 text-gray-400">({target.count})</span>
				</Link>
			))}
		</nav>
	);
}
