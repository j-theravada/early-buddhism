import { getVercelOidcToken } from "@vercel/oidc";
import { ExternalAccountClient } from "google-auth-library";

const DRIVE_API_SCOPE = "https://www.googleapis.com/auth/drive";
const DRIVE_FILES_API = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";

type Fetcher = (
	input: RequestInfo | URL,
	init?: RequestInit,
) => Promise<Response>;

type GoogleDriveWorkloadIdentityConfig = {
	projectNumber: string;
	providerId: string;
	poolId: string;
	serviceAccountEmail: string;
};

export type GoogleDriveTranscriptFileClient = {
	read: (fileId: string) => Promise<string>;
	update: (fileId: string, content: string) => Promise<void>;
};

function readGoogleDriveWorkloadIdentityConfig(): GoogleDriveWorkloadIdentityConfig {
	const projectNumber =
		process.env.GOOGLE_DRIVE_GCP_PROJECT_NUMBER?.trim() ?? "";
	const poolId =
		process.env.GOOGLE_DRIVE_WORKLOAD_IDENTITY_POOL_ID?.trim() ?? "";
	const providerId =
		process.env.GOOGLE_DRIVE_WORKLOAD_IDENTITY_POOL_PROVIDER_ID?.trim() ?? "";
	const serviceAccountEmail =
		process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL?.trim() ?? "";

	if (!/^\d+$/.test(projectNumber)) {
		throw new Error("Missing or invalid GOOGLE_DRIVE_GCP_PROJECT_NUMBER.");
	}
	if (!/^[a-z0-9-]+$/.test(poolId)) {
		throw new Error(
			"Missing or invalid GOOGLE_DRIVE_WORKLOAD_IDENTITY_POOL_ID.",
		);
	}
	if (!/^[a-z0-9-]+$/.test(providerId)) {
		throw new Error(
			"Missing or invalid GOOGLE_DRIVE_WORKLOAD_IDENTITY_POOL_PROVIDER_ID.",
		);
	}
	if (
		!/^[a-z0-9-]+@[a-z0-9-]+\.iam\.gserviceaccount\.com$/.test(
			serviceAccountEmail,
		)
	) {
		throw new Error("Missing or invalid GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL.");
	}

	return { projectNumber, poolId, providerId, serviceAccountEmail };
}

export function assertGoogleDriveWorkloadIdentityConfig(): void {
	readGoogleDriveWorkloadIdentityConfig();
}

export function createGoogleDriveTranscriptFileClient(
	accessToken: string,
	fetcher: Fetcher = fetch,
): GoogleDriveTranscriptFileClient {
	const authorization = `Bearer ${accessToken}`;

	return {
		read: async (fileId) => {
			const response = await fetcher(
				`${DRIVE_FILES_API}/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
				{
					headers: { Authorization: authorization },
					cache: "no-store",
				},
			);
			if (!response.ok) {
				throw new Error(`Google Drive read failed: ${response.status}`);
			}
			return response.text();
		},
		update: async (fileId, content) => {
			const response = await fetcher(
				`${DRIVE_UPLOAD_API}/${encodeURIComponent(fileId)}?uploadType=media&supportsAllDrives=true`,
				{
					method: "PATCH",
					headers: {
						Authorization: authorization,
						"Content-Type": "application/x-subrip; charset=utf-8",
					},
					body: content,
					cache: "no-store",
				},
			);
			if (!response.ok) {
				throw new Error(`Google Drive update failed: ${response.status}`);
			}
		},
	};
}

export async function getGoogleDriveTranscriptFileClient(): Promise<GoogleDriveTranscriptFileClient> {
	const config = readGoogleDriveWorkloadIdentityConfig();
	const providerResource = `projects/${config.projectNumber}/locations/global/workloadIdentityPools/${config.poolId}/providers/${config.providerId}`;
	const oidcAudience = `https://iam.googleapis.com/${providerResource}`;
	const authClient = ExternalAccountClient.fromJSON({
		type: "external_account",
		audience: `//iam.googleapis.com/${providerResource}`,
		subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
		token_url: "https://sts.googleapis.com/v1/token",
		service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(config.serviceAccountEmail)}:generateAccessToken`,
		subject_token_supplier: {
			getSubjectToken: () => getVercelOidcToken({ audience: oidcAudience }),
		},
		scopes: [DRIVE_API_SCOPE],
	});
	if (!authClient) {
		throw new Error("Invalid Google Drive workload identity configuration.");
	}
	const { token } = await authClient.getAccessToken();
	if (!token) {
		throw new Error("Google Drive access token was not returned.");
	}
	return createGoogleDriveTranscriptFileClient(token);
}
