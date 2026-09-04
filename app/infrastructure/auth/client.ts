"use client";

import { useAuth } from "@clerk/nextjs";

export function useIsSignedIn(): boolean {
	return useAuth().isSignedIn === true;
}

export async function getSubtitleAdminAccess(
	signal?: AbortSignal,
): Promise<boolean> {
	const response = await fetch("/api/subtitle-admin/access", {
		cache: "no-store",
		signal,
	});
	if (!response.ok) {
		return false;
	}

	// SAFETY: This same-origin endpoint owns the response schema; a missing or
	// malformed property fails the strict equality check below.
	const body = (await response.json()) as {
		isSubtitleAdmin?: unknown;
	} | null;
	return body?.isSubtitleAdmin === true;
}
