type PrivateMetadata = {
	role?: unknown;
};

export function hasSubtitleAdminRole(
	privateMetadata: PrivateMetadata | null | undefined,
): boolean {
	return privateMetadata?.role === "subtitle_admin";
}
