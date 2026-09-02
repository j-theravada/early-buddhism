import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";
import SimplePageLayout from "../../components/simple-page-layout";

export const metadata: Metadata = {
	title: "アカウント作成",
	robots: { follow: false, index: false },
};

export default function SignUpPage() {
	return (
		<SimplePageLayout title="アカウント作成">
			<div className="flex justify-center">
				<SignUp fallbackRedirectUrl="/account" path="/sign-up" routing="path" />
			</div>
		</SimplePageLayout>
	);
}
