import { afterEach, describe, expect, test } from "bun:test";
import {
	assertGoogleDriveWorkloadIdentityConfig,
	createGoogleDriveTranscriptFileClient,
} from "./transcript-file";

const CONFIG_ENV = {
	GOOGLE_DRIVE_GCP_PROJECT_NUMBER: process.env.GOOGLE_DRIVE_GCP_PROJECT_NUMBER,
	GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL:
		process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL,
	GOOGLE_DRIVE_WORKLOAD_IDENTITY_POOL_ID:
		process.env.GOOGLE_DRIVE_WORKLOAD_IDENTITY_POOL_ID,
	GOOGLE_DRIVE_WORKLOAD_IDENTITY_POOL_PROVIDER_ID:
		process.env.GOOGLE_DRIVE_WORKLOAD_IDENTITY_POOL_PROVIDER_ID,
};

afterEach(() => {
	for (const [name, value] of Object.entries(CONFIG_ENV)) {
		if (value === undefined) delete process.env[name];
		else process.env[name] = value;
	}
});

describe("Google Drive transcript file client", () => {
	test("同じfile IDのSRT本文を取得して更新する", async () => {
		const requests: Array<{ input: string; init: RequestInit | undefined }> =
			[];
		const fetcher = async (
			input: RequestInfo | URL,
			init?: RequestInit,
		): Promise<Response> => {
			requests.push({ input: String(input), init });
			return requests.length === 1
				? new Response("1\n00:00:00,000 --> 00:00:01,000\n字幕")
				: new Response("{}", { status: 200 });
		};
		const client = createGoogleDriveTranscriptFileClient(
			"ACCESS_TOKEN",
			fetcher,
		);

		const content = await client.read("FILE/ID");
		await client.update("FILE/ID", `${content}\n`);

		expect(requests[0]?.input).toBe(
			"https://www.googleapis.com/drive/v3/files/FILE%2FID?alt=media&supportsAllDrives=true",
		);
		expect(requests[0]?.init?.headers).toEqual({
			Authorization: "Bearer ACCESS_TOKEN",
		});
		expect(requests[1]?.input).toBe(
			"https://www.googleapis.com/upload/drive/v3/files/FILE%2FID?uploadType=media&supportsAllDrives=true",
		);
		expect(requests[1]?.init).toMatchObject({
			body: `${content}\n`,
			method: "PATCH",
		});
	});

	test("Vercel OIDC用のGoogle Cloud設定を検証する", () => {
		process.env.GOOGLE_DRIVE_GCP_PROJECT_NUMBER = "265711275514";
		process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL =
			"gakurin-subtitle-publisher@early-buddhism-499507.iam.gserviceaccount.com";
		process.env.GOOGLE_DRIVE_WORKLOAD_IDENTITY_POOL_ID = "vercel";
		process.env.GOOGLE_DRIVE_WORKLOAD_IDENTITY_POOL_PROVIDER_ID = "vercel";

		expect(() => assertGoogleDriveWorkloadIdentityConfig()).not.toThrow();
		process.env.GOOGLE_DRIVE_GCP_PROJECT_NUMBER = "not-a-project-number";
		expect(() => assertGoogleDriveWorkloadIdentityConfig()).toThrow(
			"Missing or invalid GOOGLE_DRIVE_GCP_PROJECT_NUMBER.",
		);
	});
});
