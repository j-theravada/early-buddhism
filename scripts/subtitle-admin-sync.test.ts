import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { hasSubtitleAdminRole } from "../app/application/auth/subtitle-admin";

const source = readFileSync(
	new URL("./google-apps-script/subtitle-admin-sync.gs", import.meta.url),
	"utf8",
);
const emailHeader = "初期仏教塾アカウントのメールアドレス";

function createSync() {
	let rows = [
		["APPLICANT@example.com"],
		["applicant@example.com"],
		["later@example.com"],
	];
	let header = emailHeader;
	let registered = true;
	let verified = true;
	let status = 200;
	let fetchError: string | null = null;
	let metadata = { note: "keep", role: "" };
	const requests: { url: string; method: string; payload?: string }[] = [];
	const logs: string[] = [];
	const triggers: {
		handler: string;
		type: string;
		minutes?: number;
		hour?: number;
		days?: number;
	}[] = [];
	const scriptServices = {
		PropertiesService: {
			getScriptProperties: () => ({
				getProperty: () => "sk_live_test-placeholder",
			}),
		},
		Sheets: {
			Spreadsheets: {
				get: () => ({
					sheets: [
						{
							properties: { sheetId: 1824227588, title: "フォームの回答 '1'" },
						},
					],
				}),
				Values: {
					get: (spreadsheetId: string, range: string) => {
						expect(spreadsheetId).toBe(
							"1alpK1If6uBD7A3qQeXMsRsPArAAJKfouHrLmo3rf8TU",
						);
						expect(range).toBe("'フォームの回答 ''1'''!C:C");
						return { values: [[header], ...rows] };
					},
				},
			},
		},
		UrlFetchApp: {
			fetch: (url: string, options: { method: string; payload?: string }) => {
				requests.push({ url, ...options });
				if (fetchError) throw new Error(fetchError);
				const query = new URL(url);
				const found =
					registered &&
					query.searchParams.get("email_address") === "applicant@example.com";
				if (options.method === "patch" && status === 200) {
					// SAFETY: The tested script owns this JSON request schema.
					const body = JSON.parse(options.payload ?? "null") as {
						private_metadata: { role: string };
					};
					metadata = { ...metadata, ...body.private_metadata };
				}
				return {
					getResponseCode: () => status,
					getContentText: () =>
						JSON.stringify(
							options.method === "patch"
								? {}
								: found
									? [
											{
												id: "user_applicant",
												private_metadata: metadata,
												email_addresses: [
													{
														email_address: "applicant@example.com",
														verification: {
															status: verified ? "verified" : "unverified",
														},
													},
													{
														email_address: "other@example.com",
														verification: { status: "verified" },
													},
												],
											},
										]
									: [],
						),
				};
			},
		},
		ScriptApp: {
			EventType: { CLOCK: "clock" },
			getProjectTriggers: () =>
				triggers.map((trigger) => ({
					record: trigger,
					getHandlerFunction: () => trigger.handler,
					getEventType: () => trigger.type,
				})),
			deleteTrigger: (trigger: { record: (typeof triggers)[number] }) => {
				const index = triggers.indexOf(trigger.record);
				if (index < 0) throw new Error("Unknown trigger");
				triggers.splice(index, 1);
			},
			newTrigger: (handler: string) => {
				expect(handler).toBe("syncSubtitleAdministrators");
				let type = "";
				let hour = 0;
				let days = 0;
				const builder = {
					timeBased: () => {
						type = "clock";
						return builder;
					},
					atHour: (value: number) => {
						hour = value;
						return builder;
					},
					everyDays: (value: number) => {
						days = value;
						return builder;
					},
					create: () => {
						triggers.push({ handler, type, hour, days });
					},
				};
				return builder;
			},
		},
		console: { log: (message: string) => logs.push(message) },
	};
	// SAFETY: These are the two global entry points in the checked-in Apps Script.
	const script = runInNewContext(
		`${source}\n({ syncSubtitleAdministrators, installSubtitleAdminSync })`,
		scriptServices,
	) as {
		syncSubtitleAdministrators: () => {
			applicants: number;
			invalid: number;
			granted: number;
			awaitingRegistration: number;
		};
		installSubtitleAdminSync: () => void;
	};
	return {
		...script,
		requests,
		logs,
		triggers,
		getMetadata: () => metadata,
		setRegistered: (value: boolean) => {
			registered = value;
		},
		setVerified: (value: boolean) => {
			verified = value;
		},
		setStatus: (value: number) => {
			status = value;
		},
		setFetchError: (value: string | null) => {
			fetchError = value;
		},
		setRows: (value: string[][]) => {
			rows = value;
		},
		setHeader: (value: string) => {
			header = value;
		},
	};
}

test("応募メールを正規化・重複排除し、既存メタデータを残してアプリが認める権限を付与する", () => {
	const sync = createSync();
	expect(sync.syncSubtitleAdministrators()).toEqual({
		applicants: 2,
		invalid: 0,
		granted: 1,
		awaitingRegistration: 1,
	});
	expect(sync.getMetadata().note).toBe("keep");
	expect(hasSubtitleAdminRole(sync.getMetadata())).toBe(true);
	expect(sync.requests.filter(({ method }) => method === "patch")).toHaveLength(
		1,
	);
	expect(sync.logs.join()).not.toContain("@example.com");
	expect(sync.logs.join()).not.toContain("sk_live_");
	expect(sync.syncSubtitleAdministrators().granted).toBe(0);
});

test("未登録・応募メール未確認なら別のメールが確認済みでも付与せず、登録と確認後の同期で付与する", () => {
	const sync = createSync();
	sync.setRegistered(false);
	expect(sync.syncSubtitleAdministrators().granted).toBe(0);
	sync.setRegistered(true);
	sync.setVerified(false);
	expect(sync.syncSubtitleAdministrators().granted).toBe(0);
	expect(sync.requests.filter(({ method }) => method === "patch")).toHaveLength(
		0,
	);
	sync.setVerified(true);
	expect(sync.syncSubtitleAdministrators().granted).toBe(1);
});

test.each([
	{ status: 429, fetchError: null, expected: "HTTP 429" },
	{
		status: 200,
		fetchError:
			"Fetch failed: https://api.clerk.com/v1/users?email_address=applicant@example.com, sk_live_test-placeholder",
		expected: "Clerkに接続できません",
	},
])(
	"Clerkの一時エラー後に再試行でき、エラーにもメールや鍵を含めない: $expected",
	({ status, fetchError, expected }) => {
		const sync = createSync();
		sync.setStatus(status);
		sync.setFetchError(fetchError);
		let failure: unknown;
		try {
			sync.syncSubtitleAdministrators();
		} catch (error) {
			failure = error;
		}
		expect(String(failure)).toContain(expected);
		expect(String(failure)).not.toContain("@example.com");
		expect(String(failure)).not.toContain("sk_live_");
		expect(hasSubtitleAdminRole(sync.getMetadata())).toBe(false);
		sync.setStatus(200);
		sync.setFetchError(null);
		expect(sync.syncSubtitleAdministrators().granted).toBe(1);
	},
);

test("応募メール列の見出しが変わればClerkに接続する前に停止する", () => {
	const sync = createSync();
	for (const header of ["", "お名前"]) {
		sync.setHeader(header);
		expect(() => sync.syncSubtitleAdministrators()).toThrow(
			"C列の応募メール見出しを確認できません",
		);
	}
	expect(sync.requests).toHaveLength(0);
});

test("不正な回答だけを除外して件数を記録し、他の応募者への付与を続ける", () => {
	const sync = createSync();
	sync.setRows([
		["not an email"],
		["applicant@example.com"],
		["foo@gmail"],
		["applicant@example.com"],
		[" "],
		[],
	]);
	expect(sync.syncSubtitleAdministrators()).toEqual({
		applicants: 1,
		invalid: 2,
		granted: 1,
		awaitingRegistration: 0,
	});
	expect(sync.requests.filter(({ method }) => method === "get")).toHaveLength(
		1,
	);
	expect(JSON.parse(sync.logs[0] ?? "null")).toEqual({
		applicants: 1,
		invalid: 2,
		granted: 1,
		awaitingRegistration: 0,
	});
});

test("5分同期を毎日午前3時台の1件へ変更し、空の回答・再設置でも他のトリガーを残す", () => {
	const sync = createSync();
	sync.setRows([]);
	sync.triggers.push({ handler: "otherTask", type: "clock" });
	sync.triggers.push({
		handler: "syncSubtitleAdministrators",
		type: "clock",
		minutes: 5,
	});
	sync.installSubtitleAdminSync();
	sync.installSubtitleAdminSync();
	expect(sync.requests).toHaveLength(0);
	expect(sync.triggers).toEqual([
		{ handler: "otherTask", type: "clock" },
		{ handler: "syncSubtitleAdministrators", type: "clock", hour: 3, days: 1 },
	]);
});
