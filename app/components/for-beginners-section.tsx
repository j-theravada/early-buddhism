import Image from "next/image";
import { AssociationLink, HomeSectionTitle } from "./home-sections";

const BEGINNER_GUIDE_PARAGRAPHS = [
	"「仏教」と聞くと「宗教でしょ？」と感じる方もいらっしゃるかもしれません。しかし、2500年以上前にお釈迦様が説かれた教えは、「自分で確かめる」「権威ある人から言われたことでも盲信しない」という、いわゆる宗教とはほど遠い、理性的で現代的な教えです。",
	"お釈迦様の教えの目的は「苦しみをなくす」こと。人間の苦しみの根本的な原因は今も昔も変わりません。そのため、この教えに触れた方は「なんと現代的な教えだろう」という感想を持たれます。",
	"一般的な宗教では「信じる者は救われる」という立場ですが、初期仏教では、あなた自身の「智慧」や「優しさ」をレベルアップさせて、苦しみを乗り越えることを目指します。ストレスだらけの現代社会を生きる私たちにとって、今日からでも実践できる教えがここにあります。",
	"この「初期仏教塾」では、そうした初期仏教の法話や講演を横断的に閲覧できます。それが本当かどうかは、ぜひ音声を聴いていただき、あなたご自身の心で確かめてみてください。",
];

export default function ForBeginnersSection() {
	return (
		<section
			className="home-deferred-section relative overflow-hidden bg-[#fffbeb] px-5 py-16 sm:px-8 md:py-20 lg:py-28"
			id="for-beginners"
		>
			<div className="js-scroll-trigger slide-left pointer-events-none absolute left-0 top-4 w-[105px] opacity-90 sm:w-[140px] md:top-8 md:w-[220px] lg:w-[310px] xl:w-[360px]">
				<Image
					alt=""
					className="h-auto w-full"
					height={1222}
					quality={75}
					src="/khanti/top/bodaijyu_02.png"
					width={663}
				/>
			</div>
			<div className="relative z-10 mx-auto max-w-[960px]">
				<HomeSectionTitle>はじめに</HomeSectionTitle>
				<div className="js-scroll-trigger downup mx-auto max-w-[780px] space-y-6">
					<h2 className="font-serif-display text-[24px] font-semibold leading-relaxed text-[#303030] md:text-[28px]">
						初期仏教塾とは
					</h2>
					<div className="space-y-5 text-[16px] leading-[2.05] text-[#303030] md:text-[17px] md:leading-[2.15]">
						{BEGINNER_GUIDE_PARAGRAPHS.map((paragraph) => (
							<p key={paragraph}>{paragraph}</p>
						))}
					</div>
					<div>
						<AssociationLink />
					</div>
				</div>
			</div>
		</section>
	);
}
