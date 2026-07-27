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

export const loadYouTubeIframeApi = (): Promise<YouTubeIframeApi> => {
	const youtubeWindow = window as YouTubeWindow;
	if (youtubeWindow.YT?.Player) {
		return Promise.resolve(youtubeWindow.YT);
	}

	if (iframeApiPromise) {
		return iframeApiPromise;
	}

	iframeApiPromise = new Promise<YouTubeIframeApi>((resolve, reject) => {
		const previousReady = youtubeWindow.onYouTubeIframeAPIReady;
		const script = document.createElement("script");
		let settled = false;

		const settle = (callback: () => void) => {
			if (settled) return;
			settled = true;
			callback();
		};

		youtubeWindow.onYouTubeIframeAPIReady = () => {
			previousReady?.();
			settle(() => {
				const api = youtubeWindow.YT;
				if (api?.Player) {
					resolve(api);
					return;
				}
				reject(new Error("YouTube iframe API did not provide Player."));
			});
		};

		script.onerror = () => {
			settle(() => {
				if (youtubeWindow.onYouTubeIframeAPIReady) {
					youtubeWindow.onYouTubeIframeAPIReady = previousReady ?? null;
				}
				script.remove();
				reject(new Error("Failed to load the YouTube iframe API."));
			});
		};
		script.src = "https://www.youtube.com/iframe_api";
		document.head.append(script);
	}).catch((error: unknown) => {
		iframeApiPromise = null;
		throw error;
	});

	return iframeApiPromise;
};
