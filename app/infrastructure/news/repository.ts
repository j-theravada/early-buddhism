import { readdir, readFile } from "node:fs/promises";
import { join, parse as parsePath } from "node:path";
import { cache } from "react";
import { parseNewsMarkdown } from "../../domain/news/markdown";
import type { NewsItem } from "../../domain/news/types";

const newsDirectory = join(process.cwd(), "content/news");

const loadNewsItems = cache(async (): Promise<NewsItem[]> => {
	let filenames: string[];
	try {
		filenames = await readdir(newsDirectory);
	} catch (error) {
		if (isMissingDirectoryError(error)) {
			return [];
		}

		throw error;
	}

	const items = await Promise.all(
		filenames
			.filter((filename) => filename.endsWith(".md"))
			.map(async (filename) => {
				const source = await readFile(join(newsDirectory, filename), "utf8");
				return parseNewsMarkdown(source, parsePath(filename).name);
			}),
	);

	return items
		.filter((item) => !item.draft)
		.sort((a, b) => b.date.localeCompare(a.date));
});

export async function getNewsItems(): Promise<NewsItem[]> {
	return loadNewsItems();
}

function isMissingDirectoryError(cause: unknown): cause is { code: "ENOENT" } {
	return (
		typeof cause === "object" &&
		cause !== null &&
		"code" in cause &&
		cause.code === "ENOENT"
	);
}
