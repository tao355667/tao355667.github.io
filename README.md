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

线上主页每次加载时向 Worker 发送一次请求。Worker 使用 Cloudflare 提供的公网出口 IP 和城市，在 D1 中以 UTC 保存访问时间。城市无法判断时留空。接口只接收上报，查看明细需要登录 Cloudflare。记录满七天后由每小时运行的任务清理。网络或浏览器拦截上报时，访问仍可继续，两套统计的数字也可能不同。

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
