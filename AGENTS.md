# 仓库指南（Repository Guidelines）

## 项目结构与模块组织

- `miniprogram/`：小程序前端。
  - `app.{js,json,wxss}`：入口与全局配置/样式。
  - `pages/<模块>/index.{js,wxml,wxss,json}`：页面模块（home/diet/exercise/plan/stats/...）。
  - `utils/`：工具与服务；所有云函数调用统一走 `utils/cloudApi.js`。
  - `components/`、`images/`：组件与资源。
- `cloudfunctions/`：云函数（Node.js）。
  - `healthService`、`dietService`、`qwenAI`、`foodRecognitionQwen`：每个函数包含 `index.js`、`package.json`、`config.json`。
- 文档：`README.md`、`接口整合文档.md`、`数据库初始化指南.md`。

## 构建、测试与开发命令

- 安装依赖（如需）：`npm ci`
- 小程序运行：用微信开发者工具打开项目并点击“编译”。
- 部署云函数（必做）：在开发者工具中右键 `cloudfunctions/*` → “上传并部署：云端安装依赖”。
- 初始化内置食物数据（开发者工具 Console）：
  - `wx.cloud.callFunction({ name: 'dietService', data: { action: 'initBuiltinFoods' } })`
- 说明：根目录 `package.json` 的 `npm start` 指向 `server.js`；若当前仓库未包含该文件，请不要依赖此命令。

## 代码风格与命名约定

- JavaScript（ES6+），保持现有风格：2 空格缩进、保留分号、沿用现有 JSDoc 注释习惯。
- 页面文件按微信规范成组维护：`pages/<模块>/index.*`（`.js/.wxml/.wxss/.json` 同名）。
- 云函数按 `action` 分发（如 `event.action`）；新增 `action` 需兼容旧调用，并保持统一返回结构：`{ success, data }` / `{ success: false, error, code }`。
- 前端页面禁止直接 `wx.cloud.callFunction`，必须通过 `miniprogram/utils/cloudApi.js` 封装调用。

## 测试指南

- 当前未配置自动化测试；请用微信开发者工具做人工回归：
  - 饮食记录、运动记录、计划生成、AI 建议等核心流程。
  - 部署后查看云函数日志，重点关注报错与超时。

## 提交与 PR 规范

- 提交信息以简短摘要为主（仓库历史多为中文），也可使用 `feat(scope): ...` / `test: ...` 等格式。
- PR 需包含：改动目的与范围、涉及页面路径（如 `miniprogram/pages/...`）、UI 变更截图/GIF、以及云开发环境变量/配置的变更说明。

## 安全与配置

- 禁止提交任何 API Key/密钥；在云开发环境变量中配置 `DASHSCOPE_API_KEY`（或 `QWEN_API_KEY`）。
- 不要提交本地/私有配置文件（如 `project.private.config.json`），参考 `.gitignore`。

## Agent 工作约定

- 默认使用中文沟通（除非任务明确要求英文输出）。
- 每次开始工作前先阅读本文件 `AGENTS.md`，再进行修改/实现，确保遵守本仓库约定。
