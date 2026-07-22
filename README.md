# VHB Homebar

一套面向小型 Homebar、私人酒局和社群空间的全栈点单系统。顾客端专注于浏览今日酒单与点单，管理员端负责材料匹配、酒单发布、订单处理、配方管理和数据迁移。

> 仅面向达到当地法定饮酒年龄的成年人。理性饮酒，喝酒不开车。

## 功能

### 顾客端

- 浏览主理人发布的今日酒单与推荐酒款
- 查看配方故事、风味、强度和预计制作时间
- 收藏、搜索、筛选与快速再次点单
- 提交订单并实时查看制作状态
- 微信登录入口与游客点单

### 管理后台

- 维护可持续增删的材料候选库
- 根据今日材料匹配全部可调、缺 1 项及缺多项酒款
- 一键同步今日酒单和主理人推荐到顾客端
- 管理订单状态、酒款售价和配方详情
- 新增或删除配方，上传酒款图片
- 一键导出配方、设置、订单、用户和上传图片迁移包

### 内置内容

- 121 款经典鸡尾酒及国际酒吧灵感配方
- 配方材料、制作步骤、风味和来源信息
- 鸡尾酒图片与来源说明见 [`public/cocktails/attribution.json`](public/cocktails/attribution.json)

## 技术架构

- Next.js 16 + React 19
- Vinext + Cloudflare Workers
- D1：配方、材料、订单、用户与系统设置
- R2：后台上传的酒款图片
- Drizzle ORM：数据结构与迁移

## 本地运行

要求 Node.js `>=22.13.0`。

```bash
git clone https://github.com/vincent133168/vhb-homebar.git
cd vhb-homebar
npm install
cp .env.example .env
npm run dev
```

打开终端显示的本地地址即可使用。

## 必填配置

公开部署前必须在 `.env` 或托管平台的运行环境变量中设置：

```dotenv
ADMIN_USERNAME=root
ADMIN_PASSWORD=你的高强度独立密码
AUTH_SECRET=至少32位随机字符串
```

可使用以下方式生成登录密钥：

```bash
openssl rand -hex 32
```

微信登录为可选功能：

```dotenv
WECHAT_APP_ID=
WECHAT_APP_SECRET=
WECHAT_REDIRECT_URI=https://你的域名/api/auth/wechat/callback
```

不要提交 `.env`，也不要在公开仓库、截图或群聊中分享真实密钥。

## 部署

项目包含未绑定账号的 `.openai/hosting.json`，声明了 D1 与 R2 资源。使用 OpenAI Sites 发布时，新项目会在当前登录账号下生成独立的项目 ID、数据库和图片空间。

发布新站点后还需要：

1. 配置管理员账号、密码与 `AUTH_SECRET`。
2. 如需微信登录，更新微信开放平台的授权回调域名。
3. 从旧站点后台下载迁移备份，并在新环境中完成数据恢复。
4. 验证配方、图片、订单、登录与今日酒单发布流程。

## 数据与安全

- 后台及所有管理接口均要求管理员会话。
- 迁移备份包含订单和用户标识，只应保存在私人设备或加密存储中。
- 开源仓库不包含任何线上订单、用户数据、微信密钥或既有 Sites 项目绑定。
- 发现安全问题请按照 [`SECURITY.md`](SECURITY.md) 私下报告，不要在公开 Issue 中披露密钥或漏洞细节。

## 许可证与素材

源代码采用 [MIT License](LICENSE)。VHB 名称、Logo 和品牌视觉不在 MIT 授权范围内；第三方配方、排名信息和图片分别遵循其来源条款，使用前请检查 [`public/cocktails/attribution.json`](public/cocktails/attribution.json) 及相关来源页面。

## 参与贡献

欢迎提交问题和改进建议。开始贡献前请阅读 [`CONTRIBUTING.md`](CONTRIBUTING.md)。
