import ClientHomeActions from "./components/client-home-actions";
import Footer from "./components/footer";
import ForBeginnersSection from "./components/for-beginners-section";
import Header from "./components/header";
import HomeHero from "./components/home-hero";
import {
	NewsSection,
	PopularVideosSection,
	RecommendationsSection,
	TeacherProfileSection,
} from "./components/home-sections";

export default function Home() {
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
				</main>
			</div>

			<ClientHomeActions />
			<Footer />
		</div>
	);
}
