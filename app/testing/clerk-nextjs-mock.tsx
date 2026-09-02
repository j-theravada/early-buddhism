import type { ReactNode } from "react";

const UserButton = Object.assign(
	({ children }: { children?: ReactNode }) => (
		<div data-user-button>{children}</div>
	),
	{
		Link: ({ href, label }: { href: string; label: string }) => (
			<a data-user-button-link href={href}>
				{label}
			</a>
		),
		MenuItems: ({ children }: { children?: ReactNode }) => <>{children}</>,
	},
);

export const clerkNextjsMock = {
	Show: ({ children }: { children: ReactNode }) => children,
	UserButton,
	useAuth: () => ({ isSignedIn: true }),
	useUser: () => ({ user: null }),
};
