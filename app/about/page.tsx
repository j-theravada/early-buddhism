import type { Metadata } from "next";
import AboutPageLayout, {
	AboutTextSection,
} from "../components/about-page-layout";
import { SUMANASARA_JA_NAME } from "../domain/teacher/sumanasara";
import { buildCanonicalUrl } from "../utils/seo";

export const metadata: Metadata = {
	title: "このサイトについて",
	description:
		"初期仏教塾は、宗教法人日本テーラワーダ仏教協会が運営する、アルボムッレ・スマナサーラ長老の法話デジタルアーカイブです。",
	alternates: {
		canonical: buildCanonicalUrl("/about"),
	},
};

export default function AboutPage() {
	return (
		<AboutPageLayout title="このサイトについて">
			<AboutTextSection>
				<p>
					初期仏教塾は、宗教法人日本テーラワーダ仏教協会が運営する、
					{SUMANASARA_JA_NAME}の法話デジタルアーカイブです。
				</p>
				<p>
					私たちは、仏教を「信じるための宗教」としてではなく、瞑想によって誰にでも確かめられる事実を語った実践の教えとして捉えています。とくにヴィパッサナーと呼ばれる瞑想法は、自分の心と身体を観察しながら真理を体験していくための方法です。
				</p>
				<p>
					日本では長い歴史の中で、この実践的な側面が十分に伝わらず、仏教が誤解されてきた面があります。一方で、スリランカ、タイ、ミャンマーなどの国々では、お釈迦様の教えが現在も生きた実践として受け継がれています。
				</p>
				<p>
					{`その伝統の中から日本に来られた${SUMANASARA_JA_NAME}は、卓越した日本語力で、本来の教えをわかりやすく伝えてくださっています。このサイトでは、長老の法話を通して、「仏教は本来、体験可能な真理を語る教えである」という視点を、現代の言葉で学べるようにしていきます。`}
				</p>
			</AboutTextSection>
		</AboutPageLayout>
	);
}
