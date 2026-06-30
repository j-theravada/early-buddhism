export const SITE_NAME = "初期仏教塾";
export const SITE_URL = "https://early-buddhism.j-theravada.com";

export function buildCanonicalUrl(pathname = "/"): string {
	const normalizedPathname = pathname.startsWith("/")
		? pathname
		: `/${pathname}`;

	if (normalizedPathname === "/") {
		return SITE_URL;
	}

	return `${SITE_URL}${normalizedPathname}`;
}
