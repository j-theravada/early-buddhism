const GITHUB_API_URL = "https://api.github.com";
const DEFAULT_REPOSITORY = "j-theravada/early-buddhism";
const DEFAULT_REF = "main";
const WORKFLOW_FILE = "generate-talks.yml";

export type GeneratedDataWorkflowConfig = {
	repository: string;
	ref: string;
	token: string;
};

export type GeneratedDataWorkflowDispatcher = () => Promise<void>;

type Fetcher = (
	input: RequestInfo | URL,
	init?: RequestInit,
) => Promise<Response>;

function readGeneratedDataWorkflowConfig(): GeneratedDataWorkflowConfig {
	const token = process.env.GITHUB_ACTIONS_TOKEN?.trim();
	if (!token) throw new Error("Missing GITHUB_ACTIONS_TOKEN.");

	return {
		repository: process.env.GITHUB_REPOSITORY?.trim() || DEFAULT_REPOSITORY,
		ref: process.env.GITHUB_GENERATED_DATA_REF?.trim() || DEFAULT_REF,
		token,
	};
}

export function assertGeneratedDataWorkflowConfig(): void {
	readGeneratedDataWorkflowConfig();
}

export function createGeneratedDataWorkflowDispatcher(
	config: GeneratedDataWorkflowConfig,
	fetcher: Fetcher = fetch,
): GeneratedDataWorkflowDispatcher {
	return async () => {
		const response = await fetcher(
			`${GITHUB_API_URL}/repos/${config.repository}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
			{
				method: "POST",
				headers: {
					Accept: "application/vnd.github+json",
					Authorization: `Bearer ${config.token}`,
					"Content-Type": "application/json",
					"X-GitHub-Api-Version": "2022-11-28",
				},
				body: JSON.stringify({ ref: config.ref }),
				cache: "no-store",
			},
		);
		if (!response.ok) {
			throw new Error(
				`Generated data workflow dispatch failed: ${response.status}`,
			);
		}
	};
}

export function getGeneratedDataWorkflowDispatcher(): GeneratedDataWorkflowDispatcher {
	return createGeneratedDataWorkflowDispatcher(
		readGeneratedDataWorkflowConfig(),
	);
}
