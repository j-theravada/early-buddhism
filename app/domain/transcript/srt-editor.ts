import { parseSrt } from "./parser";
import type { TranscriptCue } from "./types";

export class SrtCueConflictError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SrtCueConflictError";
	}
}

export type SrtCueTextReplacement = Pick<
	TranscriptCue,
	"index" | "start" | "end" | "text"
> & {
	proposedText: string;
};

export type SrtEditResult = {
	content: string;
	changed: boolean;
};

type CueIdentity = Pick<TranscriptCue, "index" | "start" | "end">;

type SourceLine = {
	content: string;
	contentEnd: number;
	separator: string;
	start: number;
};

type SourceBlock = {
	end: number;
	start: number;
};

function readSourceLines(content: string): SourceLine[] {
	const lines: SourceLine[] = [];
	const pattern = /([^\r\n]*)(\r\n|\n|\r|$)/g;
	let match: RegExpExecArray | null;

	while ((match = pattern.exec(content)) !== null) {
		const lineContent = match[1] ?? "";
		const separator = match[2] ?? "";
		const start = match.index;
		lines.push({
			content: lineContent,
			contentEnd: start + lineContent.length,
			separator,
			start,
		});
		if (!separator) break;
	}

	return lines;
}

function collectSourceBlocks(lines: SourceLine[]): SourceBlock[] {
	const blocks: SourceBlock[] = [];
	let blockStart: number | null = null;

	for (let index = 0; index < lines.length; index += 1) {
		const isBlank = (lines[index]?.content.trim().length ?? 0) === 0;
		if (!isBlank && blockStart === null) blockStart = index;
		if (isBlank && blockStart !== null) {
			blocks.push({ start: blockStart, end: index - 1 });
			blockStart = null;
		}
	}
	if (blockStart !== null) {
		blocks.push({ start: blockStart, end: lines.length - 1 });
	}

	return blocks;
}

function buildBlockContent(lines: SourceLine[], block: SourceBlock): string {
	return lines
		.slice(block.start, block.end + 1)
		.map((line) => `${line.content}${line.separator}`)
		.join("");
}

function isSameTime(actual: number, expected: number): boolean {
	return Math.abs(actual - expected) < 0.000_5;
}

function hasSameCueIdentity(
	actual: TranscriptCue,
	expected: CueIdentity,
): boolean {
	return (
		actual.index === expected.index &&
		isSameTime(actual.start, expected.start) &&
		isSameTime(actual.end, expected.end)
	);
}

function findTextRange(
	lines: SourceLine[],
	block: SourceBlock,
): { start: number; end: number; newline: string } | null {
	let timingLineIndex = block.start;
	if (/^\d+$/.test(lines[timingLineIndex]?.content.trim() ?? "")) {
		timingLineIndex += 1;
	}
	const firstTextLine = timingLineIndex + 1;
	if (firstTextLine > block.end) return null;

	const newline =
		lines[firstTextLine]?.separator ||
		lines[timingLineIndex]?.separator ||
		"\n";
	return {
		start: lines[firstTextLine]?.start ?? 0,
		end: lines[block.end]?.contentEnd ?? 0,
		newline,
	};
}

function assertOnlyTargetTextChanged(
	beforeContent: string,
	afterContent: string,
	expected: SrtCueTextReplacement,
) {
	const before = parseSrt(beforeContent);
	const after = parseSrt(afterContent);
	if (before.length !== after.length) {
		throw new Error("SRT cue count changed while replacing text.");
	}

	let changedCueCount = 0;
	for (let index = 0; index < before.length; index += 1) {
		const previous = before[index];
		const current = after[index];
		if (!previous || !current || !hasSameCueIdentity(current, previous)) {
			throw new Error("SRT cue identity changed while replacing text.");
		}
		if (previous.text === current.text) continue;
		changedCueCount += 1;
		if (
			!hasSameCueIdentity(previous, expected) ||
			current.text !== expected.proposedText
		) {
			throw new Error("An unexpected SRT cue changed while replacing text.");
		}
	}

	if (changedCueCount !== 1) {
		throw new Error("SRT replacement did not change exactly one cue.");
	}
}

export function replaceSrtCueText(
	content: string,
	expected: SrtCueTextReplacement,
): SrtEditResult {
	const lines = readSourceLines(content);
	let matchingBlock: SourceBlock | null = null;
	let isAlreadyApplied = false;
	let hasTargetCue = false;

	for (const block of collectSourceBlocks(lines)) {
		const [cue] = parseSrt(buildBlockContent(lines, block));
		if (!cue || cue.index !== expected.index) continue;
		if (hasTargetCue) {
			throw new SrtCueConflictError("同じ番号の字幕が複数あります。");
		}
		hasTargetCue = true;
		if (!hasSameCueIdentity(cue, expected)) {
			throw new SrtCueConflictError("字幕の時刻が申請時から変更されています。");
		}
		if (cue.text === expected.proposedText) {
			isAlreadyApplied = true;
			continue;
		}
		if (cue.text !== expected.text) {
			throw new SrtCueConflictError("字幕本文が申請時から変更されています。");
		}
		matchingBlock = block;
	}

	if (isAlreadyApplied && !matchingBlock) {
		return { content, changed: false };
	}
	if (!matchingBlock) {
		throw new SrtCueConflictError("対象の字幕が見つかりません。");
	}

	const range = findTextRange(lines, matchingBlock);
	if (!range) {
		throw new SrtCueConflictError("対象の字幕本文が見つかりません。");
	}
	const proposedText = expected.proposedText.replace(/\n/g, range.newline);
	const updated = `${content.slice(0, range.start)}${proposedText}${content.slice(range.end)}`;
	assertOnlyTargetTextChanged(content, updated, expected);
	return { content: updated, changed: true };
}
