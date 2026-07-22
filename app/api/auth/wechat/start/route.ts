import { getBindings } from "../../../../../db/runtime";
import { oauthStateCookie, safeReturnTo } from "../../../../auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"), "/");
  const { WECHAT_APP_ID, WECHAT_APP_SECRET, WECHAT_REDIRECT_URI } = getBindings();
  if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) {
    return Response.redirect(new URL("/login?wechat=unconfigured", request.url), 303);
  }

  const state = crypto.randomUUID().replaceAll("-", "");
  const callback = WECHAT_REDIRECT_URI || new URL("/api/auth/wechat/callback", request.url).toString();
  const authorize = new URL("https://open.weixin.qq.com/connect/qrconnect");
  authorize.searchParams.set("appid", WECHAT_APP_ID);
  authorize.searchParams.set("redirect_uri", callback);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "snsapi_login");
  authorize.searchParams.set("state", state);
  return new Response(null, {
    status: 302,
    headers: { Location: `${authorize.toString()}#wechat_redirect`, "Set-Cookie": await oauthStateCookie(state, returnTo) },
  });
}
