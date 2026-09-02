import { createHash } from "node:crypto";
import { resolveContentClassification } from "../../domain/content/collection";
import { normalizeTalkId } from "../../domain/talk/id";
import type { Talk } from "../../domain/talk/types";

const SPREADSHEET_ID = "1QMyakqH1i-W_bbK3yJl7u_Q_Jb_AoM94W6F8Gg3y3CA";

export type ParseCSVToTalksOptions = {
	collectionSources?: readonly string[];
	eventFallback?: string;
	seriesSources?: readonly string[];
	sourceMediaLinkHeaders?: readonly string[];
};

export type TalkSheetSource = {
	name: string;
	url: string;
	parseOptions?: ParseCSVToTalksOptions;
};

type CSVHeaderIndex = Record<string, number>;

function buildSheetCsvUrl(gid: string): string {
	return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
}

export const TALK_SHEET_SOURCES: readonly TalkSheetSource[] = [
	{
		name: "DVD",
		url: buildSheetCsvUrl("909287277"),
		parseOptions: {
			collectionSources: ["月例講演会"],
		},
	},
	{
		name: "ダンマパダ（DD）",
		url: buildSheetCsvUrl("1726614353"),
		parseOptions: {
			collectionSources: ["経典解説"],
			seriesSources: ["ダンマパダ"],
			sourceMediaLinkHeaders: ["MP3リンク", "MP4リンク", "ISOリンク"],
		},
	},
	{
		name: "アビダンマ",
		url: buildSheetCsvUrl("1186405772"),
		parseOptions: {
			collectionSources: ["経典解説"],
			eventFallback: "アビダンマ",
			seriesSources: ["アビダンマ"],
			sourceMediaLinkHeaders: ["MP3リンク"],
		},
	},
	{
		name: "経典解説",
		url: buildSheetCsvUrl("2131360778"),
		parseOptions: {
			collectionSources: ["経典解説"],
			eventFallback: "経典解説",
			sourceMediaLinkHeaders: ["MP3リンク"],
		},
	},
];

export const SHEET_URL =
	TALK_SHEET_SOURCES[0]?.url ?? buildSheetCsvUrl("909287277");

function parseChapterNumber(value: string): string {
	const normalized = value
		.replace(/\uFEFF/g, "")
		.normalize("NFKC")
		.trim();
	if (!normalized) {
		return "";
	}
	const match = normalized.match(/\d+/);
	if (!match) {
		return "";
	}
	return String(Number(match[0]));
}

function splitCSVLine(line: string): string[] {
	const result: string[] = [];
	let current = "";
	let insideQuotes = false;

	for (let i = 0; i < line.length; i += 1) {
		const char = line[i];
		if (char === '"') {
			if (insideQuotes && line[i + 1] === '"') {
				current += '"';
				i += 1;
			} else {
				insideQuotes = !insideQuotes;
			}
			continue;
		}

		if (char === "," && !insideQuotes) {
			result.push(current);
			current = "";
			continue;
		}

		current += char;
	}

	result.push(current);
	return result;
}

function parseDate(value: string): Date | null {
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}

	const withoutWeekday = trimmed.replace(/（[^)]+）|\([^)]+\)/g, "");
	const normalized = withoutWeekday
		.replace(/\./g, "/")
		.replace(/[年月]/g, "/")
		.replace(/日/g, "")
		.replace(/-+/g, "/")
		.replace(/\/+/g, "/")
		.replace(/^\/|\/$/g, "");

	const [yearRaw, monthRaw, dayRaw = "1"] = normalized
		.split("/")
		.map((part) => part.trim())
		.filter((part) => part.length > 0);

	const year = Number(yearRaw);
	const month = Number(monthRaw);
	const day = Number(dayRaw);

	if (
		Number.isNaN(year) ||
		Number.isNaN(month) ||
		Number.isNaN(day) ||
		year < 1000
	) {
		return null;
	}

	const date = new Date(Date.UTC(year, month - 1, day));
	if (Number.isNaN(date.getTime())) {
		return null;
	}

	return date;
}

function sanitizeLink(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed || trimmed === "-" || trimmed === "#") {
		return null;
	}
	return trimmed;
}

function normalizeHeader(value: string): string {
	return value
		.replace(/\uFEFF/g, "")
		.normalize("NFKC")
		.replace(/\s+/g, "")
		.trim();
}

function normalizeVisibilityValue(value: string): string {
	return value.normalize("NFKC").replace(/\s+/g, "").trim().toLowerCase();
}

function shouldSkipRow(cells: string[], headerIndex: CSVHeaderIndex): boolean {
	const explicitVisibility = getCSVValueFromHeaders(cells, headerIndex, [
		"公開・非公開",
		"公開非公開",
		"公開/非公開",
	]);
	if (explicitVisibility) {
		const normalized = normalizeVisibilityValue(explicitVisibility);
		return (
			normalized.includes("非公開") ||
			normalized.includes("未公開") ||
			normalized === "false"
		);
	}

	const privateFlag = getCSVValue(cells, headerIndex, "非公開");
	if (!privateFlag) {
		return false;
	}

	const normalized = normalizeVisibilityValue(privateFlag);
	return (
		normalized === "false" ||
		normalized.includes("非公開") ||
		normalized.includes("未公開")
	);
}

function normalizeFingerprintPart(value: string): string {
	return value
		.replace(/\uFEFF/g, "")
		.normalize("NFKC")
		.replace(/\s+/g, " ")
		.trim();
}

function hashTalkKey(fingerprint: string): string {
	return createHash("sha256")
		.update(fingerprint, "utf8")
		.digest("hex")
		.slice(0, 12)
		.toUpperCase();
}

function splitCSVLines(text: string): string[] {
	const lines: string[] = [];
	let current = "";
	let insideQuotes = false;

	for (let i = 0; i < text.length; i += 1) {
		const char = text[i];
		const nextChar = text[i + 1];

		if (char === '"') {
			if (insideQuotes && nextChar === '"') {
				current += '"';
				i += 1;
			} else {
				insideQuotes = !insideQuotes;
				current += char;
			}
			continue;
		}

		if (
			(char === "\n" || (char === "\r" && nextChar === "\n")) &&
			!insideQuotes
		) {
			if (char === "\r" && nextChar === "\n") {
				i += 1;
			}
			const trimmed = current.trim();
			if (trimmed.length > 0) {
				lines.push(trimmed);
			}
			current = "";
			continue;
		}

		current += char;
	}

	const trimmed = current.trim();
	if (trimmed.length > 0) {
		lines.push(trimmed);
	}

	return lines;
}

type TalkRowIdentity = {
	event: string;
	title: string;
	description: string;
};

type TalkRowDate = {
	recordedOn: string;
	recordedOnDate: Date | null;
};

type TalkRowLinks = {
	rawSourceMediaLink: string | null;
	attachmentsLink: string | null;
	slideLinks: string[];
	youtubeLink: string | null;
	srtLink: string | null;
};

function buildCSVHeaderIndex(headerCells: string[]): CSVHeaderIndex {
	return headerCells.reduce<CSVHeaderIndex>((accumulator, header, index) => {
		const normalizedHeader = normalizeHeader(header);
		if (accumulator[normalizedHeader] === undefined) {
			accumulator[normalizedHeader] = index;
		}
		return accumulator;
	}, {});
}

function getCSVValue(
	cells: string[],
	headerIndex: CSVHeaderIndex,
	header: string,
): string {
	const index = headerIndex[normalizeHeader(header)];
	if (index === undefined) {
		return "";
	}
	return (cells[index] ?? "").trim();
}

function getCSVValueFromHeaders(
	cells: string[],
	headerIndex: CSVHeaderIndex,
	headers: readonly string[],
): string {
	for (const header of headers) {
		const value = getCSVValue(cells, headerIndex, header);
		if (value) {
			return value;
		}
	}
	return "";
}

function getCSVLinksFromHeaders(
	cells: string[],
	headerIndex: CSVHeaderIndex,
	headers: readonly string[],
): string[] {
	const links: string[] = [];
	const usedLinks = new Set<string>();
	for (const header of headers) {
		const link = sanitizeLink(getCSVValue(cells, headerIndex, header));
		if (!link || usedLinks.has(link)) {
			continue;
		}
		usedLinks.add(link);
		links.push(link);
	}
	return links;
}

function readTalkRowIdentity(
	cells: string[],
	headerIndex: CSVHeaderIndex,
	options: ParseCSVToTalksOptions,
): TalkRowIdentity {
	return {
		event:
			getCSVValue(cells, headerIndex, "行事名") || options.eventFallback || "",
		title: getCSVValue(cells, headerIndex, "タイトル"),
		description: getCSVValue(cells, headerIndex, "内容"),
	};
}

function hasTalkRowContent(identity: TalkRowIdentity): boolean {
	return Boolean(identity.event || identity.title || identity.description);
}

function readDvdId(cells: string[], headerIndex: CSVHeaderIndex): string {
	const idRaw = getCSVValueFromHeaders(cells, headerIndex, [
		"ID",
		"id",
		"Id",
		"ＩＤ",
		"ｉｄ",
	]);
	return idRaw ? normalizeTalkId(idRaw) : "";
}

function countDvdIds(
	lines: string[],
	headerIndex: CSVHeaderIndex,
	options: ParseCSVToTalksOptions,
): Map<string, number> {
	const dvdIdCounts = new Map<string, number>();
	for (let index = 1; index < lines.length; index += 1) {
		const line = lines[index];
		if (!line) continue;
		const cells = splitCSVLine(line);
		if (shouldSkipRow(cells, headerIndex)) continue;
		if (!hasTalkRowContent(readTalkRowIdentity(cells, headerIndex, options))) {
			continue;
		}

		const dvdId = readDvdId(cells, headerIndex);
		if (!dvdId) continue;
		dvdIdCounts.set(dvdId, (dvdIdCounts.get(dvdId) ?? 0) + 1);
	}
	return dvdIdCounts;
}

function readTalkRowDate(
	cells: string[],
	headerIndex: CSVHeaderIndex,
): TalkRowDate {
	const recordedOn1 = getCSVValueFromHeaders(cells, headerIndex, [
		"収録日1",
		"収録日 1",
		"収録日１",
		"収録日 １",
	]);
	const recordedOn2 = getCSVValueFromHeaders(cells, headerIndex, [
		"収録日2",
		"収録日 2",
		"収録日２",
		"収録日 ２",
	]);
	const recordedOnSingle = getCSVValueFromHeaders(cells, headerIndex, [
		"収録日",
		"収録日 ",
	]);
	return {
		recordedOn:
			recordedOn1 && recordedOn2
				? `${recordedOn1} / ${recordedOn2}`
				: recordedOn1 || recordedOn2 || recordedOnSingle,
		recordedOnDate:
			parseDate(recordedOn1 || recordedOnSingle) ||
			parseDate(recordedOn2) ||
			null,
	};
}

function readTalkRowLinks(
	cells: string[],
	headerIndex: CSVHeaderIndex,
	options: ParseCSVToTalksOptions,
): TalkRowLinks {
	const rawSourceMediaLink = sanitizeLink(
		getCSVValueFromHeaders(cells, headerIndex, [
			"リンク",
			"音源リンク",
			...Array.from(options.sourceMediaLinkHeaders ?? []),
		]),
	);
	const attachmentsLink = sanitizeLink(
		getCSVValueFromHeaders(cells, headerIndex, [
			"添付データ（スライド、サマリー等）",
			"添付データ",
		]),
	);
	const slideLinks = getCSVLinksFromHeaders(cells, headerIndex, [
		"PPTリンク1",
		"PPTリンク2",
		"PPTリンク 1",
		"PPTリンク 2",
		"ＰＰＴリンク１",
		"ＰＰＴリンク２",
		"スライドリンク1",
		"スライドリンク2",
		"スライドリンク 1",
		"スライドリンク 2",
		"スライド",
	]);
	const youtubeLink = sanitizeLink(
		getCSVValueFromHeaders(cells, headerIndex, [
			"YouTube",
			"YouTubeリンク",
			"YoTubeリンク",
			"youtube",
		]) || (cells[12] ?? "").trim(),
	);
	const srtLink = sanitizeLink(
		getCSVValueFromHeaders(cells, headerIndex, ["SRTリンク"]),
	);
	return {
		rawSourceMediaLink,
		attachmentsLink,
		slideLinks,
		youtubeLink,
		srtLink,
	};
}

function buildUniqueTalkId(
	fingerprint: string,
	dvdIdKey: string,
	usedIds: Set<string>,
): string {
	const hash = hashTalkKey(fingerprint);
	const baseTalkId = dvdIdKey ? `TALK-${dvdIdKey}-${hash}` : `TALK-${hash}`;
	let uniqueId = baseTalkId;
	let suffix = 1;
	while (usedIds.has(uniqueId)) {
		uniqueId = `${baseTalkId}-${suffix}`;
		suffix += 1;
	}
	usedIds.add(uniqueId);
	return uniqueId;
}

function appendDuplicateChapterToTitle(
	title: string,
	dvdId: string,
	chapterNumber: string,
	dvdIdCounts: Map<string, number>,
): string {
	const shouldAppendChapter =
		Boolean(dvdId) &&
		(dvdIdCounts.get(dvdId) ?? 0) > 1 &&
		Boolean(chapterNumber);
	return shouldAppendChapter &&
		title &&
		!title.trim().endsWith(` ${chapterNumber}`)
		? `${title} ${chapterNumber}`
		: title;
}

function parseTalkRow(
	line: string,
	headerIndex: CSVHeaderIndex,
	options: ParseCSVToTalksOptions,
	dvdIdCounts: Map<string, number>,
	usedIds: Set<string>,
): Talk | null {
	const cells = splitCSVLine(line);
	if (shouldSkipRow(cells, headerIndex)) return null;

	const identity = readTalkRowIdentity(cells, headerIndex, options);
	if (!hasTalkRowContent(identity)) return null;

	const collectionLabel = getCSVValueFromHeaders(cells, headerIndex, [
		"コレクション",
		"分類",
		"資料種別",
		"コンテンツ種別",
	]);
	const seriesLabel = getCSVValueFromHeaders(cells, headerIndex, [
		"シリーズ",
		"対象テキスト",
		"テキスト",
		"経典",
		"講義シリーズ",
	]);
	const date = readTalkRowDate(cells, headerIndex);
	const dvdId = readDvdId(cells, headerIndex);
	const chapterNumber = parseChapterNumber(
		getCSVValueFromHeaders(cells, headerIndex, [
			"章番号",
			"ID(章)",
			"章",
			"章1",
			"章2",
			"chapter",
			"Chapter",
		]),
	);
	const dvdIdKey = dvdId && chapterNumber ? `${dvdId}-${chapterNumber}` : dvdId;
	const venue = getCSVValue(cells, headerIndex, "収録場所");
	const duration = getCSVValue(cells, headerIndex, "収録時間");
	const speaker = getCSVValue(cells, headerIndex, "講師");
	const language = getCSVValue(cells, headerIndex, "言語");
	const format = getCSVValueFromHeaders(cells, headerIndex, [
		"音声フォーマット",
		"ファイルのフォーマット",
	]);
	const links = readTalkRowLinks(cells, headerIndex, options);
	const classification = resolveContentClassification({
		collectionSources: [
			collectionLabel,
			...Array.from(options.collectionSources ?? []),
			identity.event,
		],
		seriesSources: [seriesLabel, ...Array.from(options.seriesSources ?? [])],
	});
	const fingerprint = [
		`dvdId:${dvdIdKey}`,
		`event:${identity.event}`,
		`title:${identity.title}`,
		`description:${identity.description}`,
		`recordedOn:${date.recordedOn}`,
		`venue:${venue}`,
		`speaker:${speaker}`,
		`duration:${duration}`,
		`language:${language}`,
		`format:${format}`,
		`audioLink:${links.rawSourceMediaLink ?? ""}`,
		`attachmentsLink:${links.attachmentsLink ?? ""}`,
		`youtubeLink:${links.youtubeLink ?? ""}`,
	]
		.map(normalizeFingerprintPart)
		.join("\n");

	return {
		id: buildUniqueTalkId(fingerprint, dvdIdKey, usedIds),
		kind: "talk",
		collectionId: classification.collectionId,
		collectionLabel: classification.collectionLabel,
		seriesId: classification.seriesId,
		seriesLabel: classification.seriesLabel,
		dvdId,
		folder: getCSVValueFromHeaders(cells, headerIndex, ["Dropboxフォルダー名"]),
		event: identity.event,
		venue,
		recordedOn: date.recordedOn,
		recordedOnDate: date.recordedOnDate,
		duration,
		title: appendDuplicateChapterToTitle(
			identity.title,
			dvdId,
			chapterNumber,
			dvdIdCounts,
		),
		description: identity.description,
		speaker,
		language,
		format,
		attachmentsLink: links.attachmentsLink,
		slideLinks: links.slideLinks,
		youtubeLink: links.youtubeLink,
		srtLink: links.srtLink,
	};
}

export function parseCSVToTalks(
	text: string,
	options: ParseCSVToTalksOptions = {},
): Talk[] {
	const lines = splitCSVLines(text);

	if (lines.length === 0) {
		return [];
	}

	const headerIndex = buildCSVHeaderIndex(splitCSVLine(lines[0]));
	const dvdIdCounts = countDvdIds(lines, headerIndex, options);
	const talks: Talk[] = [];
	const usedIds = new Set<string>();
	for (let index = 1; index < lines.length; index += 1) {
		const line = lines[index];
		if (!line) continue;
		const talk = parseTalkRow(line, headerIndex, options, dvdIdCounts, usedIds);
		if (talk) talks.push(talk);
	}

	return talks;
}
