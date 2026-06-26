import { NextResponse } from "next/server";
import { buildTalkGalleryItems } from "../../application/talk/gallery";
import { getTalks } from "../../infrastructure/talk/repository";

const TALK_GALLERY_CACHE_CONTROL =
	"public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

export const dynamic = "force-static";

export async function GET() {
	const talks = await getTalks();
	return NextResponse.json(buildTalkGalleryItems(talks), {
		headers: {
			"Cache-Control": TALK_GALLERY_CACHE_CONTROL,
		},
	});
}
