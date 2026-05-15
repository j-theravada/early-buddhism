export function buildTranscriptDownloadUrl(rawUrl: string): string {
	try {
		const url = new URL(rawUrl);
		if (url.hostname !== "drive.google.com") {
			return rawUrl;
		}

		const directId = url.searchParams.get("id");
		if (directId) {
			return `https://drive.google.com/uc?export=download&id=${directId}`;
		}

		const match = url.pathname.match(/\/file\/d\/([^/]+)/);
		if (!match) {
			return rawUrl;
		}

		return `https://drive.google.com/uc?export=download&id=${match[1]}`;
	} catch {
		return rawUrl;
	}
}
