import type { InStatement, Row, Value } from "@libsql/client";
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

type TokenMatches = {
	talkIds: Set<string>;
	transcriptTalkIds: Set<string>;
};

type TranscriptTokenMatch = {
	talkSortIndex: number;
	cueIds: number[];
};

const MAX_TALK_IDS_PER_QUERY = 500;
const MAX_SNIPPET_TALK_IDS = 60;
const MAX_MATCHING_CUES_PER_TALK = 12;
const MAX_SNIPPETS_PER_TALK = 2;
const MIN_FTS_TRIGRAM_TOKEN_LENGTH = 3;
const TRANSCRIPT_TOKEN_INDEX_LENGTH = 3;
const SHORT_TOKEN_PATTERN = /^[\p{Letter}\p{Number}]+$/u;

let canUseCueSearchFts: boolean | null = null;

function escapeLikeToken(token: string): string {
	return token
		.replaceAll("\\", "\\\\")
		.replaceAll("%", "\\%")
		.replaceAll("_", "\\_");
}

function canUseFtsMatch(token: string): boolean {
	return [...token].length >= MIN_FTS_TRIGRAM_TOKEN_LENGTH;
}

function canUseShortTokenIndex(token: string): boolean {
	return !canUseFtsMatch(token) && SHORT_TOKEN_PATTERN.test(token);
}

function quoteFtsPhrase(token: string): string {
	return `"${token.replaceAll('"', '""')}"`;
}

function isStringValue(value: Value): value is string {
	return typeof value === "string";
}

function isNumberValue(value: Value): value is number {
	return typeof value === "number";
}

function isBigIntValue(value: Value): value is bigint {
	return typeof value === "bigint";
}

function readStringColumn(row: Row, column: string): string | null {
	const value = row[column];
	return isStringValue(value) ? value : null;
}

function readNumberColumn(row: Row, column: string): number | null {
	const value = row[column];
	if (isNumberValue(value)) {
		return value;
	}
	if (isBigIntValue(value)) {
		return Number(value);
	}
	return null;
}

function isMissingCueSearchFtsError(cause: unknown): boolean {
	return (
		cause instanceof Error &&
		cause.message.includes("no such table") &&
		cause.message.includes("transcript_cue_search_fts")
	);
}

function isMissingTranscriptTokenIndexError(cause: unknown): boolean {
	return (
		cause instanceof Error &&
		((cause.message.includes("no such table") &&
			cause.message.includes("transcript_token_index")) ||
			(cause.message.includes("no such column") &&
				cause.message.includes("matches_json")))
	);
}

function collectTranscriptIndexTokens(token: string): string[] {
	const chars = [...token];
	const tokens: string[] = [];
	for (
		let start = 0;
		start + TRANSCRIPT_TOKEN_INDEX_LENGTH <= chars.length;
		start += 1
	) {
		const transcriptToken = chars
			.slice(start, start + TRANSCRIPT_TOKEN_INDEX_LENGTH)
			.join("");
		if (SHORT_TOKEN_PATTERN.test(transcriptToken)) {
			tokens.push(transcriptToken);
		}
	}
	return [...new Set(tokens)];
}

function intersectTalkSortIndexLists(
	talkSortIndexLists: number[][],
): Set<number> {
	if (talkSortIndexLists.length === 0) {
		return new Set();
	}

	const [firstTalkSortIndexes, ...restTalkSortIndexes] = talkSortIndexLists;
	const candidateTalkSortIndexes = new Set(firstTalkSortIndexes);
	for (const talkSortIndexes of restTalkSortIndexes) {
		const talkSortIndexSet = new Set(talkSortIndexes);
		for (const talkSortIndex of candidateTalkSortIndexes) {
			if (!talkSortIndexSet.has(talkSortIndex)) {
				candidateTalkSortIndexes.delete(talkSortIndex);
			}
		}
	}
	return candidateTalkSortIndexes;
}

async function loadTalkIdsForSortIndexes(
	sortIndexes: Set<number>,
): Promise<Set<string>> {
	const talkIdsBySortIndex = await loadTalkIdsBySortIndex(sortIndexes);
	return new Set(talkIdsBySortIndex.values());
}

async function loadTalkIdsBySortIndex(
	sortIndexes: Set<number>,
): Promise<Map<number, string>> {
	if (sortIndexes.size === 0) {
		return new Map();
	}

	const db = getLibsqlClient();
	const talkIdsBySortIndex = new Map<number, string>();
	for (const chunk of chunkValues([...sortIndexes], MAX_TALK_IDS_PER_QUERY)) {
		const placeholders = chunk.map(() => "?").join(", ");
		const result = await db.execute({
			sql: `
				SELECT id, sort_index
				FROM talks
				WHERE sort_index IN (${placeholders})
			`,
			args: chunk,
		});

		for (const row of result.rows) {
			const talkId = readStringColumn(row, "id");
			const sortIndex = readNumberColumn(row, "sort_index");
			if (talkId && sortIndex !== null) {
				talkIdsBySortIndex.set(sortIndex, talkId);
			}
		}
	}
	return talkIdsBySortIndex;
}

async function loadTalkSortIndexesById(
	talkIds: string[],
): Promise<Map<string, number>> {
	if (talkIds.length === 0) {
		return new Map();
	}

	const db = getLibsqlClient();
	const sortIndexesByTalkId = new Map<string, number>();
	for (const chunk of chunkValues(talkIds, MAX_TALK_IDS_PER_QUERY)) {
		const placeholders = chunk.map(() => "?").join(", ");
		const result = await db.execute({
			sql: `
				SELECT id, sort_index
				FROM talks
				WHERE id IN (${placeholders})
			`,
			args: chunk,
		});

		for (const row of result.rows) {
			const talkId = readStringColumn(row, "id");
			const sortIndex = readNumberColumn(row, "sort_index");
			if (talkId && sortIndex !== null) {
				sortIndexesByTalkId.set(talkId, sortIndex);
			}
		}
	}
	return sortIndexesByTalkId;
}

function parseTranscriptTokenMatches(value: string): TranscriptTokenMatch[] {
	const parsedMatches = JSON.parse(value);
	if (!Array.isArray(parsedMatches)) {
		return [];
	}

	const matches: TranscriptTokenMatch[] = [];
	for (const parsedMatch of parsedMatches) {
		if (
			!Array.isArray(parsedMatch) ||
			parsedMatch.length < 2 ||
			!parsedMatch.every(isNumberValue)
		) {
			continue;
		}
		const [talkSortIndex, ...cueIds] = parsedMatch;
		matches.push({ talkSortIndex, cueIds });
	}
	return matches;
}

async function loadTranscriptTokenMatches(
	transcriptTokens: string[],
): Promise<Map<string, TranscriptTokenMatch[]>> {
	if (transcriptTokens.length === 0) {
		return new Map();
	}

	const db = getLibsqlClient();
	const placeholders = transcriptTokens.map(() => "?").join(", ");
	const result = await db.execute({
		sql: `
			SELECT token, matches_json
			FROM transcript_token_index
			WHERE token IN (${placeholders})
		`,
		args: transcriptTokens,
	});
	const matchesByToken = new Map<string, TranscriptTokenMatch[]>();
	for (const row of result.rows) {
		const transcriptToken = readStringColumn(row, "token");
		const matchesJson = readStringColumn(row, "matches_json");
		if (!transcriptToken || !matchesJson) {
			continue;
		}
		matchesByToken.set(
			transcriptToken,
			parseTranscriptTokenMatches(matchesJson),
		);
	}
	return matchesByToken;
}

async function findTranscriptTalkIdsWithTokenIndex(
	token: string,
): Promise<Set<string>> {
	const transcriptTokens = collectTranscriptIndexTokens(token);
	if (transcriptTokens.length === 0) {
		return new Set();
	}

	const matchesByToken = await loadTranscriptTokenMatches(transcriptTokens);
	if (
		transcriptTokens.some(
			(transcriptToken) => !matchesByToken.has(transcriptToken),
		)
	) {
		return new Set();
	}

	const talkSortIndexes = intersectTalkSortIndexLists(
		transcriptTokens.map((transcriptToken) =>
			(matchesByToken.get(transcriptToken) ?? []).map(
				(match) => match.talkSortIndex,
			),
		),
	);
	return loadTalkIdsForSortIndexes(talkSortIndexes);
}

async function findTokenMatchesWithCueSearchFts(
	token: string,
	useTranscriptTokenIndex: boolean,
	useCueSearchFts: boolean,
): Promise<TokenMatches> {
	const db = getLibsqlClient();
	const useFtsMatch = canUseFtsMatch(token);
	const useShortTokenIndex = canUseShortTokenIndex(token);
	const operator = useFtsMatch ? "MATCH" : "LIKE";
	const matcher = useFtsMatch
		? quoteFtsPhrase(token)
		: `%${escapeLikeToken(token)}%`;
	const escapeClause = useFtsMatch ? "" : " ESCAPE '\\'";
	const talkStatement: InStatement = {
		sql: `
			SELECT talk_id
			FROM talk_search_fts
			WHERE search_text ${operator} ?${escapeClause}
		`,
		args: [matcher],
	};
	const transcriptStatement: InStatement | null = useShortTokenIndex
		? {
				sql: "SELECT talk_id FROM transcript_short_token_index WHERE token = ?",
				args: [token],
			}
		: useFtsMatch && useTranscriptTokenIndex
			? null
			: useFtsMatch && useCueSearchFts
				? {
						sql: `
						SELECT transcript_cues.talk_id
						FROM transcript_cue_search_fts
						INNER JOIN transcript_cues
							ON transcript_cues.id = transcript_cue_search_fts.rowid
						WHERE transcript_cue_search_fts.search_text MATCH ?
						GROUP BY transcript_cues.talk_id
					`,
						args: [quoteFtsPhrase(token)],
					}
				: useCueSearchFts
					? {
							sql: "SELECT talk_id FROM transcript_cues WHERE 0",
							args: [],
						}
					: {
							sql: `
					SELECT talk_id
					FROM transcript_cues
					WHERE search_text LIKE ? ESCAPE '\\'
					GROUP BY talk_id
				`,
							args: [`%${escapeLikeToken(token)}%`],
						};
	const transcriptTalkIdsPromise =
		useFtsMatch && useTranscriptTokenIndex
			? findTranscriptTalkIdsWithTokenIndex(token)
			: null;
	const [talkResult, transcriptResult] = transcriptStatement
		? await db.batch([talkStatement, transcriptStatement])
		: [await db.execute(talkStatement), null];
	const talkIds = new Set<string>();
	const transcriptTalkIds =
		(await transcriptTalkIdsPromise) ?? new Set<string>();

	for (const row of talkResult.rows) {
		const talkId = readStringColumn(row, "talk_id");
		if (!talkId) {
			continue;
		}
		talkIds.add(talkId);
	}

	if (transcriptResult) {
		for (const row of transcriptResult.rows) {
			const talkId = readStringColumn(row, "talk_id");
			if (!talkId) {
				continue;
			}
			transcriptTalkIds.add(talkId);
		}
	}

	return { talkIds, transcriptTalkIds };
}

async function findTokenMatches(token: string): Promise<TokenMatches> {
	try {
		return await findTokenMatchesWithCueSearchFts(token, true, true);
	} catch (error) {
		if (isMissingTranscriptTokenIndexError(error)) {
			return findTokenMatchesWithCueSearchFts(token, false, true);
		}
		if (isMissingCueSearchFtsError(error)) {
			return findTokenMatchesWithCueSearchFts(token, false, false);
		}
		throw error;
	}
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

async function loadSnippetTalkIds(talkIds: string[]): Promise<string[]> {
	if (talkIds.length === 0) {
		return [];
	}

	const db = getLibsqlClient();
	const rows: { id: string; sortIndex: number }[] = [];

	for (const chunk of chunkValues(talkIds, MAX_TALK_IDS_PER_QUERY)) {
		const placeholders = chunk.map(() => "?").join(", ");
		const result = await db.execute({
			sql: `
				SELECT id, sort_index
				FROM talks
				WHERE id IN (${placeholders})
				ORDER BY sort_index
			`,
			args: chunk,
		});

		for (const row of result.rows) {
			const id = readStringColumn(row, "id");
			const sortIndex = readNumberColumn(row, "sort_index");
			if (!id || sortIndex === null) {
				continue;
			}
			rows.push({ id, sortIndex });
		}
	}

	return rows
		.sort((a, b) => a.sortIndex - b.sortIndex)
		.slice(0, MAX_SNIPPET_TALK_IDS)
		.map(({ id }) => id);
}

async function loadTranscriptSnippets(
	talkIds: string[],
	tokens: string[],
): Promise<Map<string, TalkSearchTranscriptSnippet[]>> {
	const ftsTokens = tokens.filter((token) => canUseFtsMatch(token));
	if (ftsTokens.length === 0) {
		return new Map();
	}

	try {
		return await loadTokenIndexTranscriptSnippets(talkIds, ftsTokens, tokens);
	} catch (error) {
		if (!isMissingTranscriptTokenIndexError(error)) {
			throw error;
		}
	}

	try {
		if (canUseCueSearchFts !== false) {
			const snippets = await loadCueSearchFtsTranscriptSnippets(
				talkIds,
				ftsTokens,
				tokens,
			);
			canUseCueSearchFts = true;
			return snippets;
		}
	} catch (error) {
		if (isMissingCueSearchFtsError(error)) {
			canUseCueSearchFts = false;
			return loadLegacyTranscriptSnippets(talkIds, tokens);
		}
		throw error;
	}
	return loadLegacyTranscriptSnippets(talkIds, tokens);
}

function collectMatchingCueIds(
	transcriptTokens: string[],
	matchesByToken: Map<string, TranscriptTokenMatch[]>,
	matchingSortIndexes: Set<number>,
	selectedSortIndexes: Set<number>,
	talkIdsBySortIndex: Map<number, string>,
	cueIdsByTalkId: Map<string, Set<number>>,
): void {
	for (const transcriptToken of transcriptTokens) {
		for (const match of matchesByToken.get(transcriptToken) ?? []) {
			if (
				!matchingSortIndexes.has(match.talkSortIndex) ||
				!selectedSortIndexes.has(match.talkSortIndex)
			) {
				continue;
			}

			const talkId = talkIdsBySortIndex.get(match.talkSortIndex);
			if (!talkId) {
				continue;
			}

			let cueIds = cueIdsByTalkId.get(talkId);
			if (!cueIds) {
				cueIds = new Set();
				cueIdsByTalkId.set(talkId, cueIds);
			}

			for (const cueId of match.cueIds) {
				if (cueIds.size >= MAX_MATCHING_CUES_PER_TALK) {
					break;
				}
				cueIds.add(cueId);
			}
		}
	}
}

async function loadTokenIndexCueIdsByTalkId(
	talkIds: string[],
	ftsTokens: string[],
): Promise<Map<string, Set<number>>> {
	const sortIndexesByTalkId = await loadTalkSortIndexesById(talkIds);
	const talkIdsBySortIndex = new Map(
		[...sortIndexesByTalkId].map(([talkId, sortIndex]) => [sortIndex, talkId]),
	);
	const selectedSortIndexes = new Set(talkIdsBySortIndex.keys());
	const cueIdsByTalkId = new Map<string, Set<number>>();

	for (const token of ftsTokens) {
		const transcriptTokens = collectTranscriptIndexTokens(token);
		const matchesByToken = await loadTranscriptTokenMatches(transcriptTokens);
		if (
			transcriptTokens.some(
				(transcriptToken) => !matchesByToken.has(transcriptToken),
			)
		) {
			continue;
		}

		const matchingSortIndexes = intersectTalkSortIndexLists(
			transcriptTokens.map((transcriptToken) =>
				(matchesByToken.get(transcriptToken) ?? []).map(
					(match) => match.talkSortIndex,
				),
			),
		);
		collectMatchingCueIds(
			transcriptTokens,
			matchesByToken,
			matchingSortIndexes,
			selectedSortIndexes,
			talkIdsBySortIndex,
			cueIdsByTalkId,
		);
	}

	return cueIdsByTalkId;
}

async function loadTokenIndexTranscriptSnippets(
	talkIds: string[],
	ftsTokens: string[],
	snippetTokens: string[],
): Promise<Map<string, TalkSearchTranscriptSnippet[]>> {
	const snippetsByTalkId = new Map<string, TalkSearchTranscriptSnippet[]>();
	const seenSnippetsByTalkId = new Map<string, Set<string>>();
	if (talkIds.length === 0) {
		return snippetsByTalkId;
	}

	const cueIdsByTalkId = await loadTokenIndexCueIdsByTalkId(talkIds, ftsTokens);

	const cueIds = [...cueIdsByTalkId].flatMap(([, talkCueIds]) =>
		[...talkCueIds].sort((a, b) => a - b),
	);
	const db = getLibsqlClient();

	for (const chunk of chunkValues(cueIds, MAX_TALK_IDS_PER_QUERY)) {
		const placeholders = chunk.map(() => "?").join(", ");
		const result = await db.execute({
			sql: `
				SELECT talk_id, cue_index, start_seconds, start_label, text
				FROM transcript_cues
				WHERE id IN (${placeholders})
				ORDER BY talk_id, cue_index
			`,
			args: chunk,
		});

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

			const snippetText = buildSearchSnippets(text, snippetTokens, {
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

async function loadCueSearchFtsTranscriptSnippets(
	talkIds: string[],
	ftsTokens: string[],
	snippetTokens: string[],
): Promise<Map<string, TalkSearchTranscriptSnippet[]>> {
	const snippetsByTalkId = new Map<string, TalkSearchTranscriptSnippet[]>();
	const seenSnippetsByTalkId = new Map<string, Set<string>>();
	if (talkIds.length === 0) {
		return snippetsByTalkId;
	}

	const db = getLibsqlClient();
	const matchQuery = ftsTokens
		.map((token) => quoteFtsPhrase(token))
		.join(" OR ");

	for (const chunk of chunkValues(talkIds, MAX_TALK_IDS_PER_QUERY)) {
		const placeholders = chunk.map(() => "?").join(", ");
		const statement: InStatement = {
			sql: `
				WITH matching_cues AS (
					SELECT
						transcript_cues.id,
						transcript_cues.talk_id,
						transcript_cues.cue_index,
						ROW_NUMBER() OVER (
							PARTITION BY transcript_cues.talk_id
							ORDER BY transcript_cues.cue_index
						) AS match_rank
					FROM transcript_cue_search_fts
					INNER JOIN transcript_cues
						ON transcript_cues.id = transcript_cue_search_fts.rowid
					WHERE transcript_cue_search_fts.search_text MATCH ?
						AND transcript_cues.talk_id IN (${placeholders})
				)
				SELECT
					transcript_cues.talk_id,
					transcript_cues.cue_index,
					transcript_cues.start_seconds,
					transcript_cues.start_label,
					transcript_cues.text
				FROM matching_cues
				INNER JOIN transcript_cues
					ON transcript_cues.id = matching_cues.id
				WHERE matching_cues.match_rank <= ?
				ORDER BY transcript_cues.talk_id, transcript_cues.cue_index
			`,
			args: [matchQuery, ...chunk, MAX_MATCHING_CUES_PER_TALK],
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

			const snippetText = buildSearchSnippets(text, snippetTokens, {
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

async function loadLegacyTranscriptSnippets(
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

async function loadShortTokenTranscriptSnippets(
	talkIds: string[],
	tokens: string[],
): Promise<Map<string, TalkSearchTranscriptSnippet[]>> {
	const snippetsByTalkId = new Map<string, TalkSearchTranscriptSnippet[]>();
	const seenSnippetsByTalkId = new Map<string, Set<string>>();
	if (talkIds.length === 0) {
		return snippetsByTalkId;
	}

	const db = getLibsqlClient();
	const tokenPlaceholders = tokens.map(() => "?").join(", ");

	for (const chunk of chunkValues(talkIds, MAX_TALK_IDS_PER_QUERY)) {
		const selectedTalkIds = new Set(chunk);
		const shortTokenResult = await db.execute({
			sql: `
				SELECT talk_id, first_cue_id, second_cue_id
				FROM transcript_short_token_index
				WHERE token IN (${tokenPlaceholders})
			`,
			args: tokens,
		});
		const cueIds = new Set<number>();
		for (const row of shortTokenResult.rows) {
			const talkId = readStringColumn(row, "talk_id");
			if (!talkId || !selectedTalkIds.has(talkId)) {
				continue;
			}
			const firstCueId = readNumberColumn(row, "first_cue_id");
			const secondCueId = readNumberColumn(row, "second_cue_id");
			if (firstCueId !== null) {
				cueIds.add(firstCueId);
			}
			if (secondCueId !== null) {
				cueIds.add(secondCueId);
			}
		}

		for (const cueIdChunk of chunkValues([...cueIds], MAX_TALK_IDS_PER_QUERY)) {
			const cuePlaceholders = cueIdChunk.map(() => "?").join(", ");
			const result = await db.execute({
				sql: `
					SELECT talk_id, cue_index, start_seconds, start_label, text
					FROM transcript_cues
					WHERE id IN (${cuePlaceholders})
					ORDER BY talk_id, cue_index
				`,
				args: cueIdChunk,
			});

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
	}

	return snippetsByTalkId;
}

async function loadTranscriptSnippetsForTokens(
	talkIds: string[],
	tokens: string[],
): Promise<Map<string, TalkSearchTranscriptSnippet[]>> {
	if (tokens.every((token) => canUseShortTokenIndex(token))) {
		return loadShortTokenTranscriptSnippets(talkIds, tokens);
	}
	return loadTranscriptSnippets(talkIds, tokens);
}

export async function searchTalkDatabase(
	query: string,
): Promise<TalkSearchApiResponse> {
	const tokens = tokenizeSearchQuery(query);
	if (tokens.length === 0) {
		return buildEmptyTalkSearchApiResponse();
	}

	const tokenMatches = await Promise.all(
		tokens.map((token) => findTokenMatches(token)),
	);
	const talkIds = [...intersectTokenMatches(tokenMatches)];
	const transcriptTalkIds = unionTranscriptTalkIds(tokenMatches);
	const talkIdsWithTranscriptMatches = talkIds.filter((talkId) =>
		transcriptTalkIds.has(talkId),
	);
	const snippetTalkIds = await loadSnippetTalkIds(talkIdsWithTranscriptMatches);
	const snippetsByTalkId = await loadTranscriptSnippetsForTokens(
		snippetTalkIds,
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
