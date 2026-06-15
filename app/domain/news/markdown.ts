import type { NewsItem } from "./types";

const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function parseNewsMarkdown(
	source: string,
	fallbackSlug: string,
): NewsItem {
	const match = source.match(frontmatterPattern);
	if (!match) {
		throw new Error(`News markdown is missing frontmatter: ${fallbackSlug}`);
	}

	const fields = parseFrontmatter(match[1] ?? "");
	const title = getRequiredField(fields, "title", fallbackSlug);
	const date = getRequiredField(fields, "date", fallbackSlug);
	if (!datePattern.test(date)) {
		throw new Error(
			`News markdown has an invalid date. Use YYYY-MM-DD: ${fallbackSlug}`,
		);
	}

	const body = source.slice(match[0].length).trim();

	return {
		title,
		date,
		slug: fields.slug || fallbackSlug,
		body,
		excerpt: fields.excerpt || createExcerpt(body),
		draft: fields.draft === "true",
	};
}

function parseFrontmatter(source: string): Record<string, string> {
	const fields: Record<string, string> = {};
	for (const line of source.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		const separatorIndex = trimmed.indexOf(":");
		if (separatorIndex === -1) {
			continue;
		}

		const key = trimmed.slice(0, separatorIndex).trim();
		const value = trimmed.slice(separatorIndex + 1).trim();
		fields[key] = normalizeFrontmatterValue(value);
	}

	return fields;
}

function normalizeFrontmatterValue(value: string): string {
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		return value.slice(1, -1);
	}

	return value;
}

function getRequiredField(
	fields: Record<string, string>,
	key: string,
	fallbackSlug: string,
): string {
	const value = fields[key];
	if (!value) {
		throw new Error(`News markdown is missing "${key}": ${fallbackSlug}`);
	}

	return value;
}

function createExcerpt(markdown: string): string {
	return markdown
		.replace(/^#{1,6}\s+/gm, "")
		.replace(/^\s*[-*+]\s+/gm, "")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/[*_`>]/g, "")
		.split(/\r?\n+/)
		.map((line) => line.trim())
		.filter(Boolean)
		.join(" ");
}
