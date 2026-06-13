"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const navLinks = [
	{ href: "/talks", label: "動画一覧" },
	{ href: "/about/early-buddhism", label: "初期仏教とは" },
	{ href: "/about/vipassana", label: "ヴィパッサナー瞑想とは" },
	{ href: "/about/sumanasara", label: "A.スマナサーラ長老について" },
	{ href: "/#info", label: "お知らせ" },
];

export default function Header() {
	const [isScrolled, setIsScrolled] = useState(false);

	useEffect(() => {
		const updateHeaderState = () => setIsScrolled(window.scrollY > 12);
		updateHeaderState();
		window.addEventListener("scroll", updateHeaderState, { passive: true });

		return () => window.removeEventListener("scroll", updateHeaderState);
	}, []);

	return (
		<header
			className={`fixed inset-x-0 top-0 z-50 h-16 border-b backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-300 lg:h-20 ${
				isScrolled
					? "border-white/30 bg-white/90 shadow-[0_1px_18px_rgba(0,0,0,0.06)]"
					: "border-transparent bg-transparent shadow-none"
			}`}
		>
			<div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-5 sm:px-8">
				<Link
					className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9d7e4c]/50"
					href="/"
				>
					<Image
						alt="初期仏教塾"
						className="h-auto w-[104px] lg:w-[122px]"
						height={168}
						priority
						quality={75}
						sizes="(max-width: 1024px) 104px, 122px"
						src="/khanti/common/logo.png"
						width={429}
					/>
				</Link>

				<nav
					aria-label="初期仏教塾の基本情報"
					className="hidden items-center gap-7 lg:flex"
				>
					{navLinks.map((link) => (
						<Link
							className="font-display text-[15px] font-semibold text-[#303030] transition-colors hover:text-[#9d7e4c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9d7e4c]/50"
							href={link.href}
							key={link.href}
						>
							{link.label}
						</Link>
					))}
					<a
						aria-label="Xで初期仏教塾を見る"
						className="font-display flex h-8 w-8 items-center justify-center rounded-sm bg-[#303030] text-sm font-semibold text-white transition-colors hover:bg-[#9d7e4c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9d7e4c]/50"
						href="https://x.com/EarlyBuddhism"
						rel="noopener noreferrer"
						target="_blank"
					>
						X
					</a>
				</nav>

				<details className="group lg:hidden">
					<summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-sm text-[#303030] transition-colors hover:text-[#9d7e4c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9d7e4c]/50 [&::-webkit-details-marker]:hidden">
						<span className="sr-only">メニューを開く</span>
						<svg
							aria-hidden="true"
							className="h-7 w-7 group-open:hidden"
							fill="none"
							stroke="currentColor"
							strokeWidth={1.6}
							viewBox="0 0 24 24"
						>
							<path
								d="M4 7h16M4 12h16M4 17h16"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
						<svg
							aria-hidden="true"
							className="hidden h-7 w-7 group-open:block"
							fill="none"
							stroke="currentColor"
							strokeWidth={1.6}
							viewBox="0 0 24 24"
						>
							<path
								d="M6 18L18 6M6 6l12 12"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</summary>
					<nav
						aria-label="初期仏教塾の基本情報"
						className="absolute inset-x-0 top-16 flex flex-col gap-5 bg-[#9d7e4c] px-8 py-10 shadow-2xl lg:hidden"
					>
						{navLinks.map((link) => (
							<Link
								className="font-display text-base font-semibold text-white transition-colors hover:text-[#fffbeb]"
								href={link.href}
								key={link.href}
							>
								{link.label}
							</Link>
						))}
						<a
							className="font-display text-base font-semibold text-white transition-colors hover:text-[#fffbeb]"
							href="https://x.com/EarlyBuddhism"
							rel="noopener noreferrer"
							target="_blank"
						>
							X
						</a>
					</nav>
				</details>
			</div>
		</header>
	);
}
