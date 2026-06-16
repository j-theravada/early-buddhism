import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { normalizeTalkId } from "../../domain/talk/id";

const DATA_API_BASE_URL = "https://analyticsdata.googleapis.com/v1beta";
const DEFAULT_LOOKBACK_DAYS = 90;
const GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

type ServiceAccountCredentials = {
	type?: "service_account";
	client_email: string;
	private_key: string;
};

type AuthorizedUserCredentials = {
	type?: "authorized_user";
	client_id: string;
	client_secret?: string;
	refresh_token: string;
};

type GoogleAnalyticsCredentials =
	| ServiceAccountCredentials
	| AuthorizedUserCredentials;

type TokenResponse = {
	access_token?: string;
	error?: string;
	error_description?: string;
};

type RunReportResponse = {
	rows?: {
		dimensionValues?: { value?: string }[];
		metricValues?: { value?: string }[];
	}[];
};

export type PopularTalkPageView = {
	pagePath: string;
	talkId: string;
	views: number;
};

type PopularTalkPageViewsOptions = {
	limit?: number;
};

export function hasGoogleAnalyticsDataApiConfig(): boolean {
	return Boolean(
		getPropertyId() &&
		(process.env.GA4_SERVICE_ACCOUNT_JSON ||
			process.env.GA4_OAUTH_REFRESH_TOKEN ||
			process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
			process.env.GOOGLE_APPLICATION_CREDENTIALS ||
			(process.env.GA4_CLIENT_EMAIL && process.env.GA4_PRIVATE_KEY)),
	);
}

export async function getPopularTalkPageViews({
	limit = 12,
}: PopularTalkPageViewsOptions = {}): Promise<PopularTalkPageView[]> {
	const propertyResource = getPropertyResource();
	const credentials = await getServiceAccountCredentials();
	const accessToken = await getAccessToken(credentials);
	const lookbackDays = getPopularVideoLookbackDays();

	const response = await fetch(
		`${DATA_API_BASE_URL}/${propertyResource}:runReport`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				dateRanges: [
					{
						startDate: `${lookbackDays}daysAgo`,
						endDate: "today",
					},
				],
				dimensionFilter: {
					filter: {
						fieldName: "pagePath",
						stringFilter: {
							matchType: "BEGINS_WITH",
							value: "/talks/",
						},
					},
				},
				dimensions: [{ name: "pagePath" }],
				limit: Math.max(limit * 4, 20),
				metrics: [{ name: "screenPageViews" }],
				orderBys: [
					{
						desc: true,
						metric: { metricName: "screenPageViews" },
					},
				],
			}),
			cache: "no-store",
		},
	);

	if (!response.ok) {
		const body = await response.text();
		throw new Error(
			`GA4 Data API request failed: ${response.status} ${body.slice(0, 300)}`,
		);
	}

	const data = (await response.json()) as RunReportResponse;
	return aggregateTalkPageViews(data).slice(0, limit);
}

function aggregateTalkPageViews(
	data: RunReportResponse,
): PopularTalkPageView[] {
	const totals = new Map<string, PopularTalkPageView>();

	for (const row of data.rows ?? []) {
		const pagePath = row.dimensionValues?.[0]?.value ?? "";
		const talkId = extractTalkIdFromPath(pagePath);
		const views = Number.parseInt(row.metricValues?.[0]?.value ?? "0", 10);

		if (!talkId || !Number.isFinite(views) || views <= 0) continue;

		const normalizedTalkId = normalizeTalkId(talkId);
		const existing = totals.get(normalizedTalkId);
		totals.set(normalizedTalkId, {
			pagePath: existing?.pagePath ?? pagePath,
			talkId: normalizedTalkId,
			views: (existing?.views ?? 0) + views,
		});
	}

	return [...totals.values()].sort((a, b) => b.views - a.views);
}

function extractTalkIdFromPath(pagePath: string): string | null {
	const match = pagePath.match(/^\/talks\/([^/?#]+)/);
	if (!match) return null;

	try {
		return decodeURIComponent(match[1]);
	} catch {
		return match[1];
	}
}

async function getAccessToken(
	credentials: GoogleAnalyticsCredentials,
): Promise<string> {
	if (isAuthorizedUserCredentials(credentials)) {
		return getOAuthAccessToken(credentials);
	}

	return getServiceAccountAccessToken(credentials);
}

async function getOAuthAccessToken(
	credentials: AuthorizedUserCredentials,
): Promise<string> {
	const response = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: credentials.client_id,
			grant_type: "refresh_token",
			refresh_token: credentials.refresh_token,
			...(credentials.client_secret
				? { client_secret: credentials.client_secret }
				: {}),
		}),
		cache: "no-store",
	});

	const data = (await response.json()) as TokenResponse;
	if (!response.ok || !data.access_token) {
		throw new Error(
			`GA4 OAuth token request failed: ${data.error_description ?? data.error ?? response.statusText}`,
		);
	}

	return data.access_token;
}

async function getServiceAccountAccessToken(
	credentials: ServiceAccountCredentials,
): Promise<string> {
	const assertion = createJwtAssertion(credentials);
	const response = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			assertion,
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
		}),
		cache: "no-store",
	});

	const data = (await response.json()) as TokenResponse;
	if (!response.ok || !data.access_token) {
		throw new Error(
			`GA4 token request failed: ${data.error_description ?? data.error ?? response.statusText}`,
		);
	}

	return data.access_token;
}

function createJwtAssertion(credentials: ServiceAccountCredentials): string {
	const now = Math.floor(Date.now() / 1000);
	const header = encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
	const payload = encodeBase64Url(
		JSON.stringify({
			aud: TOKEN_URL,
			exp: now + 60 * 60,
			iat: now,
			iss: credentials.client_email,
			scope: GA4_SCOPE,
		}),
	);
	const unsignedToken = `${header}.${payload}`;
	const signer = createSign("RSA-SHA256");
	signer.update(unsignedToken);
	const signature = encodeBase64Url(signer.sign(credentials.private_key));
	return `${unsignedToken}.${signature}`;
}

function encodeBase64Url(input: string | Buffer): string {
	return Buffer.from(input)
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/g, "");
}

async function getServiceAccountCredentials(): Promise<GoogleAnalyticsCredentials> {
	const inlineJson =
		process.env.GA4_SERVICE_ACCOUNT_JSON ||
		process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

	if (inlineJson) {
		return parseGoogleAnalyticsCredentialsJson(inlineJson);
	}

	const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
	if (credentialsPath) {
		return parseGoogleAnalyticsCredentialsJson(
			await readFile(credentialsPath, "utf8"),
		);
	}

	const oauthCredentials = getOAuthCredentialsFromEnv();
	if (oauthCredentials) return oauthCredentials;

	const clientEmail = process.env.GA4_CLIENT_EMAIL?.trim();
	const privateKey = normalizePrivateKey(process.env.GA4_PRIVATE_KEY ?? "");
	if (clientEmail && privateKey) {
		return { client_email: clientEmail, private_key: privateKey };
	}

	throw new Error(
		"Missing GA4 credentials. Set GA4_SERVICE_ACCOUNT_JSON, GOOGLE_APPLICATION_CREDENTIALS, GA4_CLIENT_EMAIL with GA4_PRIVATE_KEY, or GA4_OAUTH_CLIENT_ID with GA4_OAUTH_CLIENT_SECRET and GA4_OAUTH_REFRESH_TOKEN.",
	);
}

function getOAuthCredentialsFromEnv(): AuthorizedUserCredentials | null {
	const clientId = process.env.GA4_OAUTH_CLIENT_ID?.trim();
	const clientSecret = process.env.GA4_OAUTH_CLIENT_SECRET?.trim();
	const refreshToken = process.env.GA4_OAUTH_REFRESH_TOKEN?.trim();

	if (!clientId && !clientSecret && !refreshToken) return null;

	if (!clientId || !refreshToken) {
		throw new Error(
			"GA4 OAuth credentials require GA4_OAUTH_CLIENT_ID and GA4_OAUTH_REFRESH_TOKEN. Set GA4_OAUTH_CLIENT_SECRET when the OAuth client requires one.",
		);
	}

	return {
		client_id: clientId,
		...(clientSecret ? { client_secret: clientSecret } : {}),
		refresh_token: refreshToken,
		type: "authorized_user",
	};
}

function parseGoogleAnalyticsCredentialsJson(
	json: string,
): GoogleAnalyticsCredentials {
	const parsed = JSON.parse(json) as Partial<
		ServiceAccountCredentials & AuthorizedUserCredentials
	>;

	if (isAuthorizedUserCredentials(parsed)) {
		return {
			client_id: parsed.client_id.trim(),
			...(parsed.client_secret?.trim()
				? { client_secret: parsed.client_secret.trim() }
				: {}),
			refresh_token: parsed.refresh_token.trim(),
			type: "authorized_user",
		};
	}

	return parseServiceAccountCredentials(parsed);
}

function parseServiceAccountCredentials(
	parsed: Partial<ServiceAccountCredentials>,
): ServiceAccountCredentials {
	const clientEmail = parsed.client_email?.trim();
	const privateKey = normalizePrivateKey(parsed.private_key ?? "");

	if (!clientEmail || !privateKey) {
		throw new Error(
			"GA4 service account JSON must include client_email and private_key.",
		);
	}

	return { client_email: clientEmail, private_key: privateKey };
}

function isAuthorizedUserCredentials(
	credentials: Partial<Record<keyof AuthorizedUserCredentials, unknown>>,
): credentials is AuthorizedUserCredentials {
	return Boolean(
		typeof credentials.client_id === "string" &&
		credentials.client_id.trim() &&
		typeof credentials.refresh_token === "string" &&
		credentials.refresh_token.trim(),
	);
}

function normalizePrivateKey(privateKey: string): string {
	return privateKey.trim().replace(/\\n/g, "\n");
}

function getPropertyResource(): string {
	const propertyId = getPropertyId();
	if (!propertyId) {
		throw new Error("Missing GA4_PROPERTY_ID.");
	}

	return propertyId.startsWith("properties/")
		? propertyId
		: `properties/${propertyId}`;
}

function getPropertyId(): string {
	return process.env.GA4_PROPERTY_ID?.trim() ?? "";
}

export function getPopularVideoLookbackDays(): number {
	const value = Number.parseInt(
		process.env.GA4_POPULAR_VIDEO_LOOKBACK_DAYS ?? "",
		10,
	);

	if (Number.isFinite(value) && value > 0) {
		return value;
	}

	return DEFAULT_LOOKBACK_DAYS;
}
