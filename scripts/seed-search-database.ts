import type { Client, InStatement, InValue, Transaction } from "@libsql/client";
import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { buildTalkGalleryTalks } from "../app/application/talk/gallery";
import {
	buildSearchIndex,
	normalizeForSearch,
} from "../app/application/talk/search";
import {
	closeLibsqlClientForScript,
	getLibsqlClient,
	getLibsqlDatabaseConfig,
} from "../app/infrastructure/database/libsql";
import { getTalks } from "../app/infrastructure/talk/repository";
import { getTranscriptSearchDocuments } from "../app/infrastructure/transcript/search-repository";
import {
	GENERATED_DATA_HASH_META_KEY,
	SEARCH_DATABASE_SCHEMA_VERSION,
	SEARCH_DATABASE_SCHEMA_VERSION_META_KEY,
	getGeneratedSearchDataFingerprint,
} from "./generated-data";

const SCHEMA_SQL = `
	DROP TABLE IF EXISTS talk_search_fts;
	DROP TABLE IF EXISTS transcript_cue_search_fts;
	DROP TABLE IF EXISTS transcript_search_fts;
	DROP TABLE IF EXISTS transcript_documents;
	DROP TABLE IF EXISTS transcript_token_index;
	DROP TABLE IF EXISTS transcript_short_token_index;
	DROP TABLE IF EXISTS transcript_cues;
	DROP TABLE IF EXISTS talks;
	DROP TABLE IF EXISTS search_database_meta;

CREATE TABLE talks (
	id TEXT PRIMARY KEY,
	display_json TEXT NOT NULL,
	search_text TEXT NOT NULL,
	sort_index INTEGER NOT NULL,
	recorded_on_sort_value INTEGER NOT NULL,
	collection_id TEXT NOT NULL,
	series_id TEXT NOT NULL
);

CREATE VIRTUAL TABLE talk_search_fts USING fts5(
	talk_id UNINDEXED,
	search_text,
	tokenize = 'trigram'
);

CREATE TABLE transcript_token_index (
	token TEXT PRIMARY KEY,
	matches_json TEXT NOT NULL
);

	CREATE TABLE transcript_cues (
		id INTEGER PRIMARY KEY,
		talk_id TEXT NOT NULL,
		cue_index INTEGER NOT NULL,
		start_seconds REAL NOT NULL,
		start_label TEXT NOT NULL,
		text TEXT NOT NULL,
		search_text TEXT NOT NULL,
		UNIQUE (talk_id, cue_index)
	);

	CREATE INDEX transcript_cues_talk_id_index
		ON transcript_cues (talk_id, cue_index);

	CREATE TABLE transcript_short_token_index (
		token TEXT NOT NULL,
		talk_id TEXT NOT NULL,
		first_cue_id INTEGER NOT NULL,
		second_cue_id INTEGER,
		PRIMARY KEY (token, talk_id)
	);

CREATE TABLE search_database_meta (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL
);
`;

type ShortTokenCueIds = {
	firstCueId: number;
	secondCueId: number | null;
};

const SHORT_TOKEN_PATTERN = /^[\p{Letter}\p{Number}]+$/u;
const MAX_SHORT_TOKEN_LENGTH = 2;
const TRANSCRIPT_TOKEN_INDEX_LENGTH = 3;
const MAX_TRANSCRIPT_TOKEN_CUES_PER_TALK = 12;

type DatabaseConfig = ReturnType<typeof getLibsqlDatabaseConfig>;

function getLocalDatabasePath(databaseUrl: string): string | null {
	if (!databaseUrl.startsWith("file:")) {
		return null;
	}

	return resolve(process.cwd(), databaseUrl.slice("file:".length));
}

async function ensureLocalDatabaseDirectory(databaseUrl: string) {
	const databasePath = getLocalDatabasePath(databaseUrl);
	if (!databasePath) {
		return;
	}
	await mkdir(dirname(databasePath), { recursive: true });
}

async function compactLocalDatabase(db: Client, config: DatabaseConfig) {
	if (config.target !== "local") {
		return;
	}

	await db.execute("PRAGMA optimize");
	await db.execute("VACUUM");
	await db.execute("PRAGMA wal_checkpoint(TRUNCATE)");
}

async function removeLocalDatabaseSidecars(config: DatabaseConfig | null) {
	if (!config || config.target !== "local") {
		return;
	}

	const databasePath = getLocalDatabasePath(config.url);
	if (!databasePath) {
		return;
	}

	await Promise.all([
		rm(`${databasePath}-shm`, { force: true }),
		rm(`${databasePath}-wal`, { force: true }),
	]);
}

function chunkStatements(
	statements: InStatement[],
	chunkSize: number,
): InStatement[][] {
	const chunks: InStatement[][] = [];
	for (let start = 0; start < statements.length; start += chunkSize) {
		chunks.push(statements.slice(start, start + chunkSize));
	}
	return chunks;
}

async function batchStatements(
	db: Client | Transaction,
	statements: InStatement[],
	chunkSize: number,
) {
	for (const chunk of chunkStatements(statements, chunkSize)) {
		await db.batch(chunk);
	}
}

function buildBulkInsertStatement(
	tableName: string,
	columns: string[],
	rows: InValue[][],
): InStatement | null {
	if (rows.length === 0) {
		return null;
	}

	const rowPlaceholder = `(${columns.map(() => "?").join(", ")})`;
	return {
		sql: `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES ${rows.map(() => rowPlaceholder).join(", ")}`,
		args: rows.flat(),
	};
}

function collectShortSearchTokens(value: string): Set<string> {
	const chars = [...normalizeForSearch(value)];
	const tokens = new Set<string>();
	for (let start = 0; start < chars.length; start += 1) {
		for (
			let size = 1;
			size <= MAX_SHORT_TOKEN_LENGTH && start + size <= chars.length;
			size += 1
		) {
			const token = chars.slice(start, start + size).join("");
			if (SHORT_TOKEN_PATTERN.test(token)) {
				tokens.add(token);
			}
		}
	}
	return tokens;
}

function collectTranscriptIndexTokens(value: string): Set<string> {
	const chars = [...normalizeForSearch(value)];
	const tokens = new Set<string>();
	for (
		let start = 0;
		start + TRANSCRIPT_TOKEN_INDEX_LENGTH <= chars.length;
		start += 1
	) {
		const token = chars
			.slice(start, start + TRANSCRIPT_TOKEN_INDEX_LENGTH)
			.join("");
		if (SHORT_TOKEN_PATTERN.test(token)) {
			tokens.add(token);
		}
	}
	return tokens;
}

function buildTranscriptCueKey(talkId: string, cueIndex: number): string {
	return `${talkId}\u0000${cueIndex}`;
}

function buildTranscriptCueIdByKey(
	transcriptDocuments: Awaited<ReturnType<typeof getTranscriptSearchDocuments>>,
): Map<string, number> {
	const cueIdByKey = new Map<string, number>();
	let cueId = 0;
	for (const document of transcriptDocuments) {
		for (const cue of document.cues) {
			cueId += 1;
			cueIdByKey.set(buildTranscriptCueKey(document.talkId, cue.index), cueId);
		}
	}
	return cueIdByKey;
}

async function batchTranscriptCueStatements(
	db: Client | Transaction,
	transcriptDocuments: Awaited<ReturnType<typeof getTranscriptSearchDocuments>>,
	cueIdByKey: ReadonlyMap<string, number>,
) {
	const rowChunkSize = 500;
	const statementBatchSize = 20;
	const cueColumns = [
		"id",
		"talk_id",
		"cue_index",
		"start_seconds",
		"start_label",
		"text",
		"search_text",
	];
	let cueRows: InValue[][] = [];
	let statements: InStatement[] = [];
	let cueCount = 0;

	async function flushRows() {
		const cueStatement = buildBulkInsertStatement(
			"transcript_cues",
			cueColumns,
			cueRows,
		);
		cueRows = [];

		if (cueStatement) {
			statements.push(cueStatement);
		}
		if (statements.length >= statementBatchSize) {
			await db.batch(statements);
			statements = [];
		}
	}

	for (const document of transcriptDocuments) {
		for (const cue of document.cues) {
			const cueId = cueIdByKey.get(
				buildTranscriptCueKey(document.talkId, cue.index),
			);
			if (cueId === undefined) {
				throw new Error(`Missing transcript cue id for ${document.talkId}`);
			}
			cueCount += 1;
			cueRows.push([
				cueId,
				document.talkId,
				cue.index,
				cue.start,
				cue.startLabel,
				cue.text,
				normalizeForSearch(cue.text),
			]);
			if (cueRows.length >= rowChunkSize) {
				await flushRows();
			}
		}
	}

	await flushRows();
	if (statements.length > 0) {
		await db.batch(statements);
	}

	return cueCount;
}

async function batchTranscriptTokenIndexStatements(
	db: Client | Transaction,
	transcriptDocuments: Awaited<ReturnType<typeof getTranscriptSearchDocuments>>,
	talkSortIndexById: ReadonlyMap<string, number>,
	cueIdByKey: ReadonlyMap<string, number>,
) {
	const rowChunkSize = 200;
	const statementBatchSize = 20;
	const columns = ["token", "matches_json"];
	const matchesByToken = new Map<string, number[][]>();
	let rows: InValue[][] = [];
	let statements: InStatement[] = [];
	let tokenRowCount = 0;

	async function flushRows() {
		const statement = buildBulkInsertStatement(
			"transcript_token_index",
			columns,
			rows,
		);
		rows = [];
		if (!statement) {
			return;
		}

		statements.push(statement);
		if (statements.length >= statementBatchSize) {
			await db.batch(statements);
			statements = [];
		}
	}

	for (const document of transcriptDocuments) {
		const talkSortIndex = talkSortIndexById.get(document.talkId);
		if (talkSortIndex === undefined) {
			continue;
		}

		const cueIdsByToken = new Map<string, number[]>();
		for (const cue of document.cues) {
			const cueId = cueIdByKey.get(
				buildTranscriptCueKey(document.talkId, cue.index),
			);
			if (cueId === undefined) {
				throw new Error(`Missing transcript cue id for ${document.talkId}`);
			}

			for (const token of collectTranscriptIndexTokens(cue.text)) {
				const cueIds = cueIdsByToken.get(token);
				if (!cueIds) {
					cueIdsByToken.set(token, [cueId]);
					continue;
				}
				if (
					cueIds.length < MAX_TRANSCRIPT_TOKEN_CUES_PER_TALK &&
					cueIds[cueIds.length - 1] !== cueId
				) {
					cueIds.push(cueId);
				}
			}
		}

		for (const [token, cueIds] of cueIdsByToken) {
			const match = [talkSortIndex, ...cueIds];
			const matches = matchesByToken.get(token);
			if (matches) {
				matches.push(match);
			} else {
				matchesByToken.set(token, [match]);
			}
		}
	}

	for (const [token, matches] of [...matchesByToken].sort(([a], [b]) =>
		a.localeCompare(b),
	)) {
		tokenRowCount += 1;
		rows.push([token, JSON.stringify(matches.sort(([a], [b]) => a - b))]);
		if (rows.length >= rowChunkSize) {
			await flushRows();
		}
	}

	await flushRows();
	if (statements.length > 0) {
		await db.batch(statements);
	}

	return tokenRowCount;
}

async function batchTranscriptShortTokenStatements(
	db: Client | Transaction,
	transcriptDocuments: Awaited<ReturnType<typeof getTranscriptSearchDocuments>>,
	cueIdByKey: ReadonlyMap<string, number>,
) {
	const rowChunkSize = 500;
	const statementBatchSize = 20;
	const columns = ["token", "talk_id", "first_cue_id", "second_cue_id"];
	let rows: InValue[][] = [];
	let statements: InStatement[] = [];
	let tokenRowCount = 0;

	async function flushRows() {
		const statement = buildBulkInsertStatement(
			"transcript_short_token_index",
			columns,
			rows,
		);
		rows = [];
		if (!statement) {
			return;
		}

		statements.push(statement);
		if (statements.length >= statementBatchSize) {
			await db.batch(statements);
			statements = [];
		}
	}

	for (const document of transcriptDocuments) {
		const cueIdsByToken = new Map<string, ShortTokenCueIds>();

		for (const cue of document.cues) {
			const cueId = cueIdByKey.get(
				buildTranscriptCueKey(document.talkId, cue.index),
			);
			if (cueId === undefined) {
				throw new Error(`Missing transcript cue id for ${document.talkId}`);
			}

			for (const token of collectShortSearchTokens(cue.text)) {
				const cueIds = cueIdsByToken.get(token);
				if (!cueIds) {
					cueIdsByToken.set(token, {
						firstCueId: cueId,
						secondCueId: null,
					});
					continue;
				}

				if (cueIds.secondCueId === null && cueIds.firstCueId !== cueId) {
					cueIds.secondCueId = cueId;
				}
			}
		}

		for (const [token, cueIds] of cueIdsByToken) {
			tokenRowCount += 1;
			rows.push([
				token,
				document.talkId,
				cueIds.firstCueId,
				cueIds.secondCueId,
			]);
			if (rows.length >= rowChunkSize) {
				await flushRows();
			}
		}
	}

	await flushRows();
	if (statements.length > 0) {
		await db.batch(statements);
	}

	return tokenRowCount;
}

async function seedDatabase(): Promise<DatabaseConfig> {
	const config = getLibsqlDatabaseConfig();
	await ensureLocalDatabaseDirectory(config.url);

	const db = getLibsqlClient();
	const talks = await getTalks();
	const talksForDisplay = buildTalkGalleryTalks(talks);
	const indexedTalks = buildSearchIndex(talksForDisplay);
	const talkSortIndexById = new Map(
		indexedTalks.map(({ data }, sortIndex) => [data.id, sortIndex]),
	);
	const transcriptDocuments = await getTranscriptSearchDocuments();
	const transcriptCueIdByKey = buildTranscriptCueIdByKey(transcriptDocuments);
	const generatedDataHash = await getGeneratedSearchDataFingerprint();

	const talkStatements: InStatement[] = indexedTalks.map(
		({ data, searchText }, sortIndex) => ({
			sql: `
				INSERT INTO talks (
					id,
					display_json,
					search_text,
					sort_index,
					recorded_on_sort_value,
					collection_id,
					series_id
				)
				VALUES (?, ?, ?, ?, ?, ?, ?)
			`,
			args: [
				data.id,
				JSON.stringify(data),
				searchText,
				sortIndex,
				data.recordedOnSortValue,
				data.collectionId,
				data.seriesId,
			],
		}),
	);
	const talkSearchStatements: InStatement[] = indexedTalks.map(
		({ data, searchText }) => ({
			sql: "INSERT INTO talk_search_fts (talk_id, search_text) VALUES (?, ?)",
			args: [data.id, searchText],
		}),
	);
	const metaStatements: InStatement[] = [
		{
			sql: "INSERT INTO search_database_meta (key, value) VALUES (?, ?)",
			args: ["seededAt", new Date().toISOString()],
		},
		{
			sql: "INSERT INTO search_database_meta (key, value) VALUES (?, ?)",
			args: ["talkCount", String(indexedTalks.length)],
		},
		{
			sql: "INSERT INTO search_database_meta (key, value) VALUES (?, ?)",
			args: ["transcriptDocumentCount", String(transcriptDocuments.length)],
		},
		{
			sql: "INSERT INTO search_database_meta (key, value) VALUES (?, ?)",
			args: [GENERATED_DATA_HASH_META_KEY, generatedDataHash],
		},
		{
			sql: "INSERT INTO search_database_meta (key, value) VALUES (?, ?)",
			args: [
				SEARCH_DATABASE_SCHEMA_VERSION_META_KEY,
				SEARCH_DATABASE_SCHEMA_VERSION,
			],
		},
	];

	const transaction = await db.transaction("write");
	let transcriptCueCount = 0;
	let transcriptTokenCount = 0;
	let transcriptShortTokenCount = 0;
	try {
		await transaction.executeMultiple(SCHEMA_SQL);
		await batchStatements(transaction, talkStatements, 100);
		await batchStatements(transaction, talkSearchStatements, 100);
		transcriptTokenCount = await batchTranscriptTokenIndexStatements(
			transaction,
			transcriptDocuments,
			talkSortIndexById,
			transcriptCueIdByKey,
		);
		transcriptCueCount = await batchTranscriptCueStatements(
			transaction,
			transcriptDocuments,
			transcriptCueIdByKey,
		);
		transcriptShortTokenCount = await batchTranscriptShortTokenStatements(
			transaction,
			transcriptDocuments,
			transcriptCueIdByKey,
		);
		await batchStatements(
			transaction,
			[
				...metaStatements,
				{
					sql: "INSERT INTO search_database_meta (key, value) VALUES (?, ?)",
					args: ["transcriptCueCount", String(transcriptCueCount)],
				},
				{
					sql: "INSERT INTO search_database_meta (key, value) VALUES (?, ?)",
					args: ["transcriptTokenCount", String(transcriptTokenCount)],
				},
				{
					sql: "INSERT INTO search_database_meta (key, value) VALUES (?, ?)",
					args: [
						"transcriptShortTokenCount",
						String(transcriptShortTokenCount),
					],
				},
			],
			20,
		);
		await transaction.commit();
	} catch (error) {
		await transaction.rollback();
		throw error;
	}

	await compactLocalDatabase(db, config);

	console.log(
		`Seeded ${indexedTalks.length} talks, ${transcriptDocuments.length} transcript documents, ${transcriptCueCount} transcript cues, ${transcriptTokenCount} transcript token rows, and ${transcriptShortTokenCount} short transcript token rows into ${config.target} database (${config.url}).`,
	);
	return config;
}

let seededConfig: DatabaseConfig | null = null;
try {
	seededConfig = await seedDatabase();
} finally {
	closeLibsqlClientForScript();
	await removeLocalDatabaseSidecars(seededConfig);
}
