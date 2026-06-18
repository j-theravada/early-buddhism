import type { InStatement, Row } from "@libsql/client";
import {
	buildSearchSnippets,
	tokenizeSearchQuery,
} from "../../application/talk/search";
import type { TalkSearchApiResponse } from "../../application/talk/search-api";
import {
	buildEmptyTalkSearchApiResponse,
	type TalkSearchTranscriptSnippet,
} from "../../application/talk/search-api";
import { getLibsqlClient } from "../database/libsql";

type SearchTableName = "talk_search_fts" | "transcript_search_fts";

type TokenMatches = {
	talkIds: Set<string>;
	transcriptTalkIds: Set<string>;
};

const MAX_TALK_IDS_PER_QUERY = 500;
const MAX_MATCHING_CUES_PER_TALK = 12;
const MAX_SNIPPETS_PER_TALK = 2;

function escapeLikeToken(token: string): string {
	return token
		.replaceAll("\\", "\\\\")
		.replaceAll("%", "\\%")
		.replaceAll("_", "\\_");
}

function readStringColumn(row: Row, column: string): string | null {
	const value = row[column];
	return typeof value === "string" ? value : null;
}

function readNumberColumn(row: Row, column: string): number | null {
	const value = row[column];
	if (typeof value === "number") {
		return value;
	}
	if (typeof value === "bigint") {
		return Number(value);
	}
	return null;
}

async function findMatchingTalkIds(
	table: SearchTableName,
	token: string,
): Promise<Set<string>> {
	const db = getLibsqlClient();
	const result = await db.execute({
		sql: `SELECT talk_id FROM ${table} WHERE search_text LIKE ? ESCAPE '\\'`,
		args: [`%${escapeLikeToken(token)}%`],
	});
	return new Set(
		result.rows.flatMap((row) => {
			const talkId = readStringColumn(row, "talk_id");
			return talkId ? [talkId] : [];
		}),
	);
}

function intersectTokenMatches(tokenMatches: TokenMatches[]): Set<string> {
	if (tokenMatches.length === 0) {
		return new Set();
	}

	const [firstTokenMatches, ...restTokenMatches] = tokenMatches;
	const candidateTalkIds = new Set([
		...firstTokenMatches.talkIds,
		...firstTokenMatches.transcriptTalkIds,
	]);

	for (const matches of restTokenMatches) {
		for (const talkId of candidateTalkIds) {
			if (
				!matches.talkIds.has(talkId) &&
				!matches.transcriptTalkIds.has(talkId)
			) {
				candidateTalkIds.delete(talkId);
			}
		}
	}

	return candidateTalkIds;
}

function unionTranscriptTalkIds(tokenMatches: TokenMatches[]): Set<string> {
	const transcriptTalkIds = new Set<string>();
	for (const matches of tokenMatches) {
		for (const talkId of matches.transcriptTalkIds) {
			transcriptTalkIds.add(talkId);
		}
	}
	return transcriptTalkIds;
}

function chunkValues<TValue>(values: TValue[], size: number): TValue[][] {
	const chunks: TValue[][] = [];
	for (let start = 0; start < values.length; start += size) {
		chunks.push(values.slice(start, start + size));
	}
	return chunks;
}

async function loadTranscriptSnippets(
	talkIds: string[],
	tokens: string[],
): Promise<Map<string, TalkSearchTranscriptSnippet[]>> {
	const snippetsByTalkId = new Map<string, TalkSearchTranscriptSnippet[]>();
	const seenSnippetsByTalkId = new Map<string, Set<string>>();
	if (talkIds.length === 0) {
		return snippetsByTalkId;
	}

	const db = getLibsqlClient();
	const tokenConditions = tokens
		.map(() => "search_text LIKE ? ESCAPE '\\'")
		.join(" OR ");
	const tokenArgs = tokens.map((token) => `%${escapeLikeToken(token)}%`);

	for (const chunk of chunkValues(talkIds, MAX_TALK_IDS_PER_QUERY)) {
		const placeholders = chunk.map(() => "?").join(", ");
		const statement: InStatement = {
			sql: `
				WITH matching_cues AS (
					SELECT
						talk_id,
						cue_index,
						start_seconds,
						start_label,
						text,
						ROW_NUMBER() OVER (
							PARTITION BY talk_id
							ORDER BY cue_index
						) AS match_rank
					FROM transcript_cues
					WHERE talk_id IN (${placeholders})
						AND (${tokenConditions})
				)
				SELECT talk_id, cue_index, start_seconds, start_label, text
				FROM matching_cues
				WHERE match_rank <= ?
				ORDER BY talk_id, cue_index
			`,
			args: [...chunk, ...tokenArgs, MAX_MATCHING_CUES_PER_TALK],
		};
		const result = await db.execute(statement);

		for (const row of result.rows) {
			const talkId = readStringColumn(row, "talk_id");
			if (!talkId) {
				continue;
			}
			const existingSnippets = snippetsByTalkId.get(talkId) ?? [];
			if (existingSnippets.length >= MAX_SNIPPETS_PER_TALK) {
				continue;
			}

			const text = readStringColumn(row, "text");
			const cueIndex = readNumberColumn(row, "cue_index");
			const start = readNumberColumn(row, "start_seconds");
			const startLabel = readStringColumn(row, "start_label");
			if (!text || cueIndex === null || start === null || !startLabel) {
				continue;
			}

			const snippetText = buildSearchSnippets(text, tokens, {
				maxSnippets: 1,
			})[0];
			if (!snippetText) {
				continue;
			}

			let seenSnippets = seenSnippetsByTalkId.get(talkId);
			if (!seenSnippets) {
				seenSnippets = new Set();
				seenSnippetsByTalkId.set(talkId, seenSnippets);
			}
			if (seenSnippets.has(snippetText)) {
				continue;
			}
			seenSnippets.add(snippetText);

			const nextSnippets = [
				...existingSnippets,
				{
					text: snippetText,
					cueIndex,
					start,
					startLabel,
				},
			];
			snippetsByTalkId.set(talkId, nextSnippets);
		}
	}

	return snippetsByTalkId;
}

export async function searchTalkDatabase(
	query: string,
): Promise<TalkSearchApiResponse> {
	const tokens = tokenizeSearchQuery(query);
	if (tokens.length === 0) {
		return buildEmptyTalkSearchApiResponse();
	}

	const tokenMatches = await Promise.all(
		tokens.map(async (token) => {
			const [talkIds, transcriptTalkIds] = await Promise.all([
				findMatchingTalkIds("talk_search_fts", token),
				findMatchingTalkIds("transcript_search_fts", token),
			]);
			return { talkIds, transcriptTalkIds };
		}),
	);
	const talkIds = [...intersectTokenMatches(tokenMatches)];
	const transcriptTalkIds = unionTranscriptTalkIds(tokenMatches);
	const talkIdsWithTranscriptMatches = talkIds.filter((talkId) =>
		transcriptTalkIds.has(talkId),
	);
	const snippetsByTalkId = await loadTranscriptSnippets(
		talkIdsWithTranscriptMatches,
		tokens,
	);

	return {
		talkIds,
		results: talkIdsWithTranscriptMatches.flatMap((talkId) => {
			const transcriptSnippets = snippetsByTalkId.get(talkId) ?? [];
			return transcriptSnippets.length > 0
				? [{ talkId, transcriptSnippets }]
				: [];
		}),
	};
}
