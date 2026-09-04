"use client";

import { Show, UserButton, useUser } from "@clerk/nextjs";
import { History } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSubtitleAdminAccess } from "../infrastructure/auth/client";

type Props = {
	variant: "desktop" | "mobile";
};

export default function AuthNav({ variant }: Props) {
	const { user } = useUser();
	const userId = user?.id;
	const [subtitleAdminUserId, setSubtitleAdminUserId] = useState<string | null>(
		null,
	);
	const isSubtitleAdmin = subtitleAdminUserId === userId;

	useEffect(() => {
		if (!userId) {
			return;
		}

		const controller = new AbortController();
		void getSubtitleAdminAccess(controller.signal)
			.then((hasAccess) => {
				if (!controller.signal.aborted) {
					setSubtitleAdminUserId(hasAccess ? userId : null);
				}
				return undefined;
			})
			.catch(() => {});

		return () => controller.abort();
	}, [userId]);
	const className =
		variant === "desktop"
			? "font-display text-[15px] font-semibold text-[#303030] transition-colors hover:text-[#9d7e4c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9d7e4c]/50"
			: "font-display text-base font-semibold text-white transition-colors hover:text-[#fffbeb]";

	return (
		<>
			<Show when="signed-out">
				<Link className={className} href="/login">
					ログイン
				</Link>
				<Link className={className} href="/sign-up">
					新規登録
				</Link>
			</Show>
			<Show when="signed-in">
				<span className="flex items-center gap-3">
					{isSubtitleAdmin ? (
						<Link className={className} href="/subtitle-admin">
							字幕管理
						</Link>
					) : null}
					<UserButton userProfileMode="navigation" userProfileUrl="/account">
						<UserButton.MenuItems>
							<UserButton.Link
								href="/history"
								label="視聴履歴"
								labelIcon={<History aria-hidden className="size-4" />}
							/>
						</UserButton.MenuItems>
					</UserButton>
				</span>
			</Show>
		</>
	);
}
