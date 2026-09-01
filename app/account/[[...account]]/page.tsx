import { UserProfile } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SimplePageLayout from "../../components/simple-page-layout";

export const metadata: Metadata = {
	title: "アカウント",
	robots: { follow: false, index: false },
};

export default async function AccountPage() {
	const { isAuthenticated } = await auth();
	if (!isAuthenticated) {
		redirect("/login?redirect_url=/account");
	}

	return (
		<SimplePageLayout title="アカウント">
			<div className="flex justify-center">
				<UserProfile path="/account" routing="path" />
			</div>
		</SimplePageLayout>
	);
}
