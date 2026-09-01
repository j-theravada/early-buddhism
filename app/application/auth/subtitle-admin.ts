type PublicMetadata = {
	role?: unknown;
};

export function hasSubtitleAdminRole(
	publicMetadata: PublicMetadata | null | undefined,
): boolean {
	return publicMetadata?.role === "subtitle_admin";
}
