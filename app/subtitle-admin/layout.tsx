import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { hasSubtitleAdminRole } from "../application/auth/subtitle-admin";

export default async function SubtitleAdminLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const { isAuthenticated } = await auth();
	if (!isAuthenticated) {
		redirect("/login?redirect_url=/subtitle-admin");
	}
	const user = await currentUser();
	if (!hasSubtitleAdminRole(user?.publicMetadata)) {
		notFound();
	}

	return children;
}
