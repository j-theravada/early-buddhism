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

export function parseScrollPositions(raw: string | null): ScrollPositions {
	if (!raw) {
		return {};
	}

	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== "object") {
			return {};
		}
		return parsed as ScrollPositions;
	} catch {
		return {};
	}
}
