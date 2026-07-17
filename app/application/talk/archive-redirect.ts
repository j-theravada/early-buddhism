import { TALK_LISTING_PAGE_SIZE } from "./listing";

const LEGACY_PAGE_SIZE = 100;

export function buildLegacyTalkArchiveRedirectPage(
	totalItems: number,
	rawPage: string,
): number | null {
	if (!/^[1-9]\d*$/.test(rawPage)) return null;
	const page = Number(rawPage);
	const totalPages = Math.max(1, Math.ceil(totalItems / LEGACY_PAGE_SIZE));
	if (!Number.isSafeInteger(page) || page > totalPages) return null;
	return (
		Math.floor(((page - 1) * LEGACY_PAGE_SIZE) / TALK_LISTING_PAGE_SIZE) + 1
	);
}
