type MediaQueryChangeListener = (event?: MediaQueryListEvent) => void;

export function addMediaQueryChangeListener(
	mediaQuery: MediaQueryList,
	listener: MediaQueryChangeListener,
): () => void {
	// Browser compatibility detection must inspect whether this runtime implements the modern API.
	// oxlint-disable-next-line anti-slop/no-runtime-typeof
	if (typeof mediaQuery.addEventListener === "function") {
		mediaQuery.addEventListener("change", listener);
		return () => mediaQuery.removeEventListener("change", listener);
	}

	// Older Safari exposes only the deprecated listener API despite the shared DOM type.
	// oxlint-disable-next-line anti-slop/no-runtime-typeof
	if (typeof mediaQuery.addListener === "function") {
		mediaQuery.addListener(listener);
		return () => mediaQuery.removeListener?.(listener);
	}

	return () => {};
}
