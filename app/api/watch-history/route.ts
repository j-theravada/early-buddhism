import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
	normalizeWatchHistoryEntries,
	parseWatchHistoryEntries,
	parseWatchHistorySnapshot,
	upsertWatchHistory,
} from "../../application/watch-history";
import { getWatchHistoryRepository } from "../../infrastructure/watch-history/repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const parsed = parseWatchHistoryEntries(body);
	if (!parsed) {
		return NextResponse.json(
			{ error: "Invalid watch history entries" },
			{ status: 400 },
		);
	}
	const entries = normalizeWatchHistoryEntries(parsed);
	await getWatchHistoryRepository().importForUser(userId, entries);

	return new Response(null, {
		headers: { "Cache-Control": "private, no-store" },
		status: 204,
	});
}

export async function PUT(request: Request) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const snapshot = parseWatchHistorySnapshot(body);
	const entry = snapshot
		? upsertWatchHistory([], {
				...snapshot,
				lastWatchedAt: snapshot.lastWatchedAt ?? new Date().toISOString(),
			})[0]
		: undefined;
	if (!entry) {
		return NextResponse.json(
			{ error: "Invalid watch history entry" },
			{ status: 400 },
		);
	}

	const saved = await getWatchHistoryRepository().saveForUser(userId, entry);
	return NextResponse.json(saved, {
		headers: { "Cache-Control": "private, no-store" },
	});
}
