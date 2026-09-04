import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { currentUserIsSubtitleAdmin } from "../infrastructure/auth/server";

export default async function SubtitleAdminLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const { isAuthenticated } = await auth();
	if (!isAuthenticated) {
		redirect("/login?redirect_url=/subtitle-admin");
	}
	if (!(await currentUserIsSubtitleAdmin())) {
		notFound();
	}

	return children;
}
