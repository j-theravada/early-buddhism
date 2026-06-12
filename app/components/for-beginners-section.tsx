import { ChevronDown, ExternalLink } from "lucide-react";
import { THERAVADA_ASSOCIATION_URL } from "../utils/site-links";

const BEGINNER_GUIDE_PARAGRAPHS = [
	"「仏教」と聞くと「宗教でしょ？」と感じる方もいらっしゃるかもしれません。しかし、2500年以上前にお釈迦様が説かれた教えは、「自分で確かめる」「権威ある人から言われたことでも盲信しない」という、いわゆる宗教とはほど遠い、理性的で現代的な教えです。",
	"お釈迦様の教えの目的は「苦しみをなくす」こと。人間の苦しみの根本的な原因は今も昔も変わりません。そのため、この教えに触れた方は「なんと現代的な教えだろう」という感想を持たれます。",
	"一般的な宗教では「信じる者は救われる」という立場ですが、初期仏教では、あなた自身の「智慧」や「優しさ」をレベルアップさせて、苦しみを乗り越えることを目指します。ストレスだらけの現代社会を生きる私たちにとって、今日からでも実践できる教えがここにあります。",
	"この「初期仏教塾」では、そうした初期仏教の法話や講演を横断的に閲覧できます。それが本当かどうかは、ぜひ音声を聴いていただき、あなたご自身の心で確かめてみてください。",
];

export default function ForBeginnersSection() {
	return (
		<section className="bg-amber-50">
			<details className="group">
				<summary
					aria-label="初めての方向け説明を開閉"
					className="cursor-pointer list-none [&::-webkit-details-marker]:hidden"
				>
					<div className="mx-auto max-w-7xl px-6 py-3 sm:px-8">
						<div className="flex flex-col items-center gap-4">
							<a
								className="inline-flex items-center gap-1 text-xs whitespace-nowrap text-amber-900 underline transition hover:text-amber-700"
								href={THERAVADA_ASSOCIATION_URL}
								rel="noopener noreferrer"
								target="_blank"
							>
								日本テーラワーダ仏教協会
								<ExternalLink className="h-3 w-3" />
							</a>
							<div className="flex items-center justify-center gap-2 text-center">
								<h2 className="text-amber-900">初めての方へ</h2>
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-700">
									<ChevronDown className="h-4 w-4 text-amber-50 transition-transform group-open:rotate-180" />
								</div>
							</div>
						</div>
					</div>
				</summary>

				<div className="bg-amber-50 py-10 text-sm leading-relaxed text-amber-900 sm:text-base">
					<div className="mx-auto max-w-7xl px-12 sm:px-16">
						<div className="space-y-6">
							{BEGINNER_GUIDE_PARAGRAPHS.map((paragraph) => (
								<p key={paragraph}>{paragraph}</p>
							))}
						</div>
					</div>
				</div>
			</details>
		</section>
	);
}
