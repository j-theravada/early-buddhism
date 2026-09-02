import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import SimplePageLayout from "../../components/simple-page-layout";

export const metadata: Metadata = {
	title: "ログイン",
	robots: { follow: false, index: false },
};

export default function LoginPage() {
	return (
		<SimplePageLayout title="ログイン">
			<div className="flex justify-center">
				<SignIn fallbackRedirectUrl="/account" path="/login" routing="path" />
			</div>
		</SimplePageLayout>
	);
}
