"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const slides = [
	{
		desktop: "/khanti/top/kv_pc_01.jpg",
		mobile: "/khanti/top/kv_smp_01.jpg",
		main: "お釈迦さまの\n根本の教えを\n現代の言葉で",
		sub: "心のしくみと苦を乗り越える智慧を\nスマナサーラ長老の法話で学ぶ",
	},
	{
		desktop: "/khanti/top/kv_pc_02.jpg",
		mobile: "/khanti/top/kv_smp_02.jpg",
		main: "お釈迦さまの\n根本の教えを\n現代の言葉で",
		sub: "心のしくみと苦を乗り越える智慧を\nスマナサーラ長老の法話で学ぶ",
	},
	{
		desktop: "/khanti/top/kv_pc_03.jpg",
		mobile: "/khanti/top/kv_smp_03.jpg",
		main: "お釈迦さまの\n根本の教えで\n心を育てる",
		sub: "心のしくみと苦を乗り越える智慧を\nスマナサーラ長老の法話で学ぶ",
	},
	{
		desktop: "/khanti/top/kv_pc_04.jpg",
		mobile: "/khanti/top/kv_smp_04.jpg",
		main: "お釈迦さまの\n根本の教えで\n心を育てる",
		sub: "心のしくみと苦を乗り越える智慧を\nスマナサーラ長老の法話で学ぶ",
	},
];

const SLIDE_INTERVAL_MS = 3000;

export default function HomeHero() {
	const [activeIndex, setActiveIndex] = useState(0);

	useEffect(() => {
		const timer = window.setInterval(() => {
			setActiveIndex((current) => (current + 1) % slides.length);
		}, SLIDE_INTERVAL_MS);

		return () => window.clearInterval(timer);
	}, []);

	const activeSlide = slides[activeIndex] ?? slides[0];

	return (
		<section className="relative isolate min-h-[100svh] overflow-hidden bg-[#303030] text-white">
			{slides.map((slide, index) => {
				const isActive = activeIndex === index;
				return (
					<div
						aria-hidden={!isActive}
						className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
							isActive ? "opacity-100" : "opacity-0"
						}`}
						key={slide.desktop}
					>
						<Image
							alt=""
							className="hidden object-cover md:block"
							fill
							priority={index === 0}
							quality={75}
							sizes="(min-width: 768px) 100vw, 1px"
							src={slide.desktop}
						/>
						<Image
							alt=""
							className="object-cover md:hidden"
							fill
							priority={index === 0}
							quality={75}
							sizes="(max-width: 767px) 100vw, 1px"
							src={slide.mobile}
						/>
					</div>
				);
			})}
			<div className="absolute inset-0 bg-black/10" />
			<div className="absolute inset-y-0 left-0 hidden w-1/2 bg-gradient-to-r from-black/30 to-transparent md:block" />

			<div className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1440px] items-end px-7 pb-28 pt-24 md:items-center md:px-[10vw] md:pb-16 lg:pt-28">
				<div className="home-hero-copy max-w-[620px]">
					<h1 className="font-serif-display whitespace-pre-line text-[36px] font-semibold leading-[1.38] sm:text-[42px] md:text-[48px] lg:text-[56px]">
						{activeSlide.main}
					</h1>
					<p className="font-serif-display mt-5 whitespace-pre-line text-[17px] font-medium leading-[1.9] sm:text-xl md:text-[22px]">
						{activeSlide.sub}
					</p>
				</div>
			</div>

			<div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3">
				{slides.map((slide, index) => (
					<button
						aria-label={`${index + 1}枚目のヒーロー画像を表示`}
						className={`h-2.5 w-2.5 rounded-full border border-white/80 transition-colors ${
							activeIndex === index ? "bg-white" : "bg-transparent"
						}`}
						key={slide.desktop}
						onClick={() => setActiveIndex(index)}
						type="button"
					/>
				))}
			</div>
		</section>
	);
}
