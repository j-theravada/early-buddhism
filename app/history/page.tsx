import type { Metadata } from "next";
import SimplePageLayout from "../components/simple-page-layout";
import WatchHistoryList from "./watch-history-list";

export const metadata: Metadata = {
	title: "視聴履歴",
	robots: { index: false, follow: false },
};

export default function HistoryPage() {
	return (
		<SimplePageLayout title="視聴履歴">
			<WatchHistoryList />
		</SimplePageLayout>
	);
}
