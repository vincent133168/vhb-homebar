/* eslint-disable @next/next/no-html-link-for-pages */
import { sessionFromHeaders, safeReturnTo } from "../auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const session = await sessionFromHeaders();
  const returnTo = safeReturnTo(typeof params.returnTo === "string" ? params.returnTo : "/admin", "/admin");
  const adminMode = params.mode === "admin";
  const invalid = params.error === "invalid";
  const adminUnconfigured = params.error === "unconfigured";
  const wechat = typeof params.wechat === "string" ? params.wechat : "";

  return <main className="login-page">
    <section className="login-brand">
      <a href="/" className="login-logo"><img src="/vhb-logo.png" alt="VHB Vincent's Homebar"/></a>
      <div><span className="eyebrow">VINCENT’S HOMEBAR</span><h1>今晚，回到<br/>我们的深夜客厅。</h1><p>顾客从这里进入今日酒单；主理人从独立入口管理材料、酒单与订单。</p></div>
      <small>仅面向 18 岁以上成年人 · 理性饮酒 · 喝酒不开车</small>
    </section>
    <section className="login-panel">
      <div className="login-card">
        <span className="login-step">WELCOME TO VHB</span>
        <h2>{adminMode ? "主理人登录" : "进入今晚酒单"}</h2>
        <p>{adminMode ? "登录后可发布今日酒单、处理订单和修改价格。" : "微信绑定后，下次回来可以更快找到自己的点单。"}</p>
        {session ? <div className="signed-in"><span>✓</span><div><b>已登录为 {session.name}</b><small>{session.role === "admin" ? "主理人账号" : "微信账号"}</small></div><a href={session.role === "admin" ? "/admin" : "/"}>继续进入</a></div> : adminMode ? <form className="admin-login-form" method="post" action="/api/auth/admin/login">
          <input type="hidden" name="returnTo" value={returnTo}/>
          <label>管理员账号<input name="username" autoComplete="username" placeholder="请输入管理员账号" required/></label>
          <label>管理员密码<input name="password" type="password" autoComplete="current-password" placeholder="请输入管理员密码" required/></label>
          {invalid && <p className="login-error">账号或密码不正确，请重新输入。</p>}
          {adminUnconfigured && <p className="login-error">请先配置管理员账号、密码和登录密钥。</p>}
          <button type="submit">进入后台 <span>→</span></button>
          <a className="switch-login" href="/login">返回顾客登录</a>
        </form> : <>
          <a className="wechat-login" href="/api/auth/wechat/start?returnTo=/"><span className="wechat-icon">微信</span><b>微信一键登录</b><i>→</i></a>
          {wechat === "unconfigured" && <div className="wechat-note"><b>微信登录待配置</b><span>网站入口已经准备好，接入微信开放平台 AppID 与 AppSecret 后即可正式使用。</span></div>}
          {wechat && wechat !== "unconfigured" && <div className="wechat-note error"><b>微信登录未完成</b><span>请稍后重试，或先进入今日酒单。</span></div>}
          <div className="login-divider"><span>或</span></div>
          <a className="guest-login" href="/">先进入今日酒单</a>
          <a className="admin-entry" href="/login?mode=admin&returnTo=/admin">我是主理人，进入后台</a>
        </>}
      </div>
    </section>
  </main>;
}
