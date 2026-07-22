import { getBindings } from "../../../../../db/runtime";
import { safeReturnTo, sessionCookie } from "../../../../auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const username = String(form.get("username") || "");
  const password = String(form.get("password") || "");
  const returnTo = safeReturnTo(String(form.get("returnTo") || "/admin"), "/admin");
  const bindings = getBindings();
  const expectedUsername = bindings.ADMIN_USERNAME;
  const expectedPassword = bindings.ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return Response.redirect(new URL(`/login?mode=admin&error=unconfigured&returnTo=${encodeURIComponent(returnTo)}`, request.url), 303);
  }

  if (username !== expectedUsername || password !== expectedPassword) {
    return Response.redirect(new URL(`/login?mode=admin&error=invalid&returnTo=${encodeURIComponent(returnTo)}`, request.url), 303);
  }

  return new Response(null, {
    status: 303,
    headers: { Location: returnTo, "Set-Cookie": await sessionCookie({ role: "admin", sub: username, name: "VHB 主理人" }) },
  });
}
