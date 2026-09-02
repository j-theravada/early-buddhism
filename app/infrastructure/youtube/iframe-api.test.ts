// Test-only browser globals and DOM method replacement require Happy DOM adapter casts.
/* oxlint-disable anti-slop/no-chained-type-assertions, anti-slop/no-unknown-parameters, anti-slop/require-safety-comment-for-type-assertion */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import type { YouTubeIframeApi } from "./iframe-api";

const testWindow = new Window({ url: "http://localhost" });
const originalGlobals = new Map<string, PropertyDescriptor | undefined>();

let loadYouTubeIframeApi: typeof import("./iframe-api").loadYouTubeIframeApi;

function installGlobal(name: string, value: unknown) {
	originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
	Object.defineProperty(globalThis, name, {
		configurable: true,
		value,
		writable: true,
	});
}

function getYouTubeWindow() {
	return window as unknown as typeof globalThis & {
		YT?: YouTubeIframeApi;
		onYouTubeIframeAPIReady?: (() => void) | null;
	};
}

function createApi(): YouTubeIframeApi {
	return {
		Player: class {
			getCurrentTime = () => 0;
			getDuration = () => 0;
			destroy = () => {};
		},
	};
}

beforeAll(async () => {
	installGlobal("window", testWindow);
	installGlobal("document", testWindow.document);
	installGlobal("Event", testWindow.Event);
	installGlobal("HTMLScriptElement", testWindow.HTMLScriptElement);

	({ loadYouTubeIframeApi } = await import("./iframe-api"));
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

describe("loadYouTubeIframeApi", () => {
	test("既存APIはscriptを追加せず即時に返す", async () => {
		const youtubeWindow = getYouTubeWindow();
		const api = createApi();
		youtubeWindow.YT = api;

		await expect(loadYouTubeIframeApi()).resolves.toBe(api);

		Reflect.deleteProperty(youtubeWindow, "YT");
	});

	test("同時呼び出し、既存script、失敗後の再試行、外部callbackを安全に扱う", async () => {
		const youtubeWindow = getYouTubeWindow();
		const originalAppend = document.head.append;
		const originalQuerySelector = document.querySelector;
		const appended: HTMLScriptElement[] = [];
		let existingScript: HTMLScriptElement | null = null;
		document.head.append = ((...nodes: Node[]) => {
			for (const node of nodes) {
				if (node instanceof HTMLScriptElement) {
					appended.push(node);
					existingScript = node;
				}
			}
		}) as typeof document.head.append;
		document.querySelector = ((selector: string) =>
			selector === 'script[src="https://www.youtube.com/iframe_api"]'
				? existingScript
				: originalQuerySelector.call(
						document,
						selector,
					)) as typeof document.querySelector;

		const first = loadYouTubeIframeApi();
		const second = loadYouTubeIframeApi();
		expect(second).toBe(first);
		expect(appended).toHaveLength(1);

		youtubeWindow.onYouTubeIframeAPIReady?.();
		await expect(first).rejects.toThrow(
			"YouTube iframe API did not provide Player.",
		);

		const retryAfterReady = loadYouTubeIframeApi();
		expect(appended).toHaveLength(2);
		const concurrentCallback = () => {};
		youtubeWindow.onYouTubeIframeAPIReady = concurrentCallback;
		appended[1]?.dispatchEvent(new Event("error"));
		await expect(retryAfterReady).rejects.toThrow(
			"Failed to load the YouTube iframe API.",
		);
		expect(youtubeWindow.onYouTubeIframeAPIReady).toBe(concurrentCallback);

		existingScript = document.createElement("script");
		existingScript.src = "https://www.youtube.com/iframe_api";
		let priorCalls = 0;
		youtubeWindow.onYouTubeIframeAPIReady = () => {
			priorCalls += 1;
			throw new Error("external callback failed");
		};

		const retry = loadYouTubeIframeApi();
		expect(appended).toHaveLength(2);
		const api = createApi();
		youtubeWindow.YT = api;
		expect(() => youtubeWindow.onYouTubeIframeAPIReady?.()).not.toThrow();
		await expect(retry).resolves.toBe(api);
		expect(priorCalls).toBe(1);

		document.head.append = originalAppend;
		document.querySelector = originalQuerySelector;
		Reflect.deleteProperty(youtubeWindow, "YT");
		Reflect.deleteProperty(youtubeWindow, "onYouTubeIframeAPIReady");
	});
});
