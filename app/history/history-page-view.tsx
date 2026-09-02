import type { Metadata } from "next";
import type { WatchHistoryEntry } from "../application/watch-history";
import SimplePageLayout from "../components/simple-page-layout";
import WatchHistoryList from "./watch-history-list";

export const historyPageMetadata: Metadata = {
	title: "視聴履歴",
	robots: { index: false, follow: false },
};

export function HistoryPageView({ entries }: { entries: WatchHistoryEntry[] }) {
	return (
		<SimplePageLayout title="視聴履歴">
			<WatchHistoryList entries={entries} />
		</SimplePageLayout>
	);
}
