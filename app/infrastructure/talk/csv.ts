import { createHash } from "node:crypto";
import { resolveContentClassification } from "../../domain/content/collection";
import { normalizeTalkId } from "../../domain/talk/id";
import type { Talk } from "../../domain/talk/types";

const SPREADSHEET_ID = "1QMyakqH1i-W_bbK3yJl7u_Q_Jb_AoM94W6F8Gg3y3CA";

export type ParseCSVToTalksOptions = {
	audioLinkHeaders?: readonly string[];
	collectionSources?: readonly string[];
	eventFallback?: string;
	seriesSources?: readonly string[];
};

export type TalkSheetSource = {
	name: string;
	url: string;
	parseOptions?: ParseCSVToTalksOptions;
};

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
			audioLinkHeaders: ["MP3リンク", "MP4リンク", "ISOリンク"],
			collectionSources: ["経典解説"],
			seriesSources: ["ダンマパダ"],
		},
	},
	{
		name: "アビダンマ",
		url: buildSheetCsvUrl("1186405772"),
		parseOptions: {
			audioLinkHeaders: ["MP3リンク"],
			collectionSources: ["経典解説"],
			eventFallback: "アビダンマ",
			seriesSources: ["アビダンマ"],
		},
	},
	{
		name: "経典解説",
		url: buildSheetCsvUrl("2131360778"),
		parseOptions: {
			audioLinkHeaders: ["MP3リンク"],
			collectionSources: ["経典解説"],
			eventFallback: "経典解説",
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

function shouldSkipRow(
	getValue: (header: string) => string,
	getValueFromHeaders: (headers: string[]) => string,
): boolean {
	const explicitVisibility = getValueFromHeaders([
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

	const privateFlag = getValue("非公開");
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

export function parseCSVToTalks(
	text: string,
	options: ParseCSVToTalksOptions = {},
): Talk[] {
	const lines = splitCSVLines(text);

	if (lines.length === 0) {
		return [];
	}

	const headerCells = splitCSVLine(lines[0]);
	const headerIndex = headerCells.reduce<Record<string, number>>(
		(accumulator, header, index) => {
			const normalizedHeader = normalizeHeader(header);
			if (accumulator[normalizedHeader] === undefined) {
				accumulator[normalizedHeader] = index;
			}
			return accumulator;
		},
		{},
	);

	const getValue = (cells: string[], header: string): string => {
		const index = headerIndex[normalizeHeader(header)];
		if (index === undefined) {
			return "";
		}
		return (cells[index] ?? "").trim();
	};

	const getValueFromHeaders = (cells: string[], headers: string[]): string => {
		for (const header of headers) {
			const value = getValue(cells, header);
			if (value) {
				return value;
			}
		}
		return "";
	};

	const getLinksFromHeaders = (
		cells: string[],
		headers: string[],
	): string[] => {
		const links: string[] = [];
		const usedLinks = new Set<string>();

		for (const header of headers) {
			const link = sanitizeLink(getValue(cells, header));
			if (!link || usedLinks.has(link)) {
				continue;
			}
			usedLinks.add(link);
			links.push(link);
		}

		return links;
	};

	const talks: Talk[] = [];
	const usedIds = new Set<string>();
	const dvdIdCounts = new Map<string, number>();

	for (let i = 1; i < lines.length; i += 1) {
		const line = lines[i];
		if (!line) {
			continue;
		}

		const cells = splitCSVLine(line);
		if (
			shouldSkipRow(
				(header) => getValue(cells, header),
				(headers) => getValueFromHeaders(cells, headers),
			)
		) {
			continue;
		}

		const event = getValue(cells, "行事名") || options.eventFallback || "";
		const title = getValue(cells, "タイトル");
		const description = getValue(cells, "内容");

		if (!event && !title && !description) {
			continue;
		}

		const idRaw = getValueFromHeaders(cells, [
			"ID",
			"id",
			"Id",
			"ＩＤ",
			"ｉｄ",
		]);
		const dvdId = idRaw ? normalizeTalkId(idRaw) : "";
		if (!dvdId) {
			continue;
		}

		dvdIdCounts.set(dvdId, (dvdIdCounts.get(dvdId) ?? 0) + 1);
	}

	for (let i = 1; i < lines.length; i += 1) {
		const line = lines[i];
		if (!line) {
			continue;
		}

		const cells = splitCSVLine(line);
		if (
			shouldSkipRow(
				(header) => getValue(cells, header),
				(headers) => getValueFromHeaders(cells, headers),
			)
		) {
			continue;
		}

		const event = getValue(cells, "行事名") || options.eventFallback || "";
		const title = getValue(cells, "タイトル");
		const description = getValue(cells, "内容");
		const collectionLabel = getValueFromHeaders(cells, [
			"コレクション",
			"分類",
			"資料種別",
			"コンテンツ種別",
		]);
		const seriesLabel = getValueFromHeaders(cells, [
			"シリーズ",
			"対象テキスト",
			"テキスト",
			"経典",
			"講義シリーズ",
		]);

		if (!event && !title && !description) {
			continue;
		}

		const recordedOn1 = getValueFromHeaders(cells, [
			"収録日1",
			"収録日 1",
			"収録日１",
			"収録日 １",
		]);
		const recordedOn2 = getValueFromHeaders(cells, [
			"収録日2",
			"収録日 2",
			"収録日２",
			"収録日 ２",
		]);
		const recordedOnSingle = getValueFromHeaders(cells, ["収録日", "収録日 "]);

		const recordedOn =
			recordedOn1 && recordedOn2
				? `${recordedOn1} / ${recordedOn2}`
				: recordedOn1 || recordedOn2 || recordedOnSingle;

		const idRaw = getValueFromHeaders(cells, [
			"ID",
			"id",
			"Id",
			"ＩＤ",
			"ｉｄ",
		]);
		const dvdId = idRaw ? normalizeTalkId(idRaw) : "";

		const chapterRaw = getValueFromHeaders(cells, [
			"章番号",
			"ID(章)",
			"章",
			"章1",
			"章2",
			"chapter",
			"Chapter",
		]);
		const chapterNumber = parseChapterNumber(chapterRaw);

		const dvdIdKey =
			dvdId && chapterNumber ? `${dvdId}-${chapterNumber}` : dvdId;

		const venue = getValue(cells, "収録場所");
		const duration = getValue(cells, "収録時間");
		const speaker = getValue(cells, "講師");
		const language = getValue(cells, "言語");
		const format = getValueFromHeaders(cells, [
			"音声フォーマット",
			"ファイルのフォーマット",
		]);
		const audioLink = sanitizeLink(
			getValueFromHeaders(cells, [
				"リンク",
				"音源リンク",
				...Array.from(options.audioLinkHeaders ?? []),
			]),
		);
		const attachmentsLink = sanitizeLink(
			getValueFromHeaders(cells, [
				"添付データ（スライド、サマリー等）",
				"添付データ",
			]),
		);
		const slideLinks = getLinksFromHeaders(cells, [
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
			getValueFromHeaders(cells, [
				"YouTube",
				"YouTubeリンク",
				"YoTubeリンク",
				"youtube",
			]) || (cells[12] ? cells[12].trim() : ""),
		);
		const srtLink = sanitizeLink(getValueFromHeaders(cells, ["SRTリンク"]));
		const classification = resolveContentClassification({
			collectionSources: [
				collectionLabel,
				...Array.from(options.collectionSources ?? []),
				event,
			],
			seriesSources: [seriesLabel, ...Array.from(options.seriesSources ?? [])],
		});

		const fingerprint = [
			`dvdId:${dvdIdKey}`,
			`event:${event}`,
			`title:${title}`,
			`description:${description}`,
			`recordedOn:${recordedOn}`,
			`venue:${venue}`,
			`speaker:${speaker}`,
			`duration:${duration}`,
			`language:${language}`,
			`format:${format}`,
			`audioLink:${audioLink ?? ""}`,
			`attachmentsLink:${attachmentsLink ?? ""}`,
			`youtubeLink:${youtubeLink ?? ""}`,
		]
			.map(normalizeFingerprintPart)
			.join("\n");

		const hash = hashTalkKey(fingerprint);
		const baseTalkId = dvdIdKey ? `TALK-${dvdIdKey}-${hash}` : `TALK-${hash}`;

		let uniqueId = baseTalkId;
		let suffix = 1;
		while (usedIds.has(uniqueId)) {
			uniqueId = `${baseTalkId}-${suffix}`;
			suffix += 1;
		}
		usedIds.add(uniqueId);

		const shouldAppendChapter =
			Boolean(dvdId) &&
			(dvdIdCounts.get(dvdId) ?? 0) > 1 &&
			Boolean(chapterNumber);
		const titleWithChapter =
			shouldAppendChapter &&
			title &&
			!title.trim().endsWith(` ${chapterNumber}`)
				? `${title} ${chapterNumber}`
				: title;

		talks.push({
			id: uniqueId,
			kind: "talk",
			collectionId: classification.collectionId,
			collectionLabel: classification.collectionLabel,
			seriesId: classification.seriesId,
			seriesLabel: classification.seriesLabel,
			dvdId,
			folder: getValueFromHeaders(cells, ["Dropboxフォルダー名"]),
			event,
			venue,
			recordedOn,
			recordedOnDate:
				parseDate(recordedOn1 || recordedOnSingle) ||
				parseDate(recordedOn2) ||
				null,
			duration,
			title: titleWithChapter,
			description,
			speaker,
			language,
			format,
			audioLink,
			attachmentsLink,
			slideLinks,
			youtubeLink,
			srtLink,
		});
	}

	return talks;
}
