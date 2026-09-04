import { describe, expect, test } from "bun:test";
import { createGeneratedDataWorkflowDispatcher } from "./generated-data-workflow";

describe("generated data workflow dispatcher", () => {
	test("指定refで生成ワークフローを起動する", async () => {
		let capturedInput = "";
		let capturedInit: RequestInit | undefined;
		const dispatch = createGeneratedDataWorkflowDispatcher(
			{
				repository: "owner/repository",
				ref: "main",
				token: "TOKEN",
			},
			async (input, init) => {
				capturedInput = String(input);
				capturedInit = init;
				return new Response(null, { status: 204 });
			},
		);

		await dispatch();

		expect(capturedInput).toBe(
			"https://api.github.com/repos/owner/repository/actions/workflows/generate-talks.yml/dispatches",
		);
		expect(capturedInit).toMatchObject({
			method: "POST",
			body: JSON.stringify({ ref: "main" }),
		});
	});
});
