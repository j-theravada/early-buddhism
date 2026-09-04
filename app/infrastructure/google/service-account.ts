import { createSign } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export type GoogleServiceAccountCredentials = {
	clientEmail: string;
	privateKey: string;
};

type ServiceAccountCredentialsInput = {
	client_email?: unknown;
	private_key?: unknown;
};

type TokenResponse = {
	access_token?: string;
	error?: string;
	error_description?: string;
};

function encodeBase64Url(input: string | Buffer): string {
	return Buffer.from(input)
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/g, "");
}

export function normalizeGooglePrivateKey(privateKey: string): string {
	return privateKey.trim().replace(/\\n/g, "\n");
}

// Credential JSON has no trusted shape until this predicate accepts its members.
/* oxlint-disable anti-slop/no-unknown-parameters */
function isServiceAccountCredentialsInput(
	value: unknown,
): value is ServiceAccountCredentialsInput {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/* oxlint-enable anti-slop/no-unknown-parameters */

// Credential JSON scalar values are validated at this external-data boundary.
/* oxlint-disable anti-slop/no-runtime-typeof */
export function parseGoogleServiceAccountCredentials(
	json: string,
	label: string,
): GoogleServiceAccountCredentials {
	const parsed: unknown = JSON.parse(json);
	if (!isServiceAccountCredentialsInput(parsed)) {
		throw new Error(`${label} service account JSON must contain an object.`);
	}
	const clientEmail =
		typeof parsed.client_email === "string" ? parsed.client_email.trim() : "";
	const privateKey = normalizeGooglePrivateKey(
		typeof parsed.private_key === "string" ? parsed.private_key : "",
	);
	if (!clientEmail || !privateKey) {
		throw new Error(
			`${label} service account JSON must include client_email and private_key.`,
		);
	}
	return { clientEmail, privateKey };
}
/* oxlint-enable anti-slop/no-runtime-typeof */

function createJwtAssertion(
	credentials: GoogleServiceAccountCredentials,
	scope: string,
): string {
	const now = Math.floor(Date.now() / 1_000);
	const header = encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
	const payload = encodeBase64Url(
		JSON.stringify({
			aud: TOKEN_URL,
			exp: now + 60 * 60,
			iat: now,
			iss: credentials.clientEmail,
			scope,
		}),
	);
	const unsignedToken = `${header}.${payload}`;
	const signer = createSign("RSA-SHA256");
	signer.update(unsignedToken);
	const signature = encodeBase64Url(signer.sign(credentials.privateKey));
	return `${unsignedToken}.${signature}`;
}

export async function getGoogleServiceAccountAccessToken(
	credentials: GoogleServiceAccountCredentials,
	scope: string,
): Promise<string> {
	const response = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			assertion: createJwtAssertion(credentials, scope),
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
		}),
		cache: "no-store",
	});

	// SAFETY: The OAuth token endpoint owns this documented optional-field schema.
	const data = (await response.json()) as TokenResponse;
	if (!response.ok || !data.access_token) {
		throw new Error(
			`${scope} token request failed: ${data.error_description ?? data.error ?? response.statusText}`,
		);
	}
	return data.access_token;
}
