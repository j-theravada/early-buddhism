import { ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { NewsItem } from "../domain/news/types";
import type { TalkForDisplay } from "../domain/talk/types";
import { THERAVADA_ASSOCIATION_URL } from "../utils/site-links";
import TalkGalleryCard from "./talk-gallery/talk-gallery-card";

type SectionTitleProps = {
	animate?: boolean;
	children: ReactNode;
};

export function HomeSectionTitle({
	animate = true,
	children,
}: SectionTitleProps) {
	return (
		<div
			className={`mb-12 text-center ${
				animate ? "home-section-title-reveal js-scroll-trigger downup" : ""
			}`}
		>
			<h2 className="home-section-title font-display inline-block text-[30px] font-semibold leading-tight text-[#303030] md:text-[34px]">
				{children}
			</h2>
		</div>
	);
}

const recommendations = [
	{
		catchLines: ["心は幻想か？", "科学者が仏教で", "見つけた答え"],
		text: "「初期仏教塾」を見て、スマナサーラ長老と対談した日のことをたいへん懐かしく思いだしました。私は「心は幻想である」とする受動意識仮説を提唱した頃から原始仏教に興味を持ち、様々な本を読みました。スマナサーラ長老との対談は、その答え合わせのようで、学びの多いものでした。現在は仏教系の武蔵野大学で世界初のウェルビーイング学部長を拝命していますが、今の活動にもテーラワーダの学びは大きく影響しており、深く感謝しています。",
		image: "/khanti/top/recommendation_maeno_01.jpg",
		name: "前野 隆司",
		title: "武蔵野大学ウェルビーイング学部長・教授。慶應義塾大学名誉教授",
		type: "a",
	},
	{
		catchLines: ["第二の仏教伝来"],
		text: "仏教は1500年前に日本へ伝わりましたが、釈尊の直説とヴィパッサナー実践の体系は十分に共有されてきませんでした。\n\nスマナサーラ長老は、パーリ経典にもとづく流暢な日本語の説法と瞑想指導を通じて「何をどう実践すれば苦しみを減らせるのか」という具体的な道筋を示されました。これが「第二の仏教伝来」と呼ばれるゆえんです。",
		image: "/khanti/top/recommendation_fujimioto_01.jpg",
		name: "藤本 晃",
		title: "山口県下松市・浄土真宗（単立）誓教寺住職。仏教学者",
		type: "b",
	},
];

const talkSearchTagGroups = [
	{
		title: "心の悩み・セルフケア",
		tags: ["怒り", "不安", "ストレス", "孤独", "後悔"],
	},
	{
		title: "人間関係・社会生活",
		tags: ["競争", "付き合い方", "親子", "仕事", "夫婦"],
	},
	{
		title: "生老病死・人生の真理",
		tags: ["病気", "死", "無常"],
	},
	{
		title: "仏教の核心・実践",
		tags: ["瞑想", "悟り", "八正道", "サティ"],
	},
] as const;

export function RecommendationsSection() {
	return (
		<section className="home-recommend-bg scroll-mt-20 px-5 py-16 sm:px-8 md:py-20 lg:py-28">
			<div className="mx-auto max-w-[1200px]">
				<div className="flex flex-col gap-10 lg:flex-row-reverse lg:items-start">
					{recommendations.map((recommendation) => (
						<article
							className={`js-scroll-trigger downup rounded-lg bg-white/80 p-6 shadow-[0_20px_60px_rgba(48,48,48,0.08)] backdrop-blur-sm sm:p-8 lg:flex-1 ${
								recommendation.type === "b" ? "lg:mt-48" : ""
							}`}
							key={recommendation.name}
						>
							<div
								className={`mb-7 flex flex-col gap-5 md:flex-row md:items-start ${
									recommendation.type === "a" ? "md:flex-row-reverse" : ""
								}`}
							>
								<h2 className="home-vertical-heading font-serif-display text-[34px] font-semibold leading-[1.45] text-[#303030] md:shrink-0 lg:text-[38px]">
									{recommendation.catchLines.map((line) => (
										<span className="block" key={line}>
											{line}
										</span>
									))}
								</h2>
								<p className="whitespace-pre-line text-[16px] leading-[1.95] text-[#303030] md:text-[17px]">
									{recommendation.text}
								</p>
							</div>
							<div className="flex items-center gap-4">
								<div className="relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-full ring-1 ring-[#9d7e4c] ring-offset-2 ring-offset-white/70">
									<Image
										alt={recommendation.name}
										className="rounded-full object-cover"
										fill
										sizes="120px"
										src={recommendation.image}
									/>
								</div>
								<div className="space-y-1">
									<p className="text-[13px] leading-relaxed text-[#888]">
										{recommendation.title}
									</p>
									<p className="font-serif-display text-[23px] font-semibold text-[#303030]">
										{recommendation.name}
									</p>
								</div>
							</div>
						</article>
					))}
				</div>
				<div className="mt-12 text-center">
					<Link className="home-outline-button" href="/about/sumanasara">
						MORE
					</Link>
				</div>
			</div>
		</section>
	);
}

export function TeacherProfileSection() {
	return (
		<section className="home-profile-bg px-5 py-16 sm:px-8 md:py-20 lg:py-28">
			<div className="mx-auto max-w-[1200px]">
				<HomeSectionTitle>講師紹介</HomeSectionTitle>
				<div className="flex flex-col gap-10 lg:flex-row-reverse lg:items-end lg:gap-16">
					<div className="js-scroll-trigger downup relative mx-auto flex max-w-[430px] items-end gap-5 lg:mx-0 lg:flex-[0_0_42%]">
						<div className="font-serif-display home-profile-vertical text-xl text-[#9d7e4c] lg:text-[28px]">
							Ven. Alubomulle Sumanasara
						</div>
						<Image
							alt="アルボムッレ・スマナサーラ長老"
							className="h-auto w-[calc(100%-42px)] max-w-[380px]"
							height={1294}
							quality={75}
							sizes="(max-width: 1024px) 80vw, 380px"
							src="/khanti/top/thero_ph.jpg"
							width={990}
						/>
					</div>
					<div className="js-scroll-trigger downup flex-1">
						<h2 className="font-serif-display mb-5 text-[24px] font-semibold text-[#303030] md:text-[32px]">
							アルボムッレ・スマナサーラ長老
						</h2>
						<p className="text-[16px] leading-[1.95] text-[#303030] md:text-[18px]">
							スリランカ上座仏教（テーラワーダ仏教）長老。1945年4月、スリランカ生まれ。13歳で出家得度。国立ケラニヤ大学で仏教哲学の教鞭をとる。1980年に来日。駒澤大学大学院博士課程を経て、現在は（宗）日本テーラワーダ仏教協会で初期仏教の伝道と冥想指導に従事し、ブッダの根本の教えを説き続けている。
						</p>
						<div className="mt-10 text-center">
							<Link className="home-outline-button" href="/about/sumanasara">
								MORE
							</Link>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

export function NewsSection({ items }: { items: NewsItem[] }) {
	return (
		<section className="scroll-mt-24 px-5 py-16 sm:px-8 lg:py-24" id="info">
			<div className="mx-auto max-w-[900px]">
				<HomeSectionTitle animate={false}>お知らせ</HomeSectionTitle>
				{items.length > 0 ? (
					<dl className="grid text-[16px] leading-[1.95] text-[#303030] md:grid-cols-[150px_1fr]">
						{items.map((item) => (
							<Fragment key={item.slug}>
								<dt className="border-[#d6c6ad] py-4 font-light md:border-b">
									{formatNewsDate(item.date)}
								</dt>
								<dd className="border-b border-[#d6c6ad] py-4">
									<p className="font-semibold">{item.title}</p>
									<p className="mt-1">{item.excerpt}</p>
								</dd>
							</Fragment>
						))}
					</dl>
				) : (
					<p className="text-center text-[16px] leading-[1.95] text-[#303030]">
						現在、お知らせはありません。
					</p>
				)}
			</div>
		</section>
	);
}

function formatNewsDate(date: string): string {
	return date.replaceAll("-", ".");
}

export function PopularVideosSection({ videos }: { videos: TalkForDisplay[] }) {
	return (
		<section
			className="home-popular-bg px-5 py-16 sm:px-8 lg:py-24"
			id="popular"
		>
			<div className="mx-auto max-w-[1200px]">
				<HomeSectionTitle animate={false}>人気の動画</HomeSectionTitle>
				<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
					{videos.map((video) => (
						<TalkGalleryCard key={video.id} searchTokens={[]} talk={video} />
					))}
				</div>
				<div className="mt-12 text-center">
					<Link className="home-outline-button" href="/talks">
						動画一覧
					</Link>
				</div>
			</div>
		</section>
	);
}

export function TalkSearchTagsSection() {
	return (
		<section
			className="home-gallery-bg px-5 py-16 sm:px-8 lg:py-24"
			id="category-search"
		>
			<div className="mx-auto max-w-[1000px]">
				<HomeSectionTitle animate={false}>動画を探す</HomeSectionTitle>
				<form
					action="/talks"
					className="home-category-search-form mx-auto mb-10 w-[90%] md:w-[70%] lg:mb-12 lg:w-[60%]"
					method="get"
				>
					<label className="sr-only" htmlFor="home-category-search">
						キーワードで検索
					</label>
					<input
						aria-label="キーワードで検索"
						autoComplete="off"
						className="search-cancel-none w-full rounded-[30px] border border-[#9d7e4c] bg-white px-5 py-[15px] text-[16px] leading-8 text-[#303030] outline-none placeholder:text-[#888] focus:border-[#d6c6ad] focus:ring-2 focus:ring-[#9d7e4c]/15"
						id="home-category-search"
						name="query"
						placeholder="キーワードで検索"
						type="search"
					/>
					<button className="sr-only" type="submit">
						検索する
					</button>
				</form>
				<div className="space-y-10 lg:space-y-12">
					{talkSearchTagGroups.map((group) => (
						<div key={group.title}>
							<h3 className="mb-5 inline-block border-l-4 border-[#9d7e4c] bg-[#fdfdfd] py-1 pl-4 pr-5 text-[18px] font-semibold leading-tight text-[#303030] lg:mb-6 lg:text-[22px]">
								{group.title}
							</h3>
							<div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4 lg:grid-cols-5">
								{group.tags.map((tag) => (
									<Link
										aria-label={`${tag}の動画を探す`}
										className="flex h-[62px] items-center justify-center rounded-[2px] border border-[#d6c6ad] bg-white/90 px-3 text-center text-[16px] font-semibold text-[#303030] transition hover:-translate-y-0.5 hover:border-[#9d7e4c] hover:bg-[#9d7e4c] hover:text-white hover:shadow-[0_4px_10px_rgba(48,48,48,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9d7e4c]/25 lg:h-20 lg:text-[19px]"
										href={`/talks?query=${encodeURIComponent(tag)}`}
										key={tag}
									>
										{tag}
									</Link>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

export function AssociationLink() {
	return (
		<a
			className="inline-flex items-center gap-1 border-b border-dotted border-[#dc6209] pb-0.5 text-[13px] text-[#dc6209] transition-colors hover:border-[#9d7e4c] hover:text-[#9d7e4c]"
			href={THERAVADA_ASSOCIATION_URL}
			rel="noopener noreferrer"
			target="_blank"
		>
			<ExternalLink className="h-3 w-3" />
			日本テーラワーダ仏教協会
		</a>
	);
}
