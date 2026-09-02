import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getWatchHistoryRepository } from "../infrastructure/watch-history/repository";
import { historyPageMetadata, HistoryPageView } from "./history-page-view";

export const metadata = historyPageMetadata;

export default async function HistoryPage() {
	const { userId } = await auth();
	if (!userId) {
		redirect("/login?redirect_url=/history");
	}

	const entries = await getWatchHistoryRepository().listForUser(userId);

	return <HistoryPageView entries={entries} />;
}
