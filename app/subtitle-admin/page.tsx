import type { Metadata } from "next";
import Link from "next/link";
import { buildTalkDetailPageData } from "../application/talk/detail";
import { buildTranscriptCueHref } from "../application/talk/links";
import { buildCueTimeHref } from "../application/transcript/presentation";
import SimplePageLayout from "../components/simple-page-layout";
import { getTalkById } from "../infrastructure/talk/repository";
import { getTranscriptChangeRequestRepository } from "../infrastructure/transcript/change-request-repository";
import SubtitleAdminChangeRequestList, {
	type SubtitleAdminChangeRequestItem,
} from "./change-request-list";

export const metadata: Metadata = {
	title: "字幕管理",
	robots: { follow: false, index: false },
};

function formatSrtTime(seconds: number): string {
	const totalSeconds = Math.max(0, Math.floor(seconds));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const remainder = totalSeconds % 60;
	return [hours, minutes, remainder]
		.map((value) => value.toString().padStart(2, "0"))
		.join(":");
}

export default async function SubtitleAdminPage() {
	const pending = await getTranscriptChangeRequestRepository().listPending();
	const requests: SubtitleAdminChangeRequestItem[] = await Promise.all(
		pending.map(async (request) => {
			const talk = await getTalkById(request.talkId);
			const detail = talk ? buildTalkDetailPageData(talk) : null;
			const startSeconds = Math.max(0, Math.floor(request.cueStart));
			return {
				id: request.id,
				talkId: request.talkId,
				talkTitle: detail?.talk.title || request.talkId,
				talkHref: buildTranscriptCueHref(request.talkId, request.cueIndex),
				cueIndex: request.cueIndex,
				startLabel: formatSrtTime(startSeconds),
				embedUrl: detail?.talk.embedUrl ?? null,
				thumbnailUrl: detail?.talk.thumbnailUrl ?? null,
				playbackUrl: buildCueTimeHref(detail?.embedUrlPrefix, startSeconds),
				baseText: request.baseText,
				proposedText: request.proposedText,
				reason: request.reason,
				submitterUserId: request.submitterUserId,
				createdAt: request.createdAt,
			};
		}),
	);

	return (
		<SimplePageLayout title="字幕管理">
			<div className="mb-6 flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 className="text-lg font-semibold text-[#303030]">審査待ち</h2>
					<p className="mt-1 text-sm leading-relaxed text-[#666]">
						承認するとDrive上の字幕を直接更新し、公開用データの再生成を開始します。
					</p>
				</div>
				<div>
					<Link
						className="text-sm font-semibold text-[#8a6a38] underline transition hover:text-[#6f552d]"
						href="/account"
					>
						アカウントとセキュリティ設定
					</Link>
				</div>
			</div>
			<SubtitleAdminChangeRequestList initialRequests={requests} />
		</SimplePageLayout>
	);
}
