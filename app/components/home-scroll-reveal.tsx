"use client";

import { useEffect } from "react";

const SCROLL_REVEAL_SELECTOR = ".js-scroll-trigger";

export default function HomeScrollReveal() {
	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			return;
		}

		const elements = Array.from(
			document.querySelectorAll<HTMLElement>(SCROLL_REVEAL_SELECTOR),
		);

		if (elements.length === 0) {
			return;
		}

		if (!("IntersectionObserver" in window)) {
			for (const element of elements) {
				element.classList.add("is-animated");
			}
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) {
						continue;
					}
					entry.target.classList.add("is-animated");
					observer.unobserve(entry.target);
				}
			},
			{
				rootMargin: "-10% 0px",
			},
		);

		for (const element of elements) {
			observer.observe(element);
		}

		return () => observer.disconnect();
	}, []);

	return null;
}
