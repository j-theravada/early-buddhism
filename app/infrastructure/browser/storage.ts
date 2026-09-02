export type ScrollPositions = Record<string, number>;

export function readSessionStorage(key: string): string | null {
	try {
		return sessionStorage.getItem(key);
	} catch {
		return null;
	}
}

export function writeSessionStorage(key: string, value: string) {
	try {
		sessionStorage.setItem(key, value);
	} catch {
		// Ignore storage failures.
	}
}

export function removeSessionStorage(key: string) {
	try {
		sessionStorage.removeItem(key);
	} catch {
		// Ignore storage failures.
	}
}

// Stored JSON values have no static type until every entry is checked.
// oxlint-disable-next-line anti-slop/no-unknown-parameters
function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

// Stored JSON is the untyped boundary this predicate converts to ScrollPositions.
// oxlint-disable-next-line anti-slop/no-unknown-parameters
function isScrollPositions(value: unknown): value is ScrollPositions {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		Object.values(value).every(isFiniteNumber)
	);
}

export function parseScrollPositions(raw: string | null): ScrollPositions {
	if (!raw) {
		return {};
	}

	try {
		const parsed: unknown = JSON.parse(raw);
		return isScrollPositions(parsed) ? parsed : {};
	} catch {
		return {};
	}
}
