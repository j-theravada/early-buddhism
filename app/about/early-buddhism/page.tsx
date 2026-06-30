import type { Metadata } from "next";
import AboutPageLayout, {
	AboutTextSection,
} from "../../components/about-page-layout";
import { buildCanonicalUrl } from "../../utils/seo";

export const metadata: Metadata = {
	title: "初期仏教はお釈迦さまの教え",
	description:
		"初期仏教とは釈尊ご自身の教えを指します。テーラワーダ仏教とアビダンマの役割を紹介します。",
	alternates: {
		canonical: buildCanonicalUrl("/about/early-buddhism"),
	},
};

export default function EarlyBuddhismPage() {
	return (
		<AboutPageLayout title="初期仏教とは">
			<AboutTextSection title="お釈迦さまご自身の教え">
				<p>
					初期仏教とは釈尊（釈迦牟尼仏陀、ブッダ）ご自身の教えを指します。釈尊の教えは、釈尊から弟子、そして後代へと途切れることなく継承されてきました。ただし、説く人の資質によって説法の色合いは異なります。たとえば、ウパーリ尊者は戒律を中心に説き、アーナンダ尊者は在家向けに語り、サーリプッタ尊者は哲学的・理論的に説きました。表現や比喩は時代や聴衆に合わせて変わることがあっても、核となる内容は「純粋な仏説」であると考えられています。
				</p>
			</AboutTextSection>

			<AboutTextSection title="テーラワーダ仏教の立場">
				<p>
					ではテーラワーダ仏教（上座仏教、上座部仏教）とは何でしょうか。仏陀の弟子たちがそれぞれ好みの解釈を行った結果、思想的な隔たりが生まれました。そして自分の考えこそ正しいと強調する流れの中で、仏教の中に「宗派」が現れたとされます。その中でテーラワーダは、主観的な解釈に反対し、仏陀の教えをそのまま、解釈抜きで守るべきだと強調した人々の系譜だと説明されます。そのため「保守派」というあだ名で呼ばれることもあります。したがって、「初期仏教＝テーラワーダ」というよりも、「テーラワーダはブッダの教えの直接的な流れだ」と言ったほうが適切かもしれません。
				</p>
				<p>
					この保守派のテーラワーダが、仏説を純粋に守り、主観的な解釈を抑えるために頼りにしたのが、アビダンマ（アビダルマ）の思想です。
				</p>
			</AboutTextSection>

			<AboutTextSection title="アビダンマの役割">
				<p>
					アビダンマとは、初期仏教の教えを学問的に分類・整理・分析し、体系化したテキスト群です。教えを体系化することで、言葉を現代的に解釈する過程で内容が変質してしまう危険を減らし、教えを純粋に伝える働きを担います。テーラワーダは、宗派分裂の中で主観的解釈を退け、「仏説をそのまま守る」立場を取ります。その純粋保持の拠り所としてアビダンマを重視しています。つまりアビダンマは、テーラワーダが釈尊の教えを守るための「鎧」として機能しているのです。
				</p>
			</AboutTextSection>
		</AboutPageLayout>
	);
}
