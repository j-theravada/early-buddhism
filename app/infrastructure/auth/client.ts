"use client";

import { useAuth } from "@clerk/nextjs";

export function useIsSignedIn(): boolean {
	return useAuth().isSignedIn === true;
}
