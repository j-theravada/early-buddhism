type Params = {
	pathname: string;
	previousPathname: string | null;
	restoreOnNextRoute: boolean;
	isTalkGalleryRestorePending: boolean;
};

export function shouldRestoreScrollOnRouteChange({
	pathname,
	previousPathname,
	restoreOnNextRoute,
	isTalkGalleryRestorePending,
}: Params): boolean {
	const cameFromTalkDetail = Boolean(previousPathname?.startsWith("/talks/"));
	const goingToTalkGallery = pathname === "/talks";
	const shouldRestore =
		restoreOnNextRoute || (cameFromTalkDetail && goingToTalkGallery);

	if (!shouldRestore) {
		return false;
	}

	if (pathname === "/talks" && isTalkGalleryRestorePending) {
		return false;
	}

	return true;
}
