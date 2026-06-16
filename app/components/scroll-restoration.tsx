"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { shouldResetScrollOnRouteChange } from "../application/navigation/scroll-restoration";

export default function ScrollRestoration() {
	const pathname = usePathname();

	const previousPathnameRef = useRef<string | null>(null);
	const mountedRef = useRef(false);

	useEffect(() => {
		try {
			if ("scrollRestoration" in window.history) {
				window.history.scrollRestoration = "manual";
			}
		} catch {
			// Ignore.
		}
	}, []);

	useEffect(() => {
		if (!mountedRef.current) {
			mountedRef.current = true;
			previousPathnameRef.current = pathname;
			return;
		}

		const from = previousPathnameRef.current;
		const to = pathname;

		const shouldReset = shouldResetScrollOnRouteChange({
			pathname: to,
			previousPathname: from,
		});

		previousPathnameRef.current = pathname;

		if (!shouldReset) return;
		if (window.location.hash) return;

		setTimeout(() => {
			window.scrollTo({ top: 0, left: 0, behavior: "auto" });
		}, 0);
	}, [pathname]);

	return null;
}
