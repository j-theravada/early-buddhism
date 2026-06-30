type Params = {
	pathname: string;
	previousPathname: string | null;
};

function isTalkDetailPath(pathname: string): boolean {
	return /^\/talks\/[^/]+$/.test(pathname);
}

export function shouldResetScrollOnRouteChange({
	pathname,
	previousPathname,
}: Params): boolean {
	if (
		pathname === "/talks" &&
		previousPathname &&
		isTalkDetailPath(previousPathname)
	) {
		return false;
	}

	return previousPathname !== null && pathname !== previousPathname;
}
