import type { Metadata } from "next";
import Image from "next/image";
import Footer from "../../components/footer";
import Header from "../../components/header";

export const metadata: Metadata = {
	title: "スマナサーラ長老のプロフィール",
	description:
		"スリランカ上座仏教長老・アルボムッレ・スマナサーラ長老の歩みと活動を紹介します。",
};

const profileParagraphs = [
	`アルボムッレ・スマナサーラ長老は、日本テーラワーダ仏教協会の貫首（代表）を務める長老。スリランカのテーラワーダ仏教（上座仏教）シャム派に属する比丘であり、シャム派における日本大サンガ主任長老（Japan Maha Sangha Nayaka Thero）。スリランカのキリタラマヤ精舎（Mottunna Sri Kireetaramaya Purana Tampita Viharaya、西部州ガンパハ県ミリガマ行政区モッツンナ地区）住職。`,
	`紀元前6世紀ごろ、インド北部のガンジス川流域で、ブッダ（釈迦牟尼仏陀、釈尊、お釈迦さま）によって僧団（サンガ）が創設されました。それは、人類史上もっとも古い出家共同体の一つです。`,
	`紀元前3世紀、仏教はスリランカへと伝えられました。テーラワーダ仏教は、釈尊時代の僧団の伝統と、パーリ経典に記録された教えを今に受け継ぐ仏教です。大乗仏教や密教の興起を経て、インド亜大陸で仏教が衰亡した後も、テーラワーダ仏教はスリランカを拠点として、現在のミャンマー・タイ・ラオス・カンボジア・ベトナム南部などへ広がっていきました。そのためスリランカは「仏教の源流を伝える国」とも言われます。`,
	`スマナサーラ長老の活動によって、その伝統が現代日本に根づいたことの意義は、はかり知れません。`,
	`西洋列強による植民地支配と近代化を経て、欧米や日本でもパーリ経典の学術的な研究が進み、20世紀後半以降、テーラワーダ仏教は世界各地に広がりました。その広がり方には、しばしば大きく二つの型があると指摘されています。`,
	`ひとつは、スリランカやタイ、ミャンマーなどから移住した人々が、自国の宗教文化をそのまま海外に持ち込む「ディアスポラ型」の寺院形成です。`,
	`もうひとつは、1970年代から80年代にかけて、ヴィパッサナー瞑想を中心に、在家の人々が実践する瞑想として世界各地に広がった近代仏教の潮流で、しばしば「近代瞑想運動型」と呼ばれます。マハーシ・セヤドー系のヴィパッサナーや、S. N. ゴエンカによるヴィパッサナー、欧米で展開したインサイト・メディテーション運動、さらに医療や心理学の領域にも広がったマインドフルネスなどが、その代表例として知られています。`,
	`スマナサーラ長老の来日は、このような時代の流れの中に位置づけられます。`,
	`しかし、スマナサーラ長老の活動は、このどちらにも単純には当てはまりません。長老は瞑想実践を重視しながらも、瞑想だけを切り離して教えるのではなく、出家サンガ、パーリ経典、在家の実践生活を一体のものとして日本語で提示してきました。`,
	`したがってスマナサーラ長老は、「テーラワーダ仏教の教えを日本社会に本格的に制度移植（institutional transplantation）した教育者」と位置づけることができます。長老は、法話や瞑想指導にとどまらず、出家僧団、在家の実践文化、書籍、瞑想会、都市拠点などを含む仏教の実践環境を、日本語圏に築いてきたのです。`,
	`スマナサーラ長老は1945年に、スリランカのアルボムッレパーラ（西部州カルタラ県バンダラガマ行政区アルボムッレ地区）に生まれました。13歳で沙弥として出家し、20歳で具足戒を受けて比丘となりました。スリランカの国立ケラニア大学で仏教哲学を学び、同大学で教鞭をとりました。1980年に国費留学生として来日し、大阪外国語大学語学コースで半年にわたり日本語を学びました。その後、駒澤大学大学院人文科学研究科仏教学専攻博士後期課程に進学し、日本仏教思想、とくに道元の思想を研究しました。指導教授は、日本仏教学界の代表的研究者であり、後に駒澤大学学長を務めた奈良康明氏でした。`,
	`スマナサーラ長老は、ブッダの根本の教えを、苦しみの原因を理解し、人生をより自由に生きるための「心の科学」として伝えてきました。論理的で明晰な語り口で、ときに毒舌を織り交ぜた巧みな説法は、パーリ経典の教えを現代人が生活の中で実践できる形で示すものです。その活動は宗教の枠を超え、きわめて幅広い層に受け入れられています。`,
	`スマナサーラ長老が日本に紹介してきた瞑想実践は、後に日本で広く知られるようになったマインドフルネスやアンガーマネジメントとも関連しています。とりわけヴィパッサナー瞑想（四念処の修習、気づきの瞑想）や慈悲の瞑想（四無量心の修習、メッタ瞑想）を早くから紹介してきたことは、日本社会に仏教実践を広げる一助となりました。`,
	`スマナサーラ長老は、ベストセラーとなった『怒らないこと』（サンガ、2006年）など、300冊を超える仏教書を執筆・監修しています（布施本を含む）。初期仏教の教えを平明な日本語で説いたその著作は広く読まれ、英語、中国語（繁体字）、韓国語にも翻訳されています。`,
	`2018年には日本テーラワーダ仏教協会のYouTubeチャンネルが開設されました。コロナ禍を契機に動画での法話発信が本格化し、2026年3月時点で、2000本以上の法話動画が公開されています。チャンネル登録者数は5万5000人を超えています。`,
	`スマナサーラ長老が80歳を迎えた2025年末に公開された「初期仏教塾」は、長老の膨大な法話をWeb上に集め、ブッダの教えを現代の言葉で学びやすく伝える取り組みです。`,
	`こうした活動を通じて、スマナサーラ長老は現代日本において初期仏教の理解と実践を広く促してきました。その歩みは、近代以降の日本において、仏教を思想や文化としてではなく「実践の道」として提示し直すものです。日本仏教史の文脈においても重要な意味をもつ長老の活動は、「日本における第二の仏教伝来」とも評されています。`,
];

const profileNotes = [
	"※本ページは、公開資料・著作・講演記録等をもとに、日本テーラワーダ仏教協会が編集しました。",
	"（2026年3月現在）",
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

						<div className="flex flex-col gap-10 lg:flex-row-reverse lg:items-start lg:justify-between lg:gap-16">
							<div className="mx-auto flex w-full max-w-[430px] items-end justify-center gap-4 lg:mx-0 lg:flex-[0_0_40%] lg:justify-end">
								<div className="font-serif-display about-profile-vertical text-xl leading-none text-[#9d7e4c] lg:text-[28px]">
									Ven. Alubomulle Sumanasara
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
								<p className="font-serif-display mb-7 text-lg text-[#9d7e4c]">
									Ven. Alubomulle Sumanasara
								</p>
								<div className="space-y-6 text-[15px] leading-[2] text-[#303030] md:text-base">
									{profileParagraphs.map((paragraph) => (
										<p key={paragraph}>{paragraph}</p>
									))}
								</div>
								<div className="mt-8 space-y-2 border-t border-[#d6c6ad] pt-6 text-sm leading-relaxed text-[#6d6a64]">
									{profileNotes.map((note) => (
										<p key={note}>{note}</p>
									))}
								</div>
							</div>
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
