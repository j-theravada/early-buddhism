import { buildTalkGalleryTalks } from "./application/talk/gallery";
import ClientHomeActions from "./components/client-home-actions";
import DeferredTalkGallery from "./components/deferred-talk-gallery";
import Footer from "./components/footer";
import ForBeginnersSection from "./components/for-beginners-section";
import Header from "./components/header";
import HomeHero from "./components/home-hero";
import {
	GalleryIntroSection,
	NewsSection,
	PopularVideosSection,
	RecommendationsSection,
	TeacherProfileSection,
} from "./components/home-sections";
import type { TalkForDisplay } from "./domain/talk/types";
import { getTalks } from "./infrastructure/talk/repository";

export default async function Home() {
	const talks = await getTalks();
	const talksForDisplay: TalkForDisplay[] = buildTalkGalleryTalks(talks);

	return (
		<div className="min-h-screen flex flex-col bg-white text-[#303030]">
			<div className="flex-1">
				<Header />
				<main>
					<HomeHero />
					<ForBeginnersSection />
					<RecommendationsSection />
					<TeacherProfileSection />
					<NewsSection />
					<PopularVideosSection />
					<GalleryIntroSection>
						<DeferredTalkGallery talks={talksForDisplay} />
					</GalleryIntroSection>
				</main>
			</div>

			<ClientHomeActions />
			<Footer />
		</div>
	);
}
