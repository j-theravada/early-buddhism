"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { shouldRestoreScrollOnRouteChange } from "../application/navigation/scroll-restoration";
import { isTalkGalleryRestorePending } from "../infrastructure/browser/talk-gallery-storage";
import {
	loadScrollPosition,
	saveScrollPosition,
} from "../infrastructure/browser/scroll-position-storage";

function attemptRestoreScroll(targetY: number) {
	let attempts = 0;
	const maxAttempts = 240;

	const tick = () => {
		attempts += 1;

		const maxScrollableY = Math.max(
			0,
			document.documentElement.scrollHeight - window.innerHeight,
		);
		const desiredY = Math.min(targetY, maxScrollableY);

		window.scrollTo({ top: desiredY, left: 0, behavior: "auto" });

		const delta = Math.abs(window.scrollY - desiredY);
		if (delta <= 2) return;
		if (attempts >= maxAttempts) return;

		requestAnimationFrame(tick);
	};

	requestAnimationFrame(tick);
}

export default function ScrollRestoration() {
	const pathname = usePathname();
	const key = pathname;

	const currentKeyRef = useRef<string>(key);
	const scrollYRef = useRef(0);
	const previousPathnameRef = useRef<string | null>(null);
	const restoreOnNextRouteRef = useRef(false);
	const mountedRef = useRef(false);

	useEffect(() => {
		currentKeyRef.current = key;
	}, [key]);

	useEffect(() => {
		try {
			if ("scrollRestoration" in window.history) {
				window.history.scrollRestoration = "manual";
			}
		} catch {
			// Ignore.
		}

		const onPopState = () => {
			restoreOnNextRouteRef.current = true;
		};

		const onScroll = () => {
			scrollYRef.current = window.scrollY;
		};

		const onPageHide = () => {
			saveScrollPosition(currentKeyRef.current, scrollYRef.current);
		};

		const onClickCapture = (event: MouseEvent) => {
			if (event.defaultPrevented) return;
			if (event.button !== 0) return;
			if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
				return;

			const target = event.target;
			if (!(target instanceof Element)) return;

			const anchor = target.closest("a");
			if (!anchor) return;
			if (anchor.target && anchor.target !== "_self") return;
			if (anchor.hasAttribute("download")) return;

			const href = anchor.getAttribute("href");
			if (!href) return;
			if (href.startsWith("#")) return;
			if (href.startsWith("mailto:") || href.startsWith("tel:")) return;

			let url: URL;
			try {
				url = new URL(anchor.href);
			} catch {
				return;
			}
			if (url.origin !== window.location.origin) return;

			saveScrollPosition(currentKeyRef.current, scrollYRef.current);
		};

		window.addEventListener("popstate", onPopState);
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("pagehide", onPageHide);
		document.addEventListener("click", onClickCapture, { capture: true });

		onScroll();

		return () => {
			window.removeEventListener("popstate", onPopState);
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("pagehide", onPageHide);
			document.removeEventListener("click", onClickCapture, { capture: true });
		};
	}, []);

	useEffect(() => {
		if (!mountedRef.current) {
			mountedRef.current = true;
			previousPathnameRef.current = pathname;
			return;
		}

		const from = previousPathnameRef.current;
		const to = pathname;

		const shouldRestore = shouldRestoreScrollOnRouteChange({
			pathname: to,
			previousPathname: from,
			restoreOnNextRoute: restoreOnNextRouteRef.current,
			isTalkGalleryRestorePending: isTalkGalleryRestorePending(),
		});

		restoreOnNextRouteRef.current = false;
		previousPathnameRef.current = pathname;

		if (!shouldRestore) return;

		const saved = loadScrollPosition(key);
		if (saved == null) return;

		setTimeout(() => {
			attemptRestoreScroll(saved);
		}, 0);
	}, [key, pathname]);

	return null;
}
