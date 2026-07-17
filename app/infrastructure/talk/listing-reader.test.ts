import { describe, expect, test } from "bun:test";
import type { TranscriptAwareSearchData } from "../../application/talk/transcript-search";
import { createSearchDataLoader } from "./listing-reader";

describe("talk listing search data loader", () => {
	test("失敗後は再試行し成功したPromiseは再利用する", async () => {
		let loadCalls = 0;
		const searchData: TranscriptAwareSearchData = {
			indexedTalks: [],
			transcriptDocumentByTalkId: new Map(),
			transcriptSearchTextByTalkId: new Map(),
		};
		const load = createSearchDataLoader(async () => {
			loadCalls += 1;
			if (loadCalls === 1) throw new Error("temporary search data failure");
			return searchData;
		});

		await expect(load()).rejects.toThrow("temporary search data failure");
		const [first, second] = await Promise.all([load(), load()]);
		expect(first).toBe(searchData);
		expect(second).toBe(searchData);
		expect(await load()).toBe(searchData);
		expect(loadCalls).toBe(2);
	});
});
