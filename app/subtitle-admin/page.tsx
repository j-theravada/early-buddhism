import type { Metadata } from "next";
import Link from "next/link";
import SimplePageLayout from "../components/simple-page-layout";

export const metadata: Metadata = {
	title: "字幕管理",
	robots: { follow: false, index: false },
};

export default function SubtitleAdminPage() {
	return (
		<SimplePageLayout title="字幕管理">
			<section className="rounded-sm border border-[#d6c6ad] bg-[#fffcf7] p-6 sm:p-8">
				<h2 className="text-lg font-semibold text-[#303030]">
					字幕管理者アクセス
				</h2>
				<p className="mt-3 text-sm leading-relaxed text-[#666]">
					このアカウントは字幕管理者として認証されています。
				</p>
				<div className="mt-6">
					<Link
						className="text-sm font-semibold text-[#8a6a38] underline transition hover:text-[#6f552d]"
						href="/account"
					>
						アカウントとセキュリティ設定
					</Link>
				</div>
			</section>
		</SimplePageLayout>
	);
}
