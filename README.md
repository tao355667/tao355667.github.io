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

## 图标来源

- ORCID：[官方 iD 图标](https://orcid.org/assets/vectors/orcid.logo.icon.svg)，保留原色和图形。
- CSDN：[官网 favicon](https://g.csdnimg.cn/static/logo/favicon32.ico)。
- 知乎、掘金：[Simple Icons](https://github.com/simple-icons/simple-icons)，CC0-1.0；SVG 路径内联于 `index.html`。

所有图标均随站点保存，不依赖外部图标服务。
