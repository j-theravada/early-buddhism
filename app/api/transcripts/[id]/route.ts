import { NextResponse } from "next/server";
import { getTranscriptByTalkId } from "../../../infrastructure/transcript/repository";

const TRANSCRIPT_CACHE_CONTROL =
	"public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

export const runtime = "nodejs";

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
	const { id } = await params;
	const transcript = await getTranscriptByTalkId(id);

	if (!transcript) {
		return NextResponse.json(
			{ error: "Transcript not found." },
			{
				status: 404,
				headers: {
					"Cache-Control": TRANSCRIPT_CACHE_CONTROL,
				},
			},
		);
	}

	return NextResponse.json(
		{ transcript },
		{
			headers: {
				"Cache-Control": TRANSCRIPT_CACHE_CONTROL,
			},
		},
	);
}
