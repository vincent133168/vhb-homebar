import { sessionFromHeaders, sessionFromRequest } from "./auth";

export async function getAdminSession() {
  const session = await sessionFromHeaders();
  return session?.role === "admin" ? session : null;
}

export async function getAdminSessionFromRequest(request: Request) {
  const session = await sessionFromRequest(request);
  return session?.role === "admin" ? session : null;
}
