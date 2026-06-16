"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { FEEDBACK_FORM_URL } from "../utils/site-links";

const SHOW_AFTER_PX = 400;

export default function ScrollToTopButton() {
	const [isVisible, setIsVisible] = useState(false);
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
		updatePreference();
		mediaQuery.addEventListener("change", updatePreference);
		return () => mediaQuery.removeEventListener("change", updatePreference);
	}, []);

	useEffect(() => {
		let ticking = false;

		const onScroll = () => {
			if (ticking) return;
			ticking = true;

			requestAnimationFrame(() => {
				setIsVisible(window.scrollY > SHOW_AFTER_PX);
				ticking = false;
			});
		};

		window.addEventListener("scroll", onScroll, { passive: true });
		onScroll();

		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<div
			className={`fixed bottom-8 right-0 z-50 transition duration-300 ${isVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
		>
			<a
				className="absolute bottom-3 right-[70px] whitespace-nowrap border-0 bg-transparent p-0 text-[12px] font-medium text-[#6e522b] shadow-none underline-offset-4 transition-colors hover:text-[#9d7e4c] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9d7e4c] focus-visible:ring-offset-2"
				href={FEEDBACK_FORM_URL}
				rel="noopener noreferrer"
				target="_blank"
			>
				ご意見・不具合はこちら
			</a>
			<button
				aria-label="一番上へ"
				className="home-page-top-button flex flex-col items-center gap-2 border-0 bg-transparent px-2 py-3 text-[#303030] shadow-none transition hover:text-[#9d7e4c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9d7e4c] focus-visible:ring-offset-2"
				onClick={() => {
					window.dispatchEvent(new CustomEvent("app:scroll-to-top"));
					window.scrollTo({
						top: 0,
						behavior: prefersReducedMotion ? "auto" : "smooth",
					});
				}}
				type="button"
			>
				<Image
					alt=""
					aria-hidden="true"
					className="home-page-top-wheel h-[45px] w-[45px]"
					height={120}
					src="/khanti/common/pagetop.png"
					width={120}
				/>
				<span className="home-page-top-label text-[12px] font-medium tracking-[0.15em]">
					PAGETOP
				</span>
			</button>
		</div>
	);
}
