import { currentUser } from "@clerk/nextjs/server";
import { hasSubtitleAdminRole } from "../../application/auth/subtitle-admin";

export async function currentUserIsSubtitleAdmin(): Promise<boolean> {
	const user = await currentUser();
	return hasSubtitleAdminRole(user?.privateMetadata);
}
