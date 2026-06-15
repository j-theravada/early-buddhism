import { normalizeTalkId } from "./id";
import type { Talk } from "./types";

type TalkTagRule = {
	tag: string;
	keywords: readonly string[];
	inferFromTranscript?: boolean;
	transcriptMinHits?: number;
};

const MAX_TRANSCRIPT_TAGS = 5;

export type TalkTagOverrides = {
	byId?: Record<string, string[]>;
	byDvdId?: Record<string, string[]>;
};

export const TALK_TAG_RULES = [
	{
		tag: "怒り",
		keywords: ["怒り", "怒る", "怒ら", "瞋"],
		transcriptMinHits: 8,
	},
	{
		tag: "瞑想",
		keywords: ["瞑想", "座禅", "禅定", "止観"],
		transcriptMinHits: 6,
	},
	{ tag: "慈悲", keywords: ["慈悲"], transcriptMinHits: 5 },
	{
		tag: "四聖諦",
		keywords: ["四聖諦", "四諦", "苦諦", "集諦", "滅諦", "道諦"],
		transcriptMinHits: 2,
	},
	{
		tag: "八正道",
		keywords: [
			"八正道",
			"正見",
			"正思惟",
			"正語",
			"正業",
			"正命",
			"正精進",
			"正念",
			"正定",
		],
		transcriptMinHits: 2,
	},
	{ tag: "無常", keywords: ["無常", "生滅"], transcriptMinHits: 5 },
	{ tag: "無我", keywords: ["無我", "非我"], transcriptMinHits: 4 },
	{
		tag: "ヴィパッサナー",
		keywords: ["ヴィパッサナー", "vipassana"],
		transcriptMinHits: 3,
	},
	{
		tag: "サティ",
		keywords: ["サティ", "念処", "マインドフルネス"],
		transcriptMinHits: 3,
	},
	{ tag: "縁起", keywords: ["縁起", "因縁", "因果"], transcriptMinHits: 5 },
	{
		tag: "輪廻",
		keywords: ["輪廻", "転生", "来世", "死後"],
		transcriptMinHits: 5,
	},
	{
		tag: "悟り",
		keywords: ["悟り", "覚り", "解脱", "涅槃"],
		transcriptMinHits: 6,
	},
	{
		tag: "苦",
		keywords: ["苦し", "苦痛", "苦悩", "苦諦", "四苦八苦"],
		transcriptMinHits: 15,
	},
	{ tag: "死", keywords: ["死", "臨終", "葬式"], transcriptMinHits: 18 },
	{
		tag: "幸福",
		keywords: ["幸福", "幸せ", "安らぎ"],
		inferFromTranscript: false,
		transcriptMinHits: 15,
	},
	{
		tag: "心",
		keywords: ["心", "こころ", "精神"],
		inferFromTranscript: false,
		transcriptMinHits: 50,
	},
	{
		tag: "人間関係",
		keywords: [
			"人間関係",
			"つき合い",
			"付き合い",
			"家族",
			"親子",
			"子ども",
			"友達",
			"友人",
			"夫婦",
		],
		inferFromTranscript: false,
		transcriptMinHits: 4,
	},
	{
		tag: "仕事",
		keywords: ["仕事", "職場", "経営", "ビジネス"],
		inferFromTranscript: false,
		transcriptMinHits: 8,
	},
	{
		tag: "病気",
		keywords: ["病気", "健康", "医療", "病院", "治療"],
		inferFromTranscript: false,
		transcriptMinHits: 4,
	},
	{
		tag: "欲",
		keywords: ["欲望", "欲しい", "執着", "渇愛", "貪"],
		transcriptMinHits: 10,
	},
	{
		tag: "善悪",
		keywords: [
			"善悪",
			"善行",
			"悪行",
			"不善",
			"善業",
			"悪業",
			"罪",
			"罰",
			"因果応報",
		],
		transcriptMinHits: 8,
	},
	{ tag: "戒律", keywords: ["戒律", "五戒"], transcriptMinHits: 3 },
	{
		tag: "経典",
		keywords: ["経典", "パーリ経典", "法句経", "ダンマパダ"],
		transcriptMinHits: 5,
	},
	{
		tag: "月例講演会",
		keywords: ["月例講演会"],
		inferFromTranscript: false,
	},
] satisfies TalkTagRule[];

export const TALK_TAGS = TALK_TAG_RULES.map((rule) => rule.tag);

function normalizeForMatching(value: string): string {
	return value.normalize("NFKC").toLowerCase();
}

function normalizeTag(value: string): string {
	return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function uniqueTags(tags: readonly string[]): string[] {
	const result: string[] = [];
	const seen = new Set<string>();

	for (const tag of tags) {
		const normalized = normalizeTag(tag);
		if (!normalized) {
			continue;
		}

		const key = normalizeForMatching(normalized);
		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		result.push(normalized);
	}

	return result;
}

function getOverrideTags(
	overrides: Record<string, string[]> | undefined,
	lookupKey: string,
): string[] {
	if (!lookupKey || !overrides) {
		return [];
	}

	for (const [key, tags] of Object.entries(overrides)) {
		if (normalizeTalkId(key) === lookupKey && Array.isArray(tags)) {
			return tags;
		}
	}

	return [];
}

function countOccurrences(source: string, keyword: string): number {
	const normalizedKeyword = normalizeForMatching(keyword);
	if (!normalizedKeyword) {
		return 0;
	}

	return source.split(normalizedKeyword).length - 1;
}

export function deriveTalkTags(
	talk: Pick<Talk, "title" | "description" | "event">,
): string[] {
	const text = normalizeForMatching(
		[talk.title, talk.description, talk.event].filter(Boolean).join(" "),
	);

	return TALK_TAG_RULES.filter((rule) =>
		rule.keywords.some((keyword) =>
			text.includes(normalizeForMatching(keyword)),
		),
	).map((rule) => rule.tag);
}

export function deriveTalkTagsFromTranscript(content: string): string[] {
	const text = normalizeForMatching(content);

	return TALK_TAG_RULES.filter((rule) => rule.inferFromTranscript !== false)
		.map((rule, index) => {
			const minHits = rule.transcriptMinHits ?? 3;
			const hitCount = rule.keywords.reduce(
				(total, keyword) => total + countOccurrences(text, keyword),
				0,
			);
			return {
				index,
				minHits,
				hitCount,
				score: hitCount / minHits,
				tag: rule.tag,
			};
		})
		.filter((candidate) => candidate.hitCount >= candidate.minHits)
		.sort((a, b) => b.score - a.score || a.index - b.index)
		.slice(0, MAX_TRANSCRIPT_TAGS)
		.map((candidate) => candidate.tag);
}

export function getTalkTags(
	talk: Pick<Talk, "id" | "dvdId" | "title" | "description" | "event"> & {
		tags?: string[];
	},
	overrides: TalkTagOverrides = {},
): string[] {
	const idTags = getOverrideTags(overrides.byId, normalizeTalkId(talk.id));
	const dvdIdTags = getOverrideTags(
		overrides.byDvdId,
		normalizeTalkId(talk.dvdId),
	);

	return uniqueTags([
		...idTags,
		...dvdIdTags,
		...(talk.tags ?? []),
		...deriveTalkTags(talk),
	]);
}
