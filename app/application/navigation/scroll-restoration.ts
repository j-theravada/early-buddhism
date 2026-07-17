type Params = {
	pathname: string;
	previousPathname: string | null;
};

export function shouldResetScrollOnRouteChange({
	pathname,
	previousPathname,
}: Params): boolean {
	return previousPathname !== null && pathname !== previousPathname;
}
