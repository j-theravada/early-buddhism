export function extractGoogleDriveFileId(rawUrl: string): string | null {
	try {
		const url = new URL(rawUrl);
		if (url.hostname !== "drive.google.com") {
			return null;
		}

		const directId = url.searchParams.get("id");
		if (directId) return directId;

		const match = url.pathname.match(/\/file\/d\/([^/]+)/);
		return match?.[1] ?? null;
	} catch {
		return null;
	}
}

export function buildTranscriptDownloadUrl(rawUrl: string): string {
	const fileId = extractGoogleDriveFileId(rawUrl);
	return fileId
		? `https://drive.google.com/uc?export=download&id=${fileId}`
		: rawUrl;
}
