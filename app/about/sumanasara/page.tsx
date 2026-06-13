import type { Metadata } from "next";
import Image from "next/image";
import Footer from "../../components/footer";
import Header from "../../components/header";

export const metadata: Metadata = {
	title: "スマナサーラ長老のプロフィール",
	description:
		"スリランカ上座仏教長老・アルボムッレ・スマナサーラ長老の歩みと活動を紹介します。",
};

const books = [
	"『ブッダの実践心理学　アビダンマ講義シリーズ』（サンガ）",
	"『怒らないこと』（大和書房）",
	"『原訳「法句経」一日一悟』（佼成出版）",
	"『ブッダ—大人になる道』（筑摩書房）",
	"『仏教は心の科学』（宝島社）",
	"『妬まない生き方』（河出書房新社）",
	"『Freedom from Anger』（WISDOM PUBLICATIONS）",
];

const recommendations = [
	{
		catchLines: ["心は幻想か？", "幸福学の権威が", "初期仏教で見つけた答え"],
		href: "https://takashimaeno.com/",
		image: "/khanti/about/recommendation_maeno.jpg",
		linkLabel: "takashimaeno.com",
		name: "前野 隆司",
		profile:
			"武蔵野大学ウェルビーイング学部長・教授、慶應義塾大学名誉教授。人間の幸福を科学的に研究する「ウェルビーイング研究」（幸福学）の第一人者。著書に、『幸せのメカニズム 実践・幸福学入門』（講談社現代新書）、スマナサーラ長老との対談書『仏教と科学が発見した「幸せの法則」』（サンガ）など。",
		romanName: "Takashi Maeno",
		text: "「初期仏教塾」を見て、スマナサーラ長老と対談した日のことをたいへん懐かしく思いだしました。私は「心は幻想である」とする受動意識仮説を提唱した頃から原始仏教に興味を持ち、様々な本を読みました。スマナサーラ長老との対談は、その答え合わせのようで、学びの多いものでした。現在は仏教系の武蔵野大学で世界初のウェルビーイング学部長を拝命していますが、今の活動にもテーラワーダの学びは大きく影響しており、深く感謝しています。",
		type: "a",
	},
	{
		catchLines: ["第二の仏教伝来"],
		href: "https://seikyoji.jimdofree.com/",
		image: "/khanti/about/recommendation_fujimioto.jpg",
		linkLabel: "誓教寺 HP",
		name: "藤本 晃",
		profile:
			"1962年生まれ。山口県下松市・浄土真宗（単立）誓教寺住職。広島大学客員教授。文学博士。",
		romanName: "Akira Fujimoto",
		text: "中央アジアから中国を経て、大乗の経・論と説一切有部の論書が日本に伝来しました。これは北伝仏教とも呼ばれます。主に大乗経典を基に諸宗派が分立し、日本全国に根付きました。\n明治の開国とともに、日本の仏教徒たちは、インドの比丘サンガの伝統を保持するテーラワーダ仏教に初めて直接出会いました。テーラワーダ仏教はスリランカ・東南アジアから海路で日本に伝わったので、南伝仏教とも呼ばれます。初期仏教のパーリ語の仏典が日本に将来され、和訳・研究されました。一方、日本の宗派仏教とあまりに異なるテーラワーダ比丘サンガの伝統は、日本に根付きませんでした。\n第二次世界大戦から時を経て、日本人がふたたびアジア諸国に気軽に旅行するようになりました。その1980年代、一人のテーラワーダ比丘・スマナサーラ長老がスリランカから来日しました。スリランカの大学教員への日本からの招へい留学の形で、駒澤大学に在籍しました。\nスマナサーラ長老は90年代から本格的に日本での伝道を始めました。十二因縁や悟りの階梯などの多岐にわたる釈尊の教えの、これまでなかなか理解できかった本当の意味を、流ちょうな日本語で巧みに解説しました。そして何よりも、日本には曖昧に伝わっていた仏教独自のヴィパッサナー（観）瞑想の意味と修行法を、平易な日本語で解説し、指導しています。長老の説法と瞑想指導が「第二の仏教伝来」と言われるゆえんです。",
		type: "b",
	},
];

export default function SumanasaraProfilePage() {
	return (
		<div className="min-h-screen bg-[#fcfbf9] text-[#303030]">
			<Header />
			<main>
				<section className="about-profile-bg px-5 pb-16 pt-24 sm:px-8 md:pb-20 md:pt-28 lg:pb-28 lg:pt-36">
					<div className="mx-auto max-w-[1200px]">
						<div className="mb-12 text-center md:mb-16">
							<h1 className="font-display home-section-title inline-block text-2xl font-semibold text-[#303030] md:text-[32px]">
								講師紹介
							</h1>
						</div>

						<div className="flex flex-col gap-10 lg:flex-row-reverse lg:items-end lg:justify-between lg:gap-16">
							<div className="mx-auto flex w-full max-w-[430px] items-end justify-center gap-4 lg:mx-0 lg:flex-[0_0_40%] lg:justify-end">
								<div className="font-serif-display about-profile-vertical text-xl leading-none text-[#9d7e4c] lg:text-[28px]">
									Rev.Alubomulle Sumanasara Thero
								</div>
								<Image
									alt="アルボムッレ・スマナサーラ長老"
									className="h-auto w-[min(78vw,360px)] object-contain"
									height={1294}
									priority
									sizes="(max-width: 1024px) 78vw, 360px"
									src="/khanti/top/thero_ph.jpg"
									width={990}
								/>
							</div>

							<div className="max-w-2xl flex-1">
								<h2 className="font-serif-display mb-5 text-2xl font-semibold leading-relaxed text-[#303030] md:text-[30px]">
									アルボムッレ・スマナサーラ長老
								</h2>
								<div className="space-y-6 text-[15px] leading-[2] text-[#303030] md:text-base">
									<p>
										スリランカ上座仏教（テーラワーダ仏教）長老。1945年4月、スリランカ生まれ。
										<br />
										13歳で出家得度。国立ケラニヤ大学で仏教哲学の教鞭をとる。1980年に来日。駒澤大学大学院博士課程を経て、現在は（宗）日本テーラワーダ仏教協会で初期仏教の伝道と冥想指導に従事し、ブッダの根本の教えを説き続けている。
									</p>
									<p>
										朝日カルチャーセンター（東京・横浜など）講師を務めるほか、NHK教育テレビ「こころの時代」などにも出演。
									</p>
								</div>
							</div>
						</div>

						<div className="mt-12 border-t border-[#d6c6ad] pt-8 md:mt-16">
							<h3 className="font-display mb-5 text-lg font-semibold text-[#9d7e4c] md:text-[22px]">
								主な著書
							</h3>
							<ul className="grid gap-x-12 text-[15px] leading-relaxed text-[#303030] md:grid-cols-2">
								{books.map((book) => (
									<li className="border-b border-[#d6c6ad]/55 py-2" key={book}>
										{book}
									</li>
								))}
							</ul>
						</div>
					</div>
				</section>

				<section className="px-5 py-16 sm:px-8 md:py-20 lg:py-28">
					<div className="mx-auto max-w-[900px] space-y-12 lg:space-y-20">
						{recommendations.map((recommendation) => (
							<article
								className="rounded-lg bg-white/80 p-6 shadow-[0_20px_60px_rgba(48,48,48,0.05)] md:p-8"
								key={recommendation.name}
							>
								<div
									className={`mb-9 flex flex-col gap-7 md:items-start ${
										recommendation.type === "a"
											? "md:flex-row-reverse"
											: "md:flex-row"
									}`}
								>
									<h2 className="font-serif-display about-vertical-heading shrink-0 text-2xl font-semibold leading-[1.55] text-[#303030] md:text-[32px]">
										{recommendation.catchLines.map((line) => (
											<span className="block" key={line}>
												{line}
											</span>
										))}
									</h2>
									<div className="flex-1 space-y-5 pt-1 text-[15px] leading-[2] text-[#303030] md:leading-[2.2]">
										{recommendation.text.split("\n").map((paragraph) => (
											<p key={paragraph}>{paragraph}</p>
										))}
									</div>
								</div>

								<div className="flex flex-col items-center gap-6 md:flex-row md:gap-8">
									<div className="w-full max-w-[300px] shrink-0">
										<Image
											alt={recommendation.name}
											className="h-auto w-full rounded-lg object-cover"
											height={800}
											sizes="(max-width: 767px) 80vw, 300px"
											src={recommendation.image}
											width={1200}
										/>
									</div>
									<div className="text-center md:text-left">
										<p className="font-serif-display mb-3 text-2xl font-semibold leading-relaxed text-[#303030]">
											{recommendation.name}
											<span className="mt-1 block text-lg font-normal text-[#9d7e4c] md:ml-5 md:mt-0 md:inline">
												{recommendation.romanName}
											</span>
										</p>
										<p className="text-sm leading-relaxed text-[#6d6a64] md:text-[15px]">
											{recommendation.profile}
										</p>
										<div className="mt-5">
											<a
												className="font-display inline-flex items-center justify-center border border-[#9d7e4c] bg-white px-5 py-3 text-sm font-semibold text-[#303030] transition hover:bg-[#9d7e4c] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9d7e4c]/50"
												href={recommendation.href}
												rel="noopener noreferrer"
												target="_blank"
											>
												{recommendation.linkLabel}
											</a>
										</div>
									</div>
								</div>
							</article>
						))}
					</div>
				</section>
			</main>
			<Footer />
		</div>
	);
}
