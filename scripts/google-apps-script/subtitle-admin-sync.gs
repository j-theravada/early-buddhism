// Run this standalone Apps Script as an operator who can read the response sheet.
// Keep CLERK_SECRET_KEY in Script Properties, never in this source or the sheet.
const SUBTITLE_ADMIN_SPREADSHEET_ID =
	"1alpK1If6uBD7A3qQeXMsRsPArAAJKfouHrLmo3rf8TU";
const SUBTITLE_ADMIN_SHEET_ID = 1824227588;
const SUBTITLE_ADMIN_EMAIL_HEADER = "初期仏教塾アカウントのメールアドレス";

function normalizeApplicantEmails(values) {
	const emails = new Set();
	let invalid = 0;
	for (const [value = ""] of values) {
		const email = value.trim().toLowerCase();
		if (!email) continue;
		if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) emails.add(email);
		else invalid += 1;
	}
	return { emails: [...emails], invalid };
}

function requestClerk(secretKey, method, path, body) {
	const options = {
		method,
		contentType: "application/json",
		headers: {
			Authorization: `Bearer ${secretKey}`,
			"Clerk-API-Version": "2026-05-12",
		},
		followRedirects: false,
		muteHttpExceptions: true,
	};
	if (body !== null) options.payload = JSON.stringify(body);
	let response;
	try {
		response = UrlFetchApp.fetch(`https://api.clerk.com/v1${path}`, options);
	} catch {
		throw new Error("Clerkに接続できません。次の同期で再試行します。");
	}
	const status = response.getResponseCode();
	if (status < 200 || status >= 300) {
		// Do not log responses, request headers, or applicant addresses.
		throw new Error(
			`Clerk API error: HTTP ${status}. 次の同期で再試行します。`,
		);
	}
	return JSON.parse(response.getContentText());
}

function syncSubtitleAdministrators() {
	const secretKey = PropertiesService.getScriptProperties()
		.getProperty("CLERK_SECRET_KEY")
		?.trim();
	if (!secretKey?.startsWith("sk_live_")) {
		throw new Error(
			"Script Propertiesに本番のCLERK_SECRET_KEYを設定してください。",
		);
	}
	// The response sheet's account email is column C. Verify its header before
	// granting anything; the advanced Sheets service supports readonly scopes.
	const spreadsheet = Sheets.Spreadsheets.get(SUBTITLE_ADMIN_SPREADSHEET_ID, {
		fields: "sheets(properties(sheetId,title))",
	});
	const title = spreadsheet.sheets?.find(
		(sheet) => sheet.properties.sheetId === SUBTITLE_ADMIN_SHEET_ID,
	)?.properties.title;
	if (!title) throw new Error("応募フォームの回答シートが見つかりません。");
	const response = Sheets.Spreadsheets.Values.get(
		SUBTITLE_ADMIN_SPREADSHEET_ID,
		`'${title.replace(/'/g, "''")}'!C:C`,
		{ valueRenderOption: "FORMATTED_VALUE", majorDimension: "ROWS" },
	);
	const [header, ...rows] = response.values ?? [];
	if (header?.[0]?.trim() !== SUBTITLE_ADMIN_EMAIL_HEADER) {
		throw new Error(
			"C列の応募メール見出しを確認できません。回答シートを確認してください。",
		);
	}
	const { emails, invalid } = normalizeApplicantEmails(rows);
	let granted = 0;
	let matched = 0;
	for (const applicantEmail of emails) {
		const users = requestClerk(
			secretKey,
			"get",
			`/users?limit=1&email_address=${encodeURIComponent(applicantEmail)}`,
			null,
		);
		for (const user of users) {
			const hasVerifiedEmail = user.email_addresses.some(
				(email) =>
					email.verification?.status === "verified" &&
					email.email_address.trim().toLowerCase() === applicantEmail,
			);
			if (!hasVerifiedEmail) continue;
			matched += 1;
			if (user.private_metadata?.role === "subtitle_admin") continue;
			requestClerk(
				secretKey,
				"patch",
				`/users/${encodeURIComponent(user.id)}/metadata`,
				{ private_metadata: { role: "subtitle_admin" } },
			);
			granted += 1;
		}
	}
	const result = {
		applicants: emails.length,
		invalid,
		granted,
		awaitingRegistration: emails.length - matched,
	};
	console.log(JSON.stringify(result));
	return result;
}

function installSubtitleAdminSync() {
	// Validate access and synchronize existing applicants before installing the timer.
	syncSubtitleAdministrators();
	const previousTimers = ScriptApp.getProjectTriggers().filter(
		(trigger) =>
			trigger.getHandlerFunction() === "syncSubtitleAdministrators" &&
			trigger.getEventType() === ScriptApp.EventType.CLOCK,
	);
	ScriptApp.newTrigger("syncSubtitleAdministrators")
		.timeBased()
		.atHour(3)
		.everyDays(1)
		.create();
	for (const trigger of previousTimers) ScriptApp.deleteTrigger(trigger);
}
