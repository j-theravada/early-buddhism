// Test-only browser globals and fetch replacement require Happy DOM adapter casts.
/* oxlint-disable anti-slop/no-runtime-typeof, anti-slop/no-unknown-parameters, anti-slop/require-safety-comment-for-type-assertion */
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

type LoaderProps = {
	talkId: string;
	targetCueIndex?: number | null;
	transcriptHighlightQuery?: string | null;
};

type CapturedRequest = {
	input: RequestInfo | URL;
	signal: AbortSignal | null;
};

type FetchResponder = (
	attempt: number,
	input: RequestInfo | URL,
	init?: RequestInit,
) => Response | Promise<Response>;

const testWindow = new Window({ url: "http://localhost" });
const originalFetch = globalThis.fetch;
const originalGlobals = new Map<string, PropertyDescriptor | undefined>();

let createRoot: typeof import("react-dom/client").createRoot;
let TranscriptSectionLoader: typeof import("./transcript-section-loader").default;
let currentRoot: Root | null = null;
let currentContainer: HTMLElement | null = null;

const TRANSCRIPT_CUE = {
	index: 7,
	start: 10,
	end: 13,
	startLabel: "00:00:10",
	endLabel: "00:00:13",
	text: "慈悲のタイムライン本文",
};

function installGlobal(name: string, value: unknown) {
	originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
	Object.defineProperty(globalThis, name, {
		configurable: true,
		value,
		writable: true,
	});
}

function installFetch(responder: FetchResponder): CapturedRequest[] {
	const requests: CapturedRequest[] = [];
	globalThis.fetch = (async (input, init) => {
		requests.push({ input, signal: init?.signal ?? null });
		return responder(requests.length, input, init);
	}) as typeof fetch;
	return requests;
}

function transcriptResponse(text = TRANSCRIPT_CUE.text): Response {
	return new Response(
		JSON.stringify({
			transcript: [{ ...TRANSCRIPT_CUE, text }],
		}),
		{
			headers: { "Content-Type": "application/json" },
			status: 200,
		},
	);
}

function missingResponse(): Response {
	return new Response(JSON.stringify({ error: "Transcript not found." }), {
		headers: { "Content-Type": "application/json" },
		status: 404,
	});
}

async function mountLoader(props: LoaderProps) {
	currentContainer = document.createElement("div");
	document.body.append(currentContainer);
	currentRoot = createRoot(currentContainer);

	await rerenderLoader(props);
	return currentContainer;
}

async function rerenderLoader(props: LoaderProps) {
	if (!currentRoot) throw new Error("Loader is not mounted.");

	await act(async () => {
		currentRoot?.render(
			<TranscriptSectionLoader {...props}>
				<p>SSR済み全文</p>
			</TranscriptSectionLoader>,
		);
	});
}

async function unmountLoader() {
	if (!currentRoot) return;

	await act(async () => {
		currentRoot?.unmount();
	});
	currentRoot = null;
}

function getModeButton(label: string): HTMLButtonElement {
	const button = Array.from(
		currentContainer?.querySelectorAll("button") ?? [],
	).find((candidate) => candidate.textContent === label);
	if (!button) throw new Error(`Mode button not found: ${label}`);
	return button;
}

async function selectMode(label: string) {
	await act(async () => {
		getModeButton(label).click();
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

beforeAll(async () => {
	installGlobal("window", testWindow);
	installGlobal("self", testWindow);
	installGlobal("document", testWindow.document);
	installGlobal("navigator", testWindow.navigator);
	installGlobal("Node", testWindow.Node);
	installGlobal("Element", testWindow.Element);
	installGlobal("HTMLElement", testWindow.HTMLElement);
	installGlobal("HTMLIFrameElement", testWindow.HTMLIFrameElement);
	installGlobal("Event", testWindow.Event);
	installGlobal("MouseEvent", testWindow.MouseEvent);
	installGlobal("CustomEvent", testWindow.CustomEvent);
	installGlobal("DOMException", testWindow.DOMException);
	installGlobal("MutationObserver", testWindow.MutationObserver);
	installGlobal("IS_REACT_ACT_ENVIRONMENT", true);

	if (typeof testWindow.Element.prototype.scrollIntoView !== "function") {
		Object.defineProperty(testWindow.Element.prototype, "scrollIntoView", {
			configurable: true,
			value: () => {},
			writable: true,
		});
	}

	({ createRoot } = await import("react-dom/client"));
	({ default: TranscriptSectionLoader } =
		await import("./transcript-section-loader"));
});

afterEach(async () => {
	await unmountLoader();
	currentContainer?.remove();
	currentContainer = null;
	document.body.replaceChildren();
	globalThis.fetch = originalFetch;
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

describe("TranscriptSectionLoader client effects", () => {
	test("通常表示ではタイムラインAPIを取得しない", async () => {
		const requests = installFetch(() => transcriptResponse());
		const container = await mountLoader({ talkId: "TALK-1" });

		expect(requests).toHaveLength(0);
		expect(container.textContent).toContain("SSR済み全文");
	});

	test("タイムラインを選ぶと一度だけ取得して表示する", async () => {
		const requests = installFetch(() => transcriptResponse());
		const container = await mountLoader({ talkId: "TALK-1" });

		await selectMode("タイムライン付き");
		await waitFor(() => {
			expect(container.textContent).toContain("慈悲のタイムライン本文");
		});

		expect(requests).toHaveLength(1);
		expect(String(requests[0]?.input)).toBe("/api/transcripts/TALK-1");
	});

	test("取得済みデータは読みやすく表示へ戻っても再利用する", async () => {
		const requests = installFetch(() => transcriptResponse());
		const container = await mountLoader({ talkId: "TALK-1" });

		await selectMode("タイムライン付き");
		await waitFor(() => {
			expect(container.textContent).toContain("慈悲のタイムライン本文");
		});
		await selectMode("読みやすく");
		expect(container.textContent).toContain("SSR済み全文");
		await selectMode("タイムライン付き");
		await waitFor(() => {
			expect(container.textContent).toContain("慈悲のタイムライン本文");
		});

		expect(requests).toHaveLength(1);
	});

	for (const [label, deepLinkProps] of [
		["cue", { targetCueIndex: 7 }],
		["検索語", { transcriptHighlightQuery: "慈悲" }],
	] as const) {
		test(`初期${label}ディープリンクは自動取得する`, async () => {
			const requests = installFetch(() => transcriptResponse());
			const container = await mountLoader({
				talkId: "TALK-1",
				...deepLinkProps,
			});

			await waitFor(() => {
				expect(container.textContent).toContain("慈悲のタイムライン本文");
			});

			expect(requests).toHaveLength(1);
			expect(
				getModeButton("タイムライン付き").getAttribute("aria-selected"),
			).toBe("true");
		});
	}

	test("同じ法話でcue指定が追加されたらタイムラインへ切り替える", async () => {
		const requests = installFetch(() => transcriptResponse());
		const container = await mountLoader({ talkId: "TALK-1" });
		expect(requests).toHaveLength(0);

		await rerenderLoader({ talkId: "TALK-1", targetCueIndex: 7 });
		await waitFor(() => {
			expect(container.textContent).toContain("慈悲のタイムライン本文");
		});

		expect(requests).toHaveLength(1);
		expect(container.querySelector("#transcript-cue-7")).not.toBeNull();
		expect(
			getModeButton("タイムライン付き").getAttribute("aria-selected"),
		).toBe("true");
	});

	test("ディープリンク解除時は手動で選んだ読みやすい表示を保つ", async () => {
		const requests = installFetch(() => transcriptResponse());
		const container = await mountLoader({
			talkId: "TALK-1",
			targetCueIndex: 7,
		});
		await waitFor(() => {
			expect(container.textContent).toContain("慈悲のタイムライン本文");
		});

		await selectMode("読みやすく");
		await rerenderLoader({ talkId: "TALK-1", targetCueIndex: null });

		expect(container.textContent).toContain("SSR済み全文");
		expect(getModeButton("読みやすく").getAttribute("aria-selected")).toBe(
			"true",
		);
		expect(requests).toHaveLength(1);
	});

	for (const [label, firstFailure] of [
		["404", () => Promise.resolve(missingResponse())],
		["通信エラー", () => Promise.reject(new Error("offline"))],
	] as const) {
		test(`${label}でも全文を残してタイムラインを再取得できる`, async () => {
			const requests = installFetch((attempt) =>
				attempt === 1 ? firstFailure() : transcriptResponse("再取得した本文"),
			);
			const container = await mountLoader({ talkId: "TALK-1" });

			await selectMode("タイムライン付き");
			await waitFor(() => {
				expect(container.textContent).toContain(
					"タイムラインを読み込めませんでした",
				);
			});
			expect(container.textContent).toContain("SSR済み全文");

			await selectMode("タイムライン付き");
			await waitFor(() => {
				expect(container.textContent).toContain("再取得した本文");
			});

			expect(requests).toHaveLength(2);
		});
	}

	test("取得中に法話が変わると前のリクエストを中止する", async () => {
		const requests = installFetch((_attempt, input) =>
			String(input).endsWith("TALK-1")
				? new Promise<Response>(() => {})
				: transcriptResponse("次の法話本文"),
		);
		const container = await mountLoader({
			talkId: "TALK-1",
			targetCueIndex: 7,
		});
		await waitFor(() => expect(requests).toHaveLength(1));

		await rerenderLoader({ talkId: "TALK-2", targetCueIndex: 7 });
		await waitFor(() => {
			expect(container.textContent).toContain("次の法話本文");
		});

		expect(requests).toHaveLength(2);
		expect(requests[0]?.signal?.aborted).toBe(true);
	});

	test("取得中にアンマウントするとリクエストを中止する", async () => {
		const requests = installFetch(() => new Promise<Response>(() => {}));
		await mountLoader({ talkId: "TALK-1", targetCueIndex: 7 });
		await waitFor(() => expect(requests).toHaveLength(1));

		await unmountLoader();

		expect(requests[0]?.signal?.aborted).toBe(true);
	});
});
