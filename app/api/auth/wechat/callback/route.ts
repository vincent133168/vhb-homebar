import { clearOauthStateCookie, oauthStateFromRequest, sessionCookie } from "../../../../auth";
import { ensureTables, getBindings } from "../../../../../db/runtime";

type TokenResponse = { access_token?: string; openid?: string; unionid?: string; errcode?: number; errmsg?: string };
type UserResponse = { nickname?: string; headimgurl?: string; unionid?: string; errcode?: number; errmsg?: string };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const saved = await oauthStateFromRequest(request);
  const fail = (reason: string) => new Response(null, { status: 303, headers: { Location: new URL(`/login?wechat=${reason}`, request.url).toString(), "Set-Cookie": clearOauthStateCookie() } });
  if (!code || !state || !saved || saved.exp < Date.now() || saved.state !== state) return fail("state_error");

  const { WECHAT_APP_ID, WECHAT_APP_SECRET, DB } = getBindings();
  if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) return fail("unconfigured");

  const tokenUrl = new URL("https://api.weixin.qq.com/sns/oauth2/access_token");
  tokenUrl.searchParams.set("appid", WECHAT_APP_ID);
  tokenUrl.searchParams.set("secret", WECHAT_APP_SECRET);
  tokenUrl.searchParams.set("code", code);
  tokenUrl.searchParams.set("grant_type", "authorization_code");
  const token = await fetch(tokenUrl).then((response) => response.json() as Promise<TokenResponse>);
  if (!token.access_token || !token.openid) return fail("exchange_error");

  const profileUrl = new URL("https://api.weixin.qq.com/sns/userinfo");
  profileUrl.searchParams.set("access_token", token.access_token);
  profileUrl.searchParams.set("openid", token.openid);
  profileUrl.searchParams.set("lang", "zh_CN");
  const profile = await fetch(profileUrl).then((response) => response.json() as Promise<UserResponse>);
  if (profile.errcode) return fail("profile_error");

  await ensureTables();
  const providerId = token.unionid || profile.unionid || token.openid;
  const existing = await DB.prepare("SELECT id FROM users WHERE provider_id = ?").bind(providerId).first<{ id: string }>();
  const userId = existing?.id || crypto.randomUUID();
  const now = Date.now();
  await DB.prepare(`INSERT INTO users (id,provider,provider_id,nickname,avatar_url,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?) ON CONFLICT(provider_id) DO UPDATE SET nickname=excluded.nickname,avatar_url=excluded.avatar_url,updated_at=excluded.updated_at`)
    .bind(userId, "wechat", providerId, profile.nickname || "VHB 朋友", profile.headimgurl || null, now, now).run();

  const responseHeaders = new Headers({ Location: saved.returnTo });
  responseHeaders.append("Set-Cookie", await sessionCookie({ role: "user", sub: userId, name: profile.nickname || "VHB 朋友" }));
  responseHeaders.append("Set-Cookie", clearOauthStateCookie());
  return new Response(null, { status: 303, headers: responseHeaders });
}
