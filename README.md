# 许辰涛 · 学术主页

纯静态 HTML、CSS 和 JavaScript 个人主页，参考 [Academic Pages](https://github.com/academicpages/academicpages.github.io) 的学术内容结构。无需安装依赖或构建。

## 本地预览

在项目目录运行：

```sh
python3 -m http.server 8000
```

打开 <http://localhost:8000>。

## 内容维护

- `index.html`：个人资料、论文、教育与研究经历。
- `assets/i18n.js`：中文翻译与语言切换。首次访问默认英文，之后记住手动选择。
- 右下角悬浮按钮提供返回顶部与语言切换，主题选项仍位于顶部设置菜单。
- `assets/style.css`：系统无衬线字体、响应式布局与浅色/深色配色。
- `assets/theme.js`：主题与字号偏好。主题默认跟随系统；字号可选大、中、小，默认中，选择后自动保存。
- `assets/`：样式、交互脚本与照片。
- `.github/workflows/pages.yml`：GitHub Pages 自动部署。

## 发布

1. 将项目上传至 `tao355667/tao355667.github.io` 仓库的 `main` 分支。
2. 在仓库的 **Settings** 中打开 **Pages**，找到 **Build and deployment** 下的 **Source**，选择 **GitHub Actions**。
3. 在 **Actions** 中运行 **Deploy GitHub Pages**，或向 `main` 推送更新。

部署完成后，访问 <https://tao355667.github.io/>。工作流仅上传网站页面与 `assets/`；维护文档和本地检查文件不会发布。

部署配置参考 [GitHub Pages 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 主页访问统计

登录 Cloudflare Web Analytics 可免费查看主页的浏览量、访问次数、来源网站和访客所在国家或地区。数据从启用后的访问开始积累。[Cloudflare Web Analytics 说明](https://developers.cloudflare.com/web-analytics/about/)

1. 登录 [Cloudflare Web Analytics](https://dash.cloudflare.com/?to=/:account/web-analytics)，选择 **Add a site**，填写 `tao355667.github.io`。
2. 打开 **Manage site**，从统计代码的 `data-cf-beacon` 中复制公开的 `token` 值。
3. 打开 [GitHub 仓库的 Actions 变量设置](https://github.com/tao355667/tao355667.github.io/settings/variables/actions)，选择 **New repository variable**。名称填写 `CLOUDFLARE_WEB_ANALYTICS_TOKEN`，值填写刚复制的站点 token。
4. 运行 **Deploy GitHub Pages**。部署完成后访问一次主页，几分钟后回到 Cloudflare 查看报表。

发布流程仅在配置了站点 token 时为线上主页加入统计脚本。本地预览和 404 页面不计入统计，点击页内导航也不会增加浏览量。要停用统计，删除该仓库变量并重新部署。

### 查看 IP 和城市

登录 Cloudflare，打开 **D1 SQL Database** 中的 `homepage-traffic`。选择 **Explore Data** 并打开 `visits` 表，或在 **Console** 中运行以下查询，按北京时间查看最近 100 条记录。

```sql
SELECT datetime(visited_at, '+8 hours') AS beijing_time, ip, city
FROM visits
WHERE visited_at > datetime('now', '-7 days')
ORDER BY visited_at DESC, id DESC
LIMIT 100;
```

线上主页每次加载时向 Worker 发送一次请求。Worker 在 D1 中以 UTC 保存入库时间，并在可用时保存设备报告的打开时间、公网出口 IP、城市、省州、国家或地区、设备类型、浏览器、操作系统和外部来源域名。浏览器和操作系统仅保存大类，来源仅保存主机名。旧记录的缺失信息显示为“未记录”。公开的上报接口只写入记录，访问报表需要管理员登录。记录满七天后由每小时运行的任务清理。网络或浏览器拦截上报时，访问仍可继续，两套统计的数字也可能不同。

管理员登录后，在左侧选择 **设置**，填写当前密码和两次新密码，点击 **保存新密码**。新密码支持 6 至 128 个字符。改密后所有会话立即失效，本机保存的初始口令文件需要自行更新。

初始随机口令兼容原有 SHA-256 摘要。修改后的密码使用独立随机盐和 PBKDF2-SHA-256 派生校验值，存放在 D1 的 `cms_access` 表。会话有效期为 8 小时，退出后立即撤销。登录和当前密码校验使用按来源限次的十分钟窗口。

明细默认每页 20 条，可切换为 50 或 100 条。开始和结束时间按北京时间的入库分钟筛选，IP 与城市支持片段匹配，多个条件同时生效。概览按最近七个北京时间自然日计算，明细覆盖最近 168 小时。

已有旧数据库升级时，先检查 `PRAGMA table_info(visits)`。缺少 `context` 列时运行一次 `traffic/migrations/0001_visit_context.sql`。启用密码修改前执行 `traffic/migrations/0002_password_throttle.sql`，然后部署 Worker。新建库直接使用 `traffic/schema.sql`。

Worker 的代码、数据库绑定和定时任务位于 `traffic/`。维护时在仓库根目录运行以下命令。第一条命令可重复执行，第二条命令发布 Worker。

```sh
npx wrangler@4 d1 execute homepage-traffic --remote --config traffic/wrangler.toml --file traffic/schema.sql
npx wrangler@4 deploy --config traffic/wrangler.toml
```

## 图标来源

- ORCID：[官方 iD 图标](https://orcid.org/assets/vectors/orcid.logo.icon.svg)，保留原色和图形。
- CSDN：[官网 favicon](https://g.csdnimg.cn/static/logo/favicon32.ico)。
- 知乎、掘金：[Simple Icons](https://github.com/simple-icons/simple-icons)，CC0-1.0；SVG 路径内联于 `index.html`。

所有图标均随站点保存，不依赖外部图标服务。
