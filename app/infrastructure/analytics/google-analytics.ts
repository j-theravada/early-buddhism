import { readFile } from "node:fs/promises";
import { normalizeTalkId } from "../../domain/talk/id";
import {
	getGoogleServiceAccountAccessToken,
	normalizeGooglePrivateKey,
	parseGoogleServiceAccountCredentials,
	type GoogleServiceAccountCredentials,
} from "../google/service-account";

const DATA_API_BASE_URL = "https://analyticsdata.googleapis.com/v1beta";
const DEFAULT_LOOKBACK_DAYS = 90;
const GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

type AuthorizedUserCredentials = {
	type?: "authorized_user";
	client_id: string;
	client_secret?: string;
	refresh_token: string;
};

type GoogleAnalyticsCredentials =
	| GoogleServiceAccountCredentials
	| AuthorizedUserCredentials;

type GoogleAnalyticsCredentialsInput = {
	type?: unknown;
	client_email?: unknown;
	private_key?: unknown;
	client_id?: unknown;
	client_secret?: unknown;
	refresh_token?: unknown;
};

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

	// SAFETY: A successful GA4 runReport response owns this documented optional-field schema.
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
	if ("client_id" in credentials) {
		return getOAuthAccessToken(credentials);
	}

	return getGoogleServiceAccountAccessToken(credentials, GA4_SCOPE);
}

async function getOAuthAccessToken(
	credentials: AuthorizedUserCredentials,
): Promise<string> {
	const tokenParameters = new URLSearchParams({
		client_id: credentials.client_id,
		grant_type: "refresh_token",
		refresh_token: credentials.refresh_token,
	});
	if (credentials.client_secret) {
		tokenParameters.set("client_secret", credentials.client_secret);
	}

	const response = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: tokenParameters,
		cache: "no-store",
	});

	// SAFETY: The OAuth token endpoint owns this documented response schema; access_token is checked before use.
	const data = (await response.json()) as TokenResponse;
	if (!response.ok || !data.access_token) {
		throw new Error(
			`GA4 OAuth token request failed: ${data.error_description ?? data.error ?? response.statusText}`,
		);
	}

	return data.access_token;
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
	const privateKey = normalizeGooglePrivateKey(
		process.env.GA4_PRIVATE_KEY ?? "",
	);
	if (clientEmail && privateKey) {
		return { clientEmail, privateKey };
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

	const credentials: AuthorizedUserCredentials = {
		client_id: clientId,
		refresh_token: refreshToken,
		type: "authorized_user",
	};
	if (clientSecret) {
		credentials.client_secret = clientSecret;
	}
	return credentials;
}

// Parsed credential fields have no type until this JSON-boundary predicate accepts the object.
/* oxlint-disable anti-slop/no-unknown-parameters */
function isCredentialsInput(
	value: unknown,
): value is GoogleAnalyticsCredentialsInput {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/* oxlint-enable anti-slop/no-unknown-parameters */

// Credential scalar fields are validated through this type guard before string operations.
// oxlint-disable-next-line anti-slop/no-unknown-parameters
function isString(value: unknown): value is string {
	return typeof value === "string";
}

function parseGoogleAnalyticsCredentialsJson(
	json: string,
): GoogleAnalyticsCredentials {
	const parsed: unknown = JSON.parse(json);
	if (!isCredentialsInput(parsed)) {
		throw new Error("GA4 credentials JSON must contain an object.");
	}

	if (isAuthorizedUserCredentials(parsed)) {
		const credentials: AuthorizedUserCredentials = {
			client_id: parsed.client_id.trim(),
			refresh_token: parsed.refresh_token.trim(),
			type: "authorized_user",
		};
		if (isString(parsed.client_secret) && parsed.client_secret.trim()) {
			credentials.client_secret = parsed.client_secret.trim();
		}
		return credentials;
	}

	return parseGoogleServiceAccountCredentials(json, "GA4");
}

function isAuthorizedUserCredentials(
	credentials: GoogleAnalyticsCredentialsInput,
): credentials is AuthorizedUserCredentials {
	return Boolean(
		isString(credentials.client_id) &&
		credentials.client_id.trim() &&
		isString(credentials.refresh_token) &&
		credentials.refresh_token.trim(),
	);
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
