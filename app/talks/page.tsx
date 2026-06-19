import type { Metadata } from "next";
import { buildTalkGalleryTalks } from "../application/talk/gallery";
import ClientHomeActions from "../components/client-home-actions";
import Footer from "../components/footer";
import Header from "../components/header";
import TalkGallery from "../components/talk-gallery";
import { SUMANASARA_JA_NAME } from "../domain/teacher/sumanasara";
import type { TalkForDisplay } from "../domain/talk/types";
import { getTalks } from "../infrastructure/talk/repository";

export const metadata: Metadata = {
	title: "動画一覧",
	description: `${SUMANASARA_JA_NAME}の法話動画を一覧で探せます。`,
};

export default async function TalksPage() {
	const talks = await getTalks();
	const talksForDisplay: TalkForDisplay[] = buildTalkGalleryTalks(talks);

	return (
		<div className="min-h-screen flex flex-col bg-white text-[#303030]">
			<div className="flex-1">
				<Header />
				<main>
					<section
						className="home-gallery-bg min-h-screen px-5 pb-16 pt-28 sm:px-8 lg:pb-24 lg:pt-36"
						id="talks"
					>
						<div className="mx-auto max-w-7xl">
							<div className="mb-10 text-center">
								<h1 className="home-section-title font-display inline-block text-[28px] font-semibold leading-tight text-[#303030]">
									動画一覧
								</h1>
							</div>
							<TalkGallery talks={talksForDisplay} />
						</div>
					</section>
				</main>
			</div>

			<ClientHomeActions />
			<Footer />
		</div>
	);
}
