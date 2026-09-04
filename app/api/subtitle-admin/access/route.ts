import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { currentUserIsSubtitleAdmin } from "../../../infrastructure/auth/server";

export const runtime = "nodejs";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

export async function GET() {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json(
			{ isSubtitleAdmin: false },
			{ status: 401, headers: PRIVATE_HEADERS },
		);
	}

	return NextResponse.json(
		{ isSubtitleAdmin: await currentUserIsSubtitleAdmin() },
		{ headers: PRIVATE_HEADERS },
	);
}
