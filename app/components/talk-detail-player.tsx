import { type ReactNode } from "react";
import LiteYouTubeEmbed from "./lite-youtube-embed";

type Props = {
	children: ReactNode;
	embedUrl?: string | null;
	talkId: string;
	thumbnailUrl?: string | null;
	title: string;
};

export default function TalkDetailPlayer({
	children,
	embedUrl,
	talkId,
	thumbnailUrl,
	title,
}: Props) {
	return (
		<div className="talk-detail-layout space-y-8">
			{embedUrl && (
				<div className="sticky top-0 z-20 -mx-6 bg-white/95 px-6 py-3 backdrop-blur sm:-mx-8 sm:px-8">
					<div className="talk-detail-player-shell relative mx-auto">
						<div className="talk-detail-player-frame mx-auto">
							<div className="talk-detail-player-media">
								<LiteYouTubeEmbed
									embedUrl={embedUrl}
									talkId={talkId}
									thumbnailUrl={thumbnailUrl}
									title={title}
								/>
							</div>
						</div>
					</div>
				</div>
			)}

			{children}
		</div>
	);
}
