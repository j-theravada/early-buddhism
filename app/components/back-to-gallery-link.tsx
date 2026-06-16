"use client";

import Link from "next/link";

type Props = {
	className?: string;
	children: React.ReactNode;
	href?: string;
};

export default function BackToGalleryLink({
	className,
	children,
	href = "/talks",
}: Props) {
	return (
		<Link className={className} href={href}>
			{children}
		</Link>
	);
}
