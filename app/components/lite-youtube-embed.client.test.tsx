import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	test,
} from "bun:test";
import { Window } from "happy-dom";
import { act } from "react";
import type { Root } from "react-dom/client";
import {
	WATCH_HISTORY_STORAGE_KEY,
	type WatchHistoryEntry,
} from "../application/watch-history";
import { LOAD_TALK_PLAYER_EVENT } from "../application/talk/player-events";

type EmbedProps = {
	embedUrl?: string;
	talkId?: string;
	thumbnailUrl?: string | null;
	title?: string;
};

type FakePlayer = {
	getCurrentTime: () => number;
	getDuration: () => number;
	destroy: () => void;
};

type PlayerStateChange = (event: { data: number }) => void;

type FakeYouTubeApi = {
	Player: new (
		iframe: HTMLIFrameElement,
		options: { events?: { onStateChange?: PlayerStateChange } },
	) => FakePlayer;
};

const testWindow = new Window({ url: "http://localhost" });
const originalGlobals = new Map<string, PropertyDescriptor | undefined>();

let createRoot: typeof import("react-dom/client").createRoot;
let LiteYouTubeEmbed: typeof import("./lite-youtube-embed").default;
let currentRoot: Root | null = null;
let currentContainer: HTMLElement | null = null;
let fakePlayer: FakePlayer | null = null;
let stateChange: PlayerStateChange | null = null;
let intervalCallback: (() => void) | null = null;
let intervalStarts = 0;
let clearIntervalCalls = 0;
let originalSetInterval: typeof window.setInterval;
let originalClearInterval: typeof window.clearInterval;

function installGlobal(name: string, value: unknown) {
	originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
	Object.defineProperty(globalThis, name, {
		configurable: true,
		value,
		writable: true,
	});
}

function getWindowWithYouTube() {
	return window as unknown as typeof globalThis & {
		YT?: FakeYouTubeApi;
		onYouTubeIframeAPIReady?: (() => void) | null;
	};
}

function installFakeApi(currentTime = 63, duration = 120) {
	class Player implements FakePlayer {
		getCurrentTime = () => currentTime;
		getDuration = () => duration;
		destroy = () => {};

		constructor(
			_iframe: HTMLIFrameElement,
			options: { events?: { onStateChange?: PlayerStateChange } },
		) {
			fakePlayer = this;
			stateChange = options.events?.onStateChange ?? null;
		}
	}

	getWindowWithYouTube().YT = { Player };
}

function writeHistory(positionSeconds: number) {
	const entry: WatchHistoryEntry = {
		completed: false,
		durationSeconds: 120,
		lastWatchedAt: "2026-07-27T00:00:00.000Z",
		positionSeconds,
		talkId: "TALK-1",
		thumbnailUrl: "https://img.youtube.com/vi/example/hqdefault.jpg",
		title: "テスト動画",
	};
	localStorage.setItem(
		WATCH_HISTORY_STORAGE_KEY,
		JSON.stringify({ [entry.talkId]: entry }),
	);
}

async function mountEmbed(props: EmbedProps = {}) {
	currentContainer = document.createElement("div");
	document.body.append(currentContainer);
	currentRoot = createRoot(currentContainer);

	await act(async () => {
		currentRoot?.render(
			<LiteYouTubeEmbed
				embedUrl={props.embedUrl ?? "https://www.youtube.com/embed/example"}
				talkId={props.talkId ?? "TALK-1"}
				thumbnailUrl={props.thumbnailUrl ?? null}
				title={props.title ?? "テスト動画"}
			/>,
		);
	});

	return currentContainer;
}

async function unmountEmbed() {
	if (!currentRoot) return;

	await act(async () => {
		currentRoot?.unmount();
	});
	currentRoot = null;
}

function getIframe(): HTMLIFrameElement {
	const iframe = currentContainer?.querySelector("iframe");
	if (!(iframe instanceof HTMLIFrameElement)) {
		throw new Error("Player iframe not found.");
	}
	return iframe;
}

async function clickPlayButton() {
	const button = currentContainer?.querySelector("button");
	if (!(button instanceof HTMLButtonElement)) {
		throw new Error("Play button not found.");
	}

	await act(async () => {
		button.click();
	});
}

async function loadIframe() {
	await act(async () => {
		getIframe().dispatchEvent(new Event("load"));
		await Promise.resolve();
	});
}

async function waitFor(check: () => void) {
	let lastError: unknown;

	for (let attempt = 0; attempt < 40; attempt += 1) {
		try {
			check();
			return;
		} catch (error) {
			lastError = error;
		}

		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
	}

	throw lastError;
}

function savedPosition(): number | null {
	const raw = localStorage.getItem(WATCH_HISTORY_STORAGE_KEY);
	if (!raw) return null;
	const entries = JSON.parse(raw) as Record<string, WatchHistoryEntry>;
	return entries["TALK-1"]?.positionSeconds ?? null;
}

function requireScript(
	script: HTMLScriptElement | null,
): HTMLScriptElement {
	if (!script) throw new Error("YouTube API script not found.");
	return script;
}

beforeAll(async () => {
	installGlobal("window", testWindow);
	installGlobal("self", testWindow);
	installGlobal("document", testWindow.document);
	installGlobal("navigator", testWindow.navigator);
	installGlobal("Node", testWindow.Node);
	installGlobal("Element", testWindow.Element);
	installGlobal("HTMLElement", testWindow.HTMLElement);
	installGlobal("HTMLButtonElement", testWindow.HTMLButtonElement);
	installGlobal("HTMLIFrameElement", testWindow.HTMLIFrameElement);
	installGlobal("HTMLScriptElement", testWindow.HTMLScriptElement);
	installGlobal("Event", testWindow.Event);
	installGlobal("MouseEvent", testWindow.MouseEvent);
	installGlobal("CustomEvent", testWindow.CustomEvent);
	installGlobal("MutationObserver", testWindow.MutationObserver);
	installGlobal("localStorage", testWindow.localStorage);
	installGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	originalSetInterval = window.setInterval;
	originalClearInterval = window.clearInterval;

	({ createRoot } = await import("react-dom/client"));
	({ default: LiteYouTubeEmbed } = await import("./lite-youtube-embed"));
});

afterEach(async () => {
	await unmountEmbed();
	currentContainer?.remove();
	currentContainer = null;
	document.body.replaceChildren();
	localStorage.clear();
	Reflect.deleteProperty(getWindowWithYouTube(), "YT");
	Reflect.deleteProperty(getWindowWithYouTube(), "onYouTubeIframeAPIReady");
	window.setInterval = originalSetInterval;
	window.clearInterval = originalClearInterval;
	fakePlayer = null;
	stateChange = null;
	intervalCallback = null;
	intervalStarts = 0;
	clearIntervalCalls = 0;
});

afterAll(async () => {
	await testWindow.happyDOM.close();

	for (const [name, descriptor] of originalGlobals) {
		if (descriptor) {
			Object.defineProperty(globalThis, name, descriptor);
		} else {
			Reflect.deleteProperty(globalThis, name);
		}
	}
});

describe("LiteYouTubeEmbed client playback tracking", () => {
	test("再生ボタンを押すまでYouTube APIを読み込まない", async () => {
		await mountEmbed();

		expect(document.querySelector('script[src="https://www.youtube.com/iframe_api"]')).toBeNull();
	});

	test("保存済みの未完了再生位置から3秒戻して開始する", async () => {
		installFakeApi();
		writeHistory(63);
		await mountEmbed();

		await clickPlayButton();

		expect(getIframe().src).toContain("autoplay=1");
		expect(getIframe().src).toContain("enablejsapi=1");
		expect(getIframe().src).toContain("start=60");
	});

	test("文字起こしで指定した開始位置は保存済み履歴より優先する", async () => {
		installFakeApi();
		writeHistory(63);
		await mountEmbed();

		await act(async () => {
			window.dispatchEvent(
				new CustomEvent(LOAD_TALK_PLAYER_EVENT, {
					detail: {
						src: "https://www.youtube.com/embed/example?autoplay=1&start=12",
					},
				}),
			);
		});

		expect(getIframe().src).toContain("start=12");
		expect(getIframe().src).not.toContain("start=60");
		expect(getIframe().src).toContain("enablejsapi=1");
	});

	test("再生中だけ15秒ごとの保存を始める", async () => {
		installFakeApi();
		window.setInterval = ((callback: () => void, delay: number) => {
			expect(delay).toBe(15_000);
			intervalStarts += 1;
			intervalCallback = callback;
			return 1;
		}) as typeof window.setInterval;
		window.clearInterval = (() => {
			clearIntervalCalls += 1;
		}) as typeof window.clearInterval;
		await mountEmbed();
		await clickPlayButton();
		await loadIframe();

		expect(fakePlayer).not.toBeNull();
		stateChange?.({ data: 1 });
		stateChange?.({ data: 1 });
		expect(intervalStarts).toBe(1);
		expect(intervalCallback).not.toBeNull();

		await act(async () => intervalCallback?.());
		expect(savedPosition()).toBe(63);

	});

	for (const [state, label] of [
		[2, "一時停止"],
		[0, "終了"],
	] as const) {
		test(`${label}で直ちに保存し、定期保存を止める`, async () => {
			installFakeApi();
			window.setInterval = ((callback: () => void) => {
				intervalCallback = callback;
				return 1;
			}) as typeof window.setInterval;
			window.clearInterval = (() => {
				clearIntervalCalls += 1;
			}) as typeof window.clearInterval;
			await mountEmbed();
			await clickPlayButton();
			await loadIframe();

			stateChange?.({ data: 1 });
			stateChange?.({ data: state });

			expect(savedPosition()).toBe(63);
			expect(clearIntervalCalls).toBe(1);
		});
	}

	test("アンマウント時だけ保存し、解除後のpagehideでは保存しない", async () => {
		installFakeApi();
		await mountEmbed();
		await clickPlayButton();
		await loadIframe();

		await unmountEmbed();
		expect(savedPosition()).toBe(63);
		localStorage.clear();
		window.dispatchEvent(new Event("pagehide"));
		expect(savedPosition()).toBeNull();
	});

	test("pagehideで一度保存する", async () => {
		installFakeApi();
		await mountEmbed();
		await clickPlayButton();
		await loadIframe();

		window.dispatchEvent(new Event("pagehide"));
		expect(savedPosition()).toBe(63);
	});

	test("API読み込み失敗時も通常の自動再生URLを維持する", async () => {
		expect(getWindowWithYouTube().YT).toBeUndefined();
		const originalAppend = document.head.append;
		let apiScript: HTMLScriptElement | null = null;
		document.head.append = ((...nodes: Node[]) => {
			const [node] = nodes;
			if (node instanceof HTMLScriptElement) {
				apiScript = node;
			}
		}) as typeof document.head.append;
		await mountEmbed();
		await clickPlayButton();
		await loadIframe();

	await waitFor(() => {
			expect(apiScript).not.toBeNull();
		});
		requireScript(apiScript).dispatchEvent(new Event("error"));
		document.head.append = originalAppend;

		expect(getIframe().src).toContain("autoplay=1");
		expect(getIframe().src).toContain("enablejsapi=1");
	});
});
