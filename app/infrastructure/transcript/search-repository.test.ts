import { describe, expect, test } from "bun:test";
import type { TranscriptSearchDocument } from "./search-document";
import { createTranscriptSearchDocumentsLoader } from "./search-repository";

describe("transcript search documents loader", () => {
	test("失敗後は再試行し成功したPromiseは再利用する", async () => {
		let loadCalls = 0;
		const documents: TranscriptSearchDocument[] = [];
		const load = createTranscriptSearchDocumentsLoader(async () => {
			loadCalls += 1;
			if (loadCalls === 1) throw new Error("temporary document failure");
			return documents;
		});

		await expect(load()).rejects.toThrow("temporary document failure");
		const [first, second] = await Promise.all([load(), load()]);
		expect(first).toBe(documents);
		expect(second).toBe(documents);
		expect(await load()).toBe(documents);
		expect(loadCalls).toBe(2);
	});
});
