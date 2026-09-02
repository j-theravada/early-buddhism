export const YouTubePlayerState = {
	ENDED: 0,
	PLAYING: 1,
	PAUSED: 2,
} as const;

export type YouTubePlayer = {
	getCurrentTime: () => number;
	getDuration: () => number;
	destroy: () => void;
};

type YouTubePlayerStateChangeEvent = {
	data: number;
};

export type YouTubeIframeApi = {
	Player: new (
		iframe: HTMLIFrameElement,
		options: {
			events?: {
				onStateChange?: (event: YouTubePlayerStateChangeEvent) => void;
			};
		},
	) => YouTubePlayer;
};

type YouTubeWindow = Window & {
	YT?: YouTubeIframeApi;
	onYouTubeIframeAPIReady?: (() => void) | null;
};

let iframeApiPromise: Promise<YouTubeIframeApi> | null = null;
const failedScripts = new WeakSet<HTMLScriptElement>();
const IFRAME_API_SRC = "https://www.youtube.com/iframe_api";

const findIframeApiScript = (): HTMLScriptElement | null => {
	const script = document.querySelector<HTMLScriptElement>(
		`script[src="${IFRAME_API_SRC}"]`,
	);
	return script && !failedScripts.has(script) ? script : null;
};

export const loadYouTubeIframeApi = (): Promise<YouTubeIframeApi> => {
	// SAFETY: This adapter owns the optional YouTube globals it reads and installs on window.
	const youtubeWindow = window as YouTubeWindow;
	if (youtubeWindow.YT?.Player) {
		return Promise.resolve(youtubeWindow.YT);
	}

	if (iframeApiPromise) {
		return iframeApiPromise;
	}

	iframeApiPromise = new Promise<YouTubeIframeApi>((resolve, reject) => {
		const previousReady = youtubeWindow.onYouTubeIframeAPIReady;
		const existingScript = findIframeApiScript();
		const script = existingScript ?? document.createElement("script");
		const createdScript = existingScript === null;
		let settled = false;
		let handleReady: () => void;
		let handleError: () => void;

		const restorePreviousReady = () => {
			if (youtubeWindow.onYouTubeIframeAPIReady === handleReady) {
				youtubeWindow.onYouTubeIframeAPIReady = previousReady ?? null;
			}
		};

		const resolveApi = (api: YouTubeIframeApi) => {
			if (settled) return;
			settled = true;
			script.removeEventListener("error", handleError);
			resolve(api);
		};

		const rejectApi = (error: Error) => {
			if (settled) return;
			settled = true;
			script.removeEventListener("error", handleError);
			restorePreviousReady();
			failedScripts.add(script);
			if (createdScript) script.remove();
			reject(error);
		};

		handleReady = () => {
			try {
				previousReady?.();
			} catch {
				// A foreign callback must not leave this shared loader pending.
			}
			const api = youtubeWindow.YT;
			if (api?.Player) {
				resolveApi(api);
				return;
			}
			rejectApi(new Error("YouTube iframe API did not provide Player."));
		};

		handleError = () => {
			rejectApi(new Error("Failed to load the YouTube iframe API."));
		};

		youtubeWindow.onYouTubeIframeAPIReady = handleReady;
		script.addEventListener("error", handleError, { once: true });
		if (createdScript) {
			script.src = IFRAME_API_SRC;
			document.head.append(script);
		}
	}).catch((cause: unknown) => {
		iframeApiPromise = null;
		throw cause;
	});

	return iframeApiPromise;
};
