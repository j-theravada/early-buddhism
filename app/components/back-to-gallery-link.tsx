"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
	className?: string;
	children: React.ReactNode;
};

export default function BackToGalleryLink({ className, children }: Props) {
	const router = useRouter();

	return (
		<Link
			className={className}
			href="/talks"
			onClick={(event) => {
				if (event.defaultPrevented) return;
				if (event.button !== 0) return;
				if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
					return;

				try {
					const referrer = document.referrer;
					if (!referrer) return;
					const referrerUrl = new URL(referrer);
					if (referrerUrl.origin !== window.location.origin) return;

					event.preventDefault();
					router.back();
				} catch {
					// Fall back to normal navigation.
				}
			}}
		>
			{children}
		</Link>
	);
}
