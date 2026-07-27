import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	mock,
	test,
} from "bun:test";
import { Window } from "happy-dom";
import { act, type AnchorHTMLAttributes, type ReactNode } from "react";
import type { Root } from "react-dom/client";
import {
	WATCH_HISTORY_STORAGE_KEY,
	type WatchHistoryEntry,
} from "../application/watch-history";

type TestLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
	children?: ReactNode;
	href: string;
	prefetch?: boolean;
};

mock.module("next/link", () => ({
	default: ({
		children,
		href,
		prefetch: _prefetch,
		...props
	}: TestLinkProps) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

const testWindow = new Window({ url: "http://localhost" });
const originalGlobals = new Map<string, PropertyDescriptor | undefined>();

let createRoot: typeof import("react-dom/client").createRoot;
let WatchHistoryList: typeof import("./watch-history-list").default;
let currentRoot: Root | null = null;
let currentContainer: HTMLElement | null = null;
let originalGetItem: typeof localStorage.getItem;

function installGlobal(name: string, value: unknown) {
	originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
	Object.defineProperty(globalThis, name, {
		configurable: true,
		value,
		writable: true,
	});
}

async function mountHistoryList() {
	currentContainer = document.createElement("div");
	document.body.append(currentContainer);
	currentRoot = createRoot(currentContainer);

	await rerenderHistoryList();

	return currentContainer;
}

async function rerenderHistoryList() {
	if (!currentRoot) throw new Error("Watch history list is not mounted.");

	await act(async () => {
		currentRoot?.render(<WatchHistoryList />);
		await new Promise((resolve) => setTimeout(resolve, 0));
	});
}

async function unmountHistoryList() {
	if (!currentRoot) return;

	await act(async () => {
		currentRoot?.unmount();
	});
	currentRoot = null;
}

function writeHistory(entry: WatchHistoryEntry) {
	testWindow.localStorage.setItem(
		WATCH_HISTORY_STORAGE_KEY,
		JSON.stringify({ [entry.talkId]: entry }),
	);
}

function replaceStorage(getItem: Storage["getItem"]) {
	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		value: {
			clear: () => testWindow.localStorage.clear(),
			getItem,
			key: (index: number) => testWindow.localStorage.key(index),
			get length() {
				return testWindow.localStorage.length;
			},
			removeItem: (key: string) => testWindow.localStorage.removeItem(key),
			setItem: (key: string, value: string) =>
				testWindow.localStorage.setItem(key, value),
		} satisfies Storage,
		writable: true,
	});
}

const entry: WatchHistoryEntry = {
	completed: false,
	durationSeconds: 600,
	lastWatchedAt: "2026-07-27T01:45:00.000Z",
	positionSeconds: 65,
	talkId: "TALK-CLIENT",
	thumbnailUrl: null,
	title: "クライアント履歴の法話",
};

beforeAll(async () => {
	installGlobal("window", testWindow);
	installGlobal("self", testWindow);
	installGlobal("document", testWindow.document);
	installGlobal("navigator", testWindow.navigator);
	installGlobal("Node", testWindow.Node);
	installGlobal("Element", testWindow.Element);
	installGlobal("HTMLElement", testWindow.HTMLElement);
	installGlobal("Event", testWindow.Event);
	installGlobal("localStorage", testWindow.localStorage);
	installGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	originalGetItem = localStorage.getItem.bind(localStorage);

	({ createRoot } = await import("react-dom/client"));
	({ default: WatchHistoryList } = await import("./watch-history-list"));
});

afterEach(async () => {
	await unmountHistoryList();
	currentContainer?.remove();
	currentContainer = null;
	document.body.replaceChildren();
	testWindow.localStorage.clear();
	replaceStorage(originalGetItem);
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

describe("WatchHistoryList client storage", () => {
	test("マウント後に一度だけ履歴を読み、通常の再描画でも保存済み履歴を保つ", async () => {
		writeHistory(entry);
		let reads = 0;
		replaceStorage((key: string) => {
			if (key === WATCH_HISTORY_STORAGE_KEY) reads += 1;
			return originalGetItem(key);
		});

		const container = await mountHistoryList();

		expect(container.textContent).toContain("クライアント履歴の法話");
		expect(reads).toBe(1);

		await rerenderHistoryList();

		expect(container.textContent).toContain("クライアント履歴の法話");
		expect(reads).toBe(1);
	});

	test("ストレージ読込失敗時は空履歴を表示する", async () => {
		replaceStorage(() => {
			throw new Error("blocked");
		});

		const container = await mountHistoryList();

		expect(container.textContent).toContain("視聴履歴はまだありません");
	});
});
