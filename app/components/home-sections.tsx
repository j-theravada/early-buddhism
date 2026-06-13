import { ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { THERAVADA_ASSOCIATION_URL } from "../utils/site-links";

type SectionTitleProps = {
	children: React.ReactNode;
};

export function HomeSectionTitle({ children }: SectionTitleProps) {
	return (
		<div className="mb-12 text-center">
			<h2 className="home-section-title font-display inline-block text-[28px] font-semibold leading-tight text-[#303030]">
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

const popularImages = [
	"/khanti/top/new_contents_01.png",
	"/khanti/top/new_contents_02.png",
	"/khanti/top/new_contents_03.png",
];

export function RecommendationsSection() {
	return (
		<section className="home-recommend-bg scroll-mt-20 px-5 py-16 sm:px-8 md:py-20 lg:py-28">
			<div className="mx-auto max-w-[1200px]">
				<div className="flex flex-col gap-10 lg:flex-row-reverse lg:items-start">
					{recommendations.map((recommendation) => (
						<article
							className={`rounded-lg bg-white/80 p-6 shadow-[0_20px_60px_rgba(48,48,48,0.08)] backdrop-blur-sm sm:p-8 lg:flex-1 ${
								recommendation.type === "b" ? "lg:mt-48" : ""
							}`}
							key={recommendation.name}
						>
							<div
								className={`mb-7 flex flex-col gap-5 md:flex-row md:items-start ${
									recommendation.type === "a" ? "md:flex-row-reverse" : ""
								}`}
							>
								<h2 className="home-vertical-heading font-serif-display text-[32px] font-semibold leading-[1.45] text-[#303030] md:shrink-0">
									{recommendation.catchLines.map((line) => (
										<span className="block" key={line}>
											{line}
										</span>
									))}
								</h2>
								<p className="whitespace-pre-line text-[15px] leading-[1.9] text-[#303030]">
									{recommendation.text}
								</p>
							</div>
							<div className="flex items-center gap-4">
								<div className="relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-full">
									<Image
										alt={recommendation.name}
										className="object-cover"
										fill
										sizes="120px"
										src={recommendation.image}
									/>
									<div className="pointer-events-none absolute inset-1 rounded-full border border-[#9d7e4c]" />
								</div>
								<div className="space-y-1">
									<p className="text-xs leading-relaxed text-[#888]">
										{recommendation.title}
									</p>
									<p className="font-serif-display text-[22px] font-semibold text-[#303030]">
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
					<div className="relative mx-auto flex max-w-[430px] items-end gap-5 lg:mx-0 lg:flex-[0_0_42%]">
						<div className="font-serif-display home-profile-vertical text-xl text-[#9d7e4c] lg:text-[28px]">
							Rev.Alubomulle Sumanasara Thero
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
					<div className="flex-1">
						<h2 className="font-serif-display mb-5 text-[22px] font-semibold text-[#303030] md:text-[28px]">
							アルボムッレ・スマナサーラ長老
						</h2>
						<p className="text-[15px] leading-[1.9] text-[#303030] md:text-base">
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

export function NewsSection() {
	return (
		<section className="scroll-mt-24 px-5 py-16 sm:px-8 lg:py-24" id="info">
			<div className="mx-auto max-w-[900px]">
				<HomeSectionTitle>お知らせ</HomeSectionTitle>
				<dl className="grid text-[15px] leading-[1.9] text-[#303030] md:grid-cols-[150px_1fr]">
					<dt className="border-[#d6c6ad] py-4 font-light md:border-b">
						2025.12.31
					</dt>
					<dd className="border-b border-[#d6c6ad] py-4">
						日本テーラワーダ仏教協会は、新しく当ウェブサイト「初期仏教塾」をオープンいたしました。
						第一弾として、スマナサーラ長老の講演会動画300本を無料公開！
					</dd>
				</dl>
			</div>
		</section>
	);
}

export function PopularVideosSection() {
	return (
		<section className="home-popular-bg px-5 py-16 sm:px-8 lg:py-24">
			<div className="mx-auto max-w-[1200px]">
				<HomeSectionTitle>人気の動画</HomeSectionTitle>
				<div className="grid gap-5 sm:grid-cols-3">
					{popularImages.map((src, index) => (
						<a
							className="block transition hover:opacity-80"
							href="#talks"
							key={src}
						>
							<Image
								alt={`人気の動画 ${index + 1}`}
								className="h-auto w-full rounded-[3px]"
								height={938}
								quality={75}
								sizes="(max-width: 640px) 100vw, 33vw"
								src={src}
								width={794}
							/>
						</a>
					))}
				</div>
				<div className="mt-12 text-center">
					<a className="home-outline-button" href="#talks">
						動画一覧
					</a>
				</div>
			</div>
		</section>
	);
}

export function GalleryIntroSection({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<section
			className="home-gallery-bg scroll-mt-20 px-5 py-16 sm:px-8 lg:py-24"
			id="talks"
		>
			<div className="mx-auto max-w-7xl">
				<HomeSectionTitle>動画を探す</HomeSectionTitle>
				{children}
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
