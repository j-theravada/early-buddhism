import { getPopularVideos } from "./application/analytics/popular-videos";
import { buildTalkGalleryTalks } from "./application/talk/gallery";
import ClientHomeActions from "./components/client-home-actions";
import Footer from "./components/footer";
import ForBeginnersSection from "./components/for-beginners-section";
import Header from "./components/header";
import HomeHero from "./components/home-hero";
import HomeScrollReveal from "./components/home-scroll-reveal";
import {
	NewsSection,
	PopularVideosSection,
	RecommendationsSection,
	TalkSearchSection,
	TeacherProfileSection,
} from "./components/home-sections";
import { getNewsItems } from "./infrastructure/news/repository";
import { getTalks } from "./infrastructure/talk/repository";

export default async function Home() {
	const [talks, newsItems] = await Promise.all([getTalks(), getNewsItems()]);
	const popularVideos = getPopularVideos(buildTalkGalleryTalks(talks));

	return (
		<div className="min-h-screen flex flex-col bg-white text-[#303030]">
			<div className="flex-1">
				<Header />
				<HomeScrollReveal />
				<main>
					<HomeHero />
					<ForBeginnersSection />
					<RecommendationsSection />
					<TeacherProfileSection />
					<NewsSection items={newsItems} />
					<PopularVideosSection videos={popularVideos} />
					<TalkSearchSection />
				</main>
			</div>

			<ClientHomeActions />
			<Footer />
		</div>
	);
}
