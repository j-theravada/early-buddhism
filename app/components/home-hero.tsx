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
const FIRST_SLIDE_INDEX = 0;

type HeroSlideState = {
	activeIndex: number;
	renderedSlideIndexes: ReadonlySet<number>;
};

function getNextSlideIndex(index: number): number {
	return (index + 1) % slides.length;
}

function addRenderedSlideIndexes(
	current: ReadonlySet<number>,
	indexes: number[],
): ReadonlySet<number> {
	const next = new Set(current);
	let hasChanged = false;
	for (const index of indexes) {
		if (next.has(index)) {
			continue;
		}

		next.add(index);
		hasChanged = true;
	}
	return hasChanged ? next : current;
}

export default function HomeHero() {
	const [slideState, setSlideState] = useState<HeroSlideState>(() => ({
		activeIndex: FIRST_SLIDE_INDEX,
		renderedSlideIndexes: new Set([FIRST_SLIDE_INDEX]),
	}));

	useEffect(() => {
		setSlideState((current) => ({
			...current,
			renderedSlideIndexes: addRenderedSlideIndexes(
				current.renderedSlideIndexes,
				[getNextSlideIndex(current.activeIndex)],
			),
		}));

		const timer = window.setInterval(() => {
			setSlideState((current) => {
				const next = getNextSlideIndex(current.activeIndex);
				return {
					activeIndex: next,
					renderedSlideIndexes: addRenderedSlideIndexes(
						current.renderedSlideIndexes,
						[next, getNextSlideIndex(next)],
					),
				};
			});
		}, SLIDE_INTERVAL_MS);

		return () => window.clearInterval(timer);
	}, []);

	const { activeIndex, renderedSlideIndexes } = slideState;
	const activeSlide = slides[activeIndex] ?? slides[0];
	const activateSlide = (index: number) => {
		setSlideState((current) => ({
			activeIndex: index,
			renderedSlideIndexes: addRenderedSlideIndexes(
				current.renderedSlideIndexes,
				[index, getNextSlideIndex(index)],
			),
		}));
	};

	return (
		<section className="relative isolate min-h-[100svh] overflow-hidden bg-[#303030] text-white">
			{slides.map((slide, index) => {
				if (!renderedSlideIndexes.has(index)) {
					return null;
				}

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
						onClick={() => activateSlide(index)}
						type="button"
					/>
				))}
			</div>
		</section>
	);
}
