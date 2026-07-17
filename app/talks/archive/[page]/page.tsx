import { notFound, permanentRedirect } from "next/navigation";
import { buildLegacyTalkArchiveRedirectPage } from "../../../application/talk/archive-redirect";
import { buildTalksHref } from "../../../application/talk/links";
import { getTalks } from "../../../infrastructure/talk/repository";

type Props = { params: Promise<{ page: string }> };
export const dynamicParams = false;

export async function generateStaticParams() {
	const totalItems = (await getTalks()).length;
	const totalPages = Math.max(1, Math.ceil(totalItems / 100));
	return Array.from({ length: totalPages }, (_, index) => ({
		page: String(index + 1),
	}));
}

export default async function LegacyTalkArchivePage({ params }: Props) {
	const { page } = await params;
	const targetPage = buildLegacyTalkArchiveRedirectPage(
		(await getTalks()).length,
		page,
	);
	if (!targetPage) notFound();
	permanentRedirect(buildTalksHref({ page: targetPage }));
}
