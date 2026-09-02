import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isValidWatchHistoryTalkId } from "../../../application/watch-history";
import { getWatchHistoryRepository } from "../../../infrastructure/watch-history/repository";

export const runtime = "nodejs";

type RouteContext = {
	params: Promise<{ talkId: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { talkId } = await params;
	if (!isValidWatchHistoryTalkId(talkId)) {
		return NextResponse.json({ error: "Invalid talk ID" }, { status: 400 });
	}
	const entry = await getWatchHistoryRepository().findForUser(userId, talkId);
	if (!entry) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	return NextResponse.json(entry, {
		headers: { "Cache-Control": "private, no-store" },
	});
}
