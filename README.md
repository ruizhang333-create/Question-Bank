# AMC 8 在线题库

这是一个可部署到 GitHub Pages 的静态练习站。

功能：

- 按模块筛选
- 按年份筛选
- 学生在线做题
- 提交后立即显示正误
- 可直接分享 GitHub Pages 链接给学生和家长

## 本地主要文件

- `index.html`：前端页面
- `amc8_quiz_data.json`：题目、选项、答案数据
- `build_amc8_bank.js`：从 AoPS raw 数据生成题库数据
- `download_amc8_raw.ps1`：抓取 AoPS 原始题面和答案

## 发布到 GitHub Pages

1. 在 GitHub 新建一个空仓库
2. 本地初始化 Git 并推送
3. 在仓库 `Settings -> Pages` 中确认使用 GitHub Actions
4. 推送后等待 Actions 完成
5. 公开链接通常为：

`https://你的用户名.github.io/仓库名/`

## 说明

- 当前题库覆盖 2011-2025 的 14 套 AMC 8，AoPS 总目录未列出 2021
- 少量依赖图形的题目会保留 AoPS 原题链接，方便查看完整图形
